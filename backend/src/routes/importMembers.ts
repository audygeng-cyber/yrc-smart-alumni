import { Router } from 'express'
import multer from 'multer'
import readXlsxFile from 'read-excel-file/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceSupabase } from '../lib/supabase.js'
import { buildPostImportSummary } from '../util/postImportSummary.js'
import { HEADER_TO_DB, mapExcelRow } from '../util/memberImportMap.js'
import { parseDirectoryView, sanitizeIlikeFragment } from '../util/memberDirectoryQuery.js'
import { normalizeWhitespace } from '../util/normalize.js'
import { MemberDistinctionCode } from '../constants/memberDistinctionCodes.js'
import type { DistinctionSpec } from '../util/memberDistinctions.js'
import {
  dedupeDistinctionSpecs,
  extractDistinctionSpecsFromImportRow,
  fetchDistinctionsByMemberIds,
  replaceMemberDistinctions,
  rollupDistinctions,
  setBatchPresidentDistinctionForBatch,
} from '../util/memberDistinctions.js'
import { rollbackFailedMemberImport } from '../util/memberImportRollback.js'
import { getPresidentRegistrySyncTargets, parsePresidentKeyEntries } from '../util/presidentKeys.js'
import { sheetRowsToObjects } from '../util/readExcelRows.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } })

const REQUIRED_THAI_HEADERS = ['รุ่น', 'ชื่อ', 'นามสกุล'] as const

const DIRECTORY_SELECT =
  'id, batch, batch_name, first_name, last_name, title, nickname, membership_status, line_uid, phone, email, member_code, student_id'

const DIRECTORY_LIMIT = 500

const OUTSTANDING_DIRECTORY_CODES = [
  MemberDistinctionCode.outstandingAlumni,
  MemberDistinctionCode.outstandingAlumniYear,
  MemberDistinctionCode.outstandingProgram,
] as const

type DirectoryMemberBase = {
  id: string
  batch: string | null
  batch_name: string | null
  first_name: string | null
  last_name: string | null
  title: string | null
  nickname: string | null
  membership_status: string | null
  line_uid: string | null
  phone: string | null
  email: string | null
  member_code: string | null
  student_id: string | null
}

async function attachCommitteeRole(
  supabase: SupabaseClient,
  rows: DirectoryMemberBase[],
): Promise<(DirectoryMemberBase & { committee_role: boolean })[]> {
  const lineUids = [...new Set(rows.map((r) => (r.line_uid ?? '').trim()).filter(Boolean))]
  if (!lineUids.length) {
    return rows.map((r) => ({ ...r, committee_role: false }))
  }

  const { data: users, error: uErr } = await supabase.from('app_users').select('id, line_uid').in('line_uid', lineUids)
  if (uErr || !users?.length) {
    return rows.map((r) => ({ ...r, committee_role: false }))
  }

  const userIds = (users as { id: string; line_uid: string }[]).map((u) => u.id)
  const { data: roles } = await supabase.from('app_user_roles').select('user_id').eq('role_code', 'committee').in('user_id', userIds)

  const committeeUserIds = new Set((roles ?? []).map((x: { user_id: string }) => x.user_id))
  const lineUidHasCommittee = new Map<string, boolean>()
  for (const u of users as { id: string; line_uid: string }[]) {
    lineUidHasCommittee.set(u.line_uid.trim(), committeeUserIds.has(u.id))
  }

  return rows.map((r) => {
    const lu = (r.line_uid ?? '').trim()
    return { ...r, committee_role: lu ? Boolean(lineUidHasCommittee.get(lu)) : false }
  })
}

async function enrichWithDistinctions(
  supabase: SupabaseClient,
  rows: (DirectoryMemberBase & { committee_role: boolean })[],
): Promise<
  (DirectoryMemberBase & { committee_role: boolean } & ReturnType<typeof rollupDistinctions>)[]
> {
  const ids = rows.map((r) => r.id)
  const distMap = await fetchDistinctionsByMemberIds(supabase, ids)
  return rows.map((r) => ({
    ...r,
    ...rollupDistinctions(distMap.get(r.id) ?? []),
  }))
}

/** member_id ที่มี distinction code นี้ (จำกัดจำนวน id ก่อนโหลด members) */
async function memberIdsByDistinctionCode(
  supabase: SupabaseClient,
  code: string,
  batchNorm: string | undefined,
): Promise<string[] | { error: string; isMemberIdsError: true }> {
  const { data: drows, error: dErr } = await supabase.from('member_distinctions').select('member_id').eq('code', code)
  if (dErr) return { error: dErr.message, isMemberIdsError: true }
  const rawIds = [...new Set((drows ?? []).map((x: { member_id: string }) => x.member_id).filter(Boolean))]
  if (!rawIds.length) return []
  if (!batchNorm) return rawIds.slice(0, DIRECTORY_LIMIT)
  const { data: mems, error: mErr } = await supabase.from('members').select('id').in('id', rawIds).eq('batch', batchNorm)
  if (mErr) return { error: mErr.message, isMemberIdsError: true }
  return ((mems ?? []) as { id: string }[]).map((m) => m.id).slice(0, DIRECTORY_LIMIT)
}

async function memberIdsAnyOutstanding(
  supabase: SupabaseClient,
  batchNorm: string | undefined,
): Promise<string[] | { error: string; isMemberIdsError: true }> {
  const { data: drows, error: dErr } = await supabase
    .from('member_distinctions')
    .select('member_id')
    .in('code', [...OUTSTANDING_DIRECTORY_CODES])
  if (dErr) return { error: dErr.message, isMemberIdsError: true }
  const rawIds = [...new Set((drows ?? []).map((x: { member_id: string }) => x.member_id).filter(Boolean))]
  if (!rawIds.length) return []
  if (!batchNorm) return rawIds.slice(0, DIRECTORY_LIMIT)
  const { data: mems, error: mErr } = await supabase.from('members').select('id').in('id', rawIds).eq('batch', batchNorm)
  if (mErr) return { error: mErr.message, isMemberIdsError: true }
  return ((mems ?? []) as { id: string }[]).map((m) => m.id).slice(0, DIRECTORY_LIMIT)
}

const ALLOWED_DISTINCTION_CODES = new Set<string>(Object.values(MemberDistinctionCode))

function parseBodyDistinctionSpecs(raw: unknown): { ok: true; specs: DistinctionSpec[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'distinctions ต้องเป็น array' }
  const specs: DistinctionSpec[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: 'แต่ละรายการ distinctions ต้องเป็น object' }
    }
    const o = item as Record<string, unknown>
    const code = typeof o.code === 'string' ? o.code.trim() : ''
    if (!code || !ALLOWED_DISTINCTION_CODES.has(code)) {
      return { ok: false, error: `code ไม่ถูกต้องหรือไม่อนุญาต: ${code || '(ว่าง)'}` }
    }
    const mk = typeof o.mark_key === 'string' ? o.mark_key : ''
    const label_th = o.label_th === null || o.label_th === undefined ? null : typeof o.label_th === 'string' ? o.label_th : String(o.label_th)
    specs.push({ code, mark_key: mk, label_th })
  }
  return { ok: true, specs: dedupeDistinctionSpecs(specs) }
}

export const importMembersRouter = Router()

type SummaryRow = {
  batch: string | null
  first_name: string | null
  last_name: string | null
  line_uid: string | null
  membership_status: string | null
}

async function fetchSummaryRows(importBatchId?: string): Promise<SummaryRow[]> {
  const supabase = getServiceSupabase()
  const pageSize = 1000
  const rows: SummaryRow[] = []

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    let query = supabase
      .from('members')
      .select('batch,first_name,last_name,line_uid,membership_status')
      .order('created_at', { ascending: true })
      .range(from, to)

    if (importBatchId) {
      query = query.eq('import_batch_id', importBatchId)
    }

    const { data, error } = await query
    if (error) throw error

    const page = (data ?? []) as SummaryRow[]
    rows.push(...page)

    if (page.length < pageSize) break
  }

  return rows
}

importMembersRouter.post('/import', upload.single('file'), async (req, res) => {
  let importBatchId: string | null = null
  try {
    if (!req.file) {
      res.status(400).json({ error: 'ไม่พบไฟล์ในฟิลด์ "file" (.xlsx)' })
      return
    }

    const sheets = await readXlsxFile(req.file.buffer)
    if (!sheets.length) {
      res.status(400).json({ error: 'ไฟล์ Excel ไม่มีชีตข้อมูล' })
      return
    }

    const { data: rawRows } = sheets[0]!
    const rows = sheetRowsToObjects(rawRows)

    if (rows.length === 0) {
      res.status(400).json({ error: 'ไม่พบแถวข้อมูลในไฟล์' })
      return
    }

    const first = rows[0]!
    const headers = Object.keys(first).map((h) => h.trim())
    for (const reqH of REQUIRED_THAI_HEADERS) {
      if (!headers.includes(reqH)) {
        res.status(400).json({
          error: `ไม่พบคอลัมน์ที่จำเป็น: "${reqH}"`,
          foundHeaders: headers,
          expectedMappingKeys: Object.keys(HEADER_TO_DB),
        })
        return
      }
    }

    const supabase = getServiceSupabase()

    const { data: batchRow, error: batchErr } = await supabase
      .from('import_batches')
      .insert({
        filename: req.file.originalname,
        row_count: rows.length,
        created_by: 'admin-upload',
      })
      .select('id')
      .single()

    if (batchErr || !batchRow) {
      res.status(500).json({ error: 'สร้าง import_batches ไม่สำเร็จ', details: batchErr })
      return
    }

    const batchId = batchRow.id as string
    importBatchId = batchId
    const trimmedRows = rows.map((raw) => {
      const trimmed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) {
        trimmed[k.trim()] = v
      }
      return trimmed
    })
    const mapped = trimmedRows.map((trimmed) => mapExcelRow(trimmed, batchId))

    const chunkSize = 300
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunkMapped = mapped.slice(i, i + chunkSize)
      const chunkRaw = trimmedRows.slice(i, i + chunkSize)
      const { data: inserted, error: insErr } = await supabase.from('members').insert(chunkMapped).select('id')
      if (insErr || !inserted?.length) {
        const rb = await rollbackFailedMemberImport(supabase, batchId)
        res.status(500).json({
          error: 'เพิ่มข้อมูลไม่สำเร็จ',
          details: insErr,
          importedSoFar: i,
          importBatchId: batchId,
          importRollback: rb.error ? { ok: false, warning: rb.error } : { ok: true },
        })
        return
      }
      for (let j = 0; j < inserted.length; j++) {
        const id = (inserted[j] as { id: string }).id
        const specs = extractDistinctionSpecsFromImportRow(chunkRaw[j]!)
        if (!specs.length) continue
        const distRes = await replaceMemberDistinctions(supabase, id, specs)
        if (distRes.error) {
          const rb = await rollbackFailedMemberImport(supabase, batchId)
          res.status(500).json({
            error: 'บันทึกมิติสมาชิกหลังนำเข้าไม่สำเร็จ',
            details: distRes.error.message,
            importedSoFar: i + j,
            importBatchId: batchId,
            importRollback: rb.error ? { ok: false, warning: rb.error } : { ok: true },
          })
          return
        }
      }
    }

    const { error: updErr } = await supabase
      .from('import_batches')
      .update({ row_count: mapped.length })
      .eq('id', batchId)

    if (updErr) {
      const rb = await rollbackFailedMemberImport(supabase, batchId)
      res.status(500).json({
        error: 'อัปเดต import_batches ไม่สำเร็จ',
        details: updErr,
        importBatchId: batchId,
        importRollback: rb.error ? { ok: false, warning: rb.error } : { ok: true },
      })
      return
    }

    res.json({
      ok: true,
      importBatchId: batchId,
      inserted: mapped.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    if (importBatchId) {
      const supabase = getServiceSupabase()
      const rb = await rollbackFailedMemberImport(supabase, importBatchId)
      res.status(500).json({
        error: message,
        importBatchId,
        importRollback: rb.error ? { ok: false, warning: rb.error } : { ok: true },
      })
      return
    }
    res.status(500).json({ error: message })
  }
})

/**
 * GET /directory?view=person|batch|batch_presidents|outstanding|committee&q=…&batch=…
 * — ค้นหา/รายชื่อทะเบียนสมาชิกหลายมิติ (กรรมการจาก app_user_roles.role_code = committee)
 */
importMembersRouter.get('/directory', async (req, res) => {
  try {
    const view = parseDirectoryView(typeof req.query.view === 'string' ? req.query.view : '')
    if (!view) {
      res.status(400).json({
        error: 'ระบุ view เป็นหนึ่งใน: person, batch, batch_presidents, outstanding, committee',
      })
      return
    }

    const supabase = getServiceSupabase()
    const batchNorm = normalizeWhitespace(typeof req.query.batch === 'string' ? req.query.batch : '')
    const qRaw = typeof req.query.q === 'string' ? req.query.q : ''

    if (view === 'committee') {
      const { data: roleRows, error: r1err } = await supabase.from('app_user_roles').select('user_id').eq('role_code', 'committee')
      if (r1err) {
        res.status(500).json({ error: 'โหลดบทบาทกรรมการไม่สำเร็จ', details: r1err })
        return
      }
      const userIds = [...new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id))]
      if (!userIds.length) {
        res.json({ ok: true, view, count: 0, members: [] })
        return
      }
      const { data: appUsers, error: uerr } = await supabase
        .from('app_users')
        .select('member_id')
        .in('id', userIds)
        .not('member_id', 'is', null)
      if (uerr) {
        res.status(500).json({ error: 'โหลด app_users ไม่สำเร็จ', details: uerr })
        return
      }
      const memberIds = [
        ...new Set(
          (appUsers ?? [])
            .map((u: { member_id: string | null }) => u.member_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ]
      if (!memberIds.length) {
        res.json({ ok: true, view, count: 0, members: [] })
        return
      }
      const { data: members, error: merr } = await supabase
        .from('members')
        .select(DIRECTORY_SELECT)
        .in('id', memberIds)
        .order('last_name', { ascending: true })
        .limit(DIRECTORY_LIMIT)
      if (merr) {
        res.status(500).json({ error: 'โหลดสมาชิกกรรมการไม่สำเร็จ', details: merr })
        return
      }
      const base = (members ?? []) as DirectoryMemberBase[]
      const withCommittee = base.map((m) => ({ ...m, committee_role: true }))
      const enriched = await enrichWithDistinctions(supabase, withCommittee)
      res.json({ ok: true, view, count: enriched.length, members: enriched })
      return
    }

    let query = supabase.from('members').select(DIRECTORY_SELECT).order('last_name', { ascending: true }).limit(DIRECTORY_LIMIT)

    if (view === 'person') {
      const frag = sanitizeIlikeFragment(qRaw)
      if (!frag) {
        res.status(400).json({ error: 'โหมด person ต้องส่ง q (ข้อความค้นหา) อย่างน้อย 1 ตัวอักษรที่ใช้ได้' })
        return
      }
      const pat = `%${frag}%`
      query = query.or(
        `first_name.ilike.${pat},last_name.ilike.${pat},batch.ilike.${pat},batch_name.ilike.${pat},phone.ilike.${pat},email.ilike.${pat},member_code.ilike.${pat},line_uid.ilike.${pat},student_id.ilike.${pat},nickname.ilike.${pat}`,
      )
    } else if (view === 'batch') {
      if (!batchNorm) {
        res.status(400).json({ error: 'โหมด batch ต้องส่ง batch (รุ่น)' })
        return
      }
      query = query.eq('batch', batchNorm)
    } else if (view === 'batch_presidents') {
      const idsRes = await memberIdsByDistinctionCode(
        supabase,
        MemberDistinctionCode.batchPresident,
        batchNorm || undefined,
      )
      if ('isMemberIdsError' in idsRes) {
        res.status(500).json({ error: 'ค้นหาประธานรุ่นไม่สำเร็จ', details: idsRes.error })
        return
      }
      if (!idsRes.length) {
        res.json({ ok: true, view, count: 0, members: [] })
        return
      }
      query = supabase.from('members').select(DIRECTORY_SELECT).in('id', idsRes).order('last_name', { ascending: true }).limit(DIRECTORY_LIMIT)
    } else {
      const idsRes = await memberIdsAnyOutstanding(supabase, batchNorm || undefined)
      if ('isMemberIdsError' in idsRes) {
        res.status(500).json({ error: 'ค้นหาศิษย์เก่าดีเด่นไม่สำเร็จ', details: idsRes.error })
        return
      }
      if (!idsRes.length) {
        res.json({ ok: true, view, count: 0, members: [] })
        return
      }
      query = supabase.from('members').select(DIRECTORY_SELECT).in('id', idsRes).order('last_name', { ascending: true }).limit(DIRECTORY_LIMIT)
    }

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: 'ค้นหาทะเบียนไม่สำเร็จ', details: error })
      return
    }

    const rows = (data ?? []) as DirectoryMemberBase[]
    const withCommittee = await attachCommitteeRole(supabase, rows)
    const enriched = await enrichWithDistinctions(supabase, withCommittee)
    res.json({ ok: true, view, count: enriched.length, members: enriched })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * POST /sync-registry-presidents — อ่าน PRESIDENT_KEYS_JSON แบบขยาย (มี member_id) แล้วตั้งมิติ batch_president
 * ในรุ่นนั้นให้เป็นคนเดียว (ลบมิติประธานรุ่นของคนอื่นในรุ่นเดียวก่อน) body: { dryRun?: boolean }
 */
importMembersRouter.post('/sync-registry-presidents', async (req, res) => {
  try {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>
    const dryRun = body.dryRun === true

    const planned = getPresidentRegistrySyncTargets()
    if (!planned.ok) {
      res.status(400).json({ error: planned.error })
      return
    }

    if (!planned.targets.length) {
      const entries = parsePresidentKeyEntries()
      res.status(400).json({
        error:
          'ไม่มี member_id ใน PRESIDENT_KEYS_JSON — แบบ legacy (รุ่น→คีย์สตริงอย่างเดียว) ยังอนุมัติคำร้องได้ แต่ไม่ซิงก์ทะเบียนอัตโนมัติ',
        hint: 'ตัวอย่าง: {"2520":{"key":"รหัสลับ","member_id":"<uuid จาก members.id>"}}',
        batchesInEnv: entries?.map((e) => ({ batch: e.batchKey, hasMemberId: Boolean(e.memberId) })) ?? [],
      })
      return
    }

    const supabase = getServiceSupabase()
    type AppliedRow = {
      batchKey: string
      memberId: string
      name: string
      dryRun: boolean
    }
    type ErrRow = { batchKey: string; memberId: string; error: string }
    const applied: AppliedRow[] = []
    const errors: ErrRow[] = []

    for (const { batchKey, memberId } of planned.targets) {
      const { data: member, error: mErr } = await supabase
        .from('members')
        .select('id,batch,first_name,last_name')
        .eq('id', memberId)
        .maybeSingle()

      if (mErr || !member) {
        errors.push({ batchKey, memberId, error: mErr?.message ?? 'ไม่พบสมาชิก' })
        continue
      }

      const mb =
        member.batch != null && String(member.batch).trim() ? normalizeWhitespace(String(member.batch)) : ''
      if (mb !== batchKey) {
        errors.push({
          batchKey,
          memberId,
          error: `รุ่นในทะเบียน (${String(member.batch)}) ไม่ตรงกับคีย์รุ่นใน JSON (${batchKey})`,
        })
        continue
      }

      const batchStored = typeof member.batch === 'string' && member.batch.trim() ? member.batch : batchKey
      const first = typeof member.first_name === 'string' ? member.first_name : ''
      const last = typeof member.last_name === 'string' ? member.last_name : ''
      const name = `${first} ${last}`.trim() || memberId

      if (dryRun) {
        applied.push({ batchKey, memberId, name, dryRun: true })
        continue
      }

      const setRes = await setBatchPresidentDistinctionForBatch(supabase, batchStored, memberId)
      if (setRes.error) {
        errors.push({ batchKey, memberId, error: `ตั้งประธานรุ่นไม่สำเร็จ: ${setRes.error.message}` })
        continue
      }

      applied.push({ batchKey, memberId, name, dryRun: false })
    }

    res.json({
      ok: true,
      dryRun,
      applied,
      errors,
      summary: { applied: applied.length, errors: errors.length },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * PATCH — อัปเดต member_distinctions
 * - ส่ง `distinctions: [{ code, mark_key?, label_th? }]` เพื่อแทนที่มิติทั้งหมดของสมาชิกคนนี้
 * - หรือส่ง `batch_president` / `outstanding_alumni` (boolean) เพื่อสลับแฟล็กทั่วไปโดยคงมิติอื่น (ปี/โปรแกรม/ฐานสถานะ)
 */
importMembersRouter.patch('/:memberId/directory-flags', async (req, res) => {
  try {
    const memberId = typeof req.params.memberId === 'string' ? req.params.memberId.trim() : ''
    if (!memberId) {
      res.status(400).json({ error: 'ต้องระบุ memberId' })
      return
    }

    const body = req.body as Record<string, unknown>
    const supabase = getServiceSupabase()

    const { data: memberRow, error: memErr } = await supabase.from('members').select('id').eq('id', memberId).maybeSingle()
    if (memErr) {
      res.status(500).json({ error: 'โหลดสมาชิกไม่สำเร็จ', details: memErr })
      return
    }
    if (!memberRow) {
      res.status(404).json({ error: 'ไม่พบสมาชิก' })
      return
    }

    if ('distinctions' in body) {
      const parsed = parseBodyDistinctionSpecs(body.distinctions)
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error })
        return
      }
      const distRes = await replaceMemberDistinctions(supabase, memberId, parsed.specs)
      if (distRes.error) {
        res.status(500).json({ error: 'อัปเดตมิติไม่สำเร็จ', details: distRes.error.message })
        return
      }
    } else {
      const hasBp = 'batch_president' in body
      const hasOa = 'outstanding_alumni' in body
      if (!hasBp && !hasOa) {
        res.status(400).json({
          error:
            'ส่ง distinctions (array) หรือ batch_president / outstanding_alumni (boolean) อย่างน้อยหนึ่งค่า',
        })
        return
      }
      if (hasBp && typeof body.batch_president !== 'boolean') {
        res.status(400).json({ error: 'batch_president ต้องเป็น boolean' })
        return
      }
      if (hasOa && typeof body.outstanding_alumni !== 'boolean') {
        res.status(400).json({ error: 'outstanding_alumni ต้องเป็น boolean' })
        return
      }

      const { data: existing, error: exErr } = await supabase
        .from('member_distinctions')
        .select('code,mark_key,label_th')
        .eq('member_id', memberId)
      if (exErr) {
        res.status(500).json({ error: 'โหลดมิติเดิมไม่สำเร็จ', details: exErr })
        return
      }

      let specs: DistinctionSpec[] = (
        (existing ?? []) as { code: string; mark_key: string | null; label_th: string | null }[]
      ).map((r) => ({
        code: r.code,
        mark_key: r.mark_key ?? '',
        label_th: r.label_th,
      }))

      if (hasBp) {
        if (body.batch_president === true) {
          if (!specs.some((s) => s.code === MemberDistinctionCode.batchPresident)) {
            specs.push({ code: MemberDistinctionCode.batchPresident, mark_key: '', label_th: null })
          }
        } else {
          specs = specs.filter((s) => s.code !== MemberDistinctionCode.batchPresident)
        }
      }
      if (hasOa) {
        if (body.outstanding_alumni === true) {
          if (!specs.some((s) => s.code === MemberDistinctionCode.outstandingAlumni && s.mark_key === '')) {
            specs.push({ code: MemberDistinctionCode.outstandingAlumni, mark_key: '', label_th: null })
          }
        } else {
          specs = specs.filter((s) => !(s.code === MemberDistinctionCode.outstandingAlumni && s.mark_key === ''))
        }
      }

      const distRes = await replaceMemberDistinctions(supabase, memberId, dedupeDistinctionSpecs(specs))
      if (distRes.error) {
        res.status(500).json({ error: 'อัปเดตมิติไม่สำเร็จ', details: distRes.error.message })
        return
      }
    }

    const { data, error } = await supabase.from('members').select(DIRECTORY_SELECT).eq('id', memberId).maybeSingle()
    if (error || !data) {
      res.status(500).json({ error: 'โหลดสมาชิกหลังอัปเดตไม่สำเร็จ', details: error })
      return
    }

    const [withComm] = await attachCommitteeRole(supabase, [data as DirectoryMemberBase])
    const [enriched] = await enrichWithDistinctions(supabase, [withComm])
    res.json({ ok: true, member: enriched })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

importMembersRouter.get('/summary', async (req, res) => {
  try {
    const importBatchIdRaw = typeof req.query.importBatchId === 'string' ? req.query.importBatchId : ''
    const importBatchId = importBatchIdRaw.trim() || undefined

    const rows = await fetchSummaryRows(importBatchId)
    const summary = buildPostImportSummary(rows)

    res.json({
      ok: true,
      importBatchId: importBatchId ?? null,
      summary,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

importMembersRouter.delete('/all', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { error } = await supabase
      .from('members')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00+00:00')

    if (error) {
      res.status(500).json({ error: 'ลบข้อมูลไม่สำเร็จ', details: error })
      return
    }

    res.json({ ok: true, message: 'ลบข้อมูลสมาชิกทั้งหมดแล้ว' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
