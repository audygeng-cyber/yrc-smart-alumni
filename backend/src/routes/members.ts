import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { getServiceSupabase } from '../lib/supabase.js'
import { notifyNewMemberRequest } from '../lib/webPush.js'
import type { MemberRow } from '../util/memberImportMap.js'
import { parseStoragePublicObjectPath } from '../util/memberProfilePhotoStorage.js'
import { mergeMemberProfileSnapshot, parseMemberSelfUpdates } from '../util/memberSelfUpdate.js'
import { normalizeWhitespace } from '../util/normalize.js'
import { isMemberMembershipActive } from '../util/memberMembership.js'
import { syncAppUserAfterMemberLink } from '../util/syncAppUserWithMember.js'

/** ช่องทางเข้าระบบ (สอดคล้อง frontend `lineEntrySource.ts`) — ใช้ประกอบบันทึก/audit ภายหลัง */
const APP_ENTRY_SOURCES = new Set(['alumni_url', 'cram_qr', 'cram_alumni_url'])

const MEMBER_PROFILE_PHOTO_BUCKET = 'member-profile-photos'

const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
})

export const membersRouter = Router()

const MEMBERSHIP_INACTIVE_JSON = {
  code: 'MEMBERSHIP_INACTIVE' as const,
  error: 'สถานะสมาชิกในทะเบียนยังไม่ Active — รอการอนุมัติหรือติดต่อผู้ดูแล',
}

async function fetchMemberRowById(supabase: ReturnType<typeof getServiceSupabase>, id: string) {
  const { data, error } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/** อัปเดตทะเบียน + บันทึก member_profile_versions (ใช้ทั้ง update-self และอัปโหลดรูป) */
async function persistMemberSelfUpdateWithVersions(
  supabase: ReturnType<typeof getServiceSupabase>,
  row: Record<string, unknown>,
  updates: Partial<MemberRow>,
): Promise<{ ok: true } | { ok: false; step: string; details: unknown }> {
  const now = new Date().toISOString()
  const snapshot = mergeMemberProfileSnapshot(row, updates)
  const { error: upErr } = await supabase
    .from('members')
    .update({ ...updates, updated_at: now })
    .eq('id', row.id as string)
  if (upErr) return { ok: false, step: 'update', details: upErr }

  const { error: deactErr } = await supabase
    .from('member_profile_versions')
    .update({ is_active: false })
    .eq('member_id', row.id as string)
  if (deactErr) return { ok: false, step: 'deactivate', details: deactErr }

  const { error: insErr } = await supabase.from('member_profile_versions').insert({
    member_id: row.id as string,
    snapshot,
    is_active: true,
  })
  if (insErr) return { ok: false, step: 'insert', details: insErr }
  return { ok: true }
}

function extFromImageMime(mime: string): string {
  const m = mime.toLowerCase()
  if (m === 'image/jpeg') return 'jpg'
  if (m === 'image/png') return 'png'
  if (m === 'image/webp') return 'webp'
  if (m === 'image/gif') return 'gif'
  return 'bin'
}

membersRouter.get('/', (_req, res) => {
  res.json({
    message: 'กำลังเตรียมหน้ารายการสมาชิก โดยจะเปิดใช้งานร่วมกับ auth และ Supabase RLS',
  })
})

/**
 * โหลดข้อมูลสมาชิกจาก line_uid ที่ผูกไว้แล้ว — ใช้กู้เซสชันฝั่ง frontend หลัง refresh
 * Body: { line_uid }
 */
membersRouter.post('/session-member', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()

    if (error) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: error })
      return
    }
    if (!row?.id) {
      res.status(404).json({ code: 'MEMBER_NOT_LINKED', error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    if (!isMemberMembershipActive(full?.membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * บทบาทในแอป (RBAC) จาก `app_users` + `app_user_roles`
 * ถ้ายังไม่มีแถว `app_users` สำหรับ line_uid จะสร้างแถวใหม่ (member_id จาก members ถ้าผูกแล้ว, approval_status approved ถ้าผูกแล้ว)
 * ถ้ามีแถวใน `members` ที่ผูก line_uid แล้ว จะเติม role `member` ใน response โดยอัตโนมัติ
 * Body: { line_uid, entry_source? }
 */
membersRouter.post('/app-roles', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const rawEntry = typeof req.body?.entry_source === 'string' ? req.body.entry_source.trim() : ''
    const entry_source = rawEntry && APP_ENTRY_SOURCES.has(rawEntry) ? rawEntry : null

    const supabase = getServiceSupabase()

    const { data: memberRow, error: mErr } = await supabase
      .from('members')
      .select('id, membership_status')
      .eq('line_uid', line_uid)
      .maybeSingle()
    if (mErr) {
      res.status(500).json({ error: 'ค้นหาสมาชิกไม่สำเร็จ', details: mErr })
      return
    }
    const hasLinkedMember = Boolean(memberRow?.id)
    const membershipActive =
      hasLinkedMember && isMemberMembershipActive((memberRow as { membership_status?: string | null }).membership_status)

    const userLookup = await supabase
      .from('app_users')
      .select('id, member_id, approval_status, first_entry_source, last_entry_source, last_entry_recorded_at')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (userLookup.error) {
      res.status(500).json({ error: 'โหลด app_users ไม่สำเร็จ', details: userLookup.error })
      return
    }

    let appUser = userLookup.data

    /** A1: สร้างแถว app_users ให้ทุก LINE UID — จึงบันทึก entry / โหลด roles จาก app_user_roles ได้ */
    if (!appUser) {
      const ins = {
        line_uid,
        member_id: (memberRow?.id as string | undefined) ?? null,
        approval_status: hasLinkedMember ? ('approved' as const) : ('pending' as const),
      }
      const { data: inserted, error: insErr } = await supabase
        .from('app_users')
        .insert(ins)
        .select('id, member_id, approval_status, first_entry_source, last_entry_source, last_entry_recorded_at')
        .single()

      if (insErr) {
        const code = (insErr as { code?: string }).code
        const msg = String((insErr as { message?: string }).message ?? '')
        const isDup = code === '23505' || msg.includes('duplicate') || msg.includes('unique')
        if (isDup) {
          const again = await supabase
            .from('app_users')
            .select('id, member_id, approval_status, first_entry_source, last_entry_source, last_entry_recorded_at')
            .eq('line_uid', line_uid)
            .maybeSingle()
          if (again.error || !again.data) {
            res.status(500).json({ error: 'โหลด app_users หลังสร้างไม่สำเร็จ', details: again.error ?? insErr })
            return
          }
          appUser = again.data
        } else {
          res.status(500).json({ error: 'สร้าง app_users ไม่สำเร็จ', details: insErr })
          return
        }
      } else {
        appUser = inserted
      }
    }

    if (!appUser) {
      res.status(500).json({ error: 'ไม่พบ app_users' })
      return
    }

    /** คู่กับ A2: ถ้าผูกสมาชิกแล้วแต่แถวเก่าจากก่อนผูก (pending / member_id null) — sync ให้ตรง */
    if (hasLinkedMember && memberRow?.id) {
      const mid = memberRow.id as string
      const cur = appUser as { member_id?: string | null; approval_status?: string }
      if (cur.member_id !== mid || cur.approval_status !== 'approved') {
        const synced = await syncAppUserAfterMemberLink(supabase, line_uid, mid)
        if (!synced.ok) {
          res.status(500).json({ error: 'อัปเดต app_users ไม่สำเร็จ', details: synced.error })
          return
        }
        const { data: refreshed, error: rfErr } = await supabase
          .from('app_users')
          .select('id, member_id, approval_status, first_entry_source, last_entry_source, last_entry_recorded_at')
          .eq('line_uid', line_uid)
          .maybeSingle()
        if (rfErr || !refreshed) {
          res.status(500).json({ error: 'โหลด app_users หลัง sync ไม่สำเร็จ', details: rfErr })
          return
        }
        appUser = refreshed
      }
    }

    type AppUserRow = {
      id: string
      first_entry_source?: string | null
      last_entry_source?: string | null
      last_entry_recorded_at?: string | null
    }
    const au = appUser as AppUserRow | null
    let firstEntryOut: string | null = au?.first_entry_source?.trim() ? String(au.first_entry_source) : null
    let lastEntryOut: string | null = au?.last_entry_source?.trim() ? String(au.last_entry_source) : null
    let lastEntryAtOut: string | null =
      typeof au?.last_entry_recorded_at === 'string' && au.last_entry_recorded_at.trim()
        ? au.last_entry_recorded_at
        : null

    if (entry_source && au?.id) {
      const wasFirstEmpty = !firstEntryOut
      const recordedAt = new Date().toISOString()
      const patch: Record<string, unknown> = {
        last_entry_source: entry_source,
        last_entry_recorded_at: recordedAt,
      }
      if (wasFirstEmpty) {
        patch.first_entry_source = entry_source
      }
      const { error: upErr } = await supabase.from('app_users').update(patch).eq('id', au.id)
      if (!upErr) {
        lastEntryOut = entry_source
        lastEntryAtOut = recordedAt
        if (wasFirstEmpty) {
          firstEntryOut = entry_source
        }
      }
    }

    let roles: string[] = []
    if (appUser?.id) {
      const { data: roleRows, error: rErr } = await supabase.from('app_user_roles').select('role_code').eq('user_id', appUser.id)
      if (rErr) {
        res.status(500).json({ error: 'โหลดบทบาทไม่สำเร็จ', details: rErr })
        return
      }
      roles = (roleRows ?? [])
        .map((r) => (r as { role_code?: string }).role_code)
        .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
    }

    if (membershipActive && !roles.includes('member')) {
      roles = [...roles, 'member']
    }

    res.json({
      ok: true,
      line_uid,
      app_user_id: appUser?.id ?? null,
      approval_status: appUser?.approval_status ?? null,
      has_linked_member: hasLinkedMember,
      membership_active: membershipActive,
      roles,
      entry_source,
      first_entry_source: firstEntryOut,
      last_entry_source: lastEntryOut,
      last_entry_recorded_at: lastEntryAtOut,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** ตรวจสอบคำร้องล่าสุดของ LINE UID นี้ */
membersRouter.post('/request-status', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('member_update_requests')
      .select(
        'id,request_type,status,created_at,president_approved_at,admin_approved_at,rejected_at,rejection_reason,requested_data,action_history',
      )
      .eq('line_uid', line_uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: error })
      return
    }
    if (!row) {
      res.status(404).json({ code: 'REQUEST_NOT_FOUND', error: 'ยังไม่พบคำร้องของ LINE UID นี้' })
      return
    }

    res.json({ ok: true, request: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * ผูก LINE UID กับสมาชิกที่มีอยู่แล้ว (กฎ: รุ่น + ชื่อ + นามสกุล ตรงกันหนึ่งแถวเท่านั้น)
 * แนะนำให้ได้ line_uid จาก POST /api/auth/line/token (ตรวจ id_token กับ LINE แล้ว)
 */
membersRouter.post('/verify-link', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const batch = typeof req.body?.batch === 'string' ? req.body.batch : ''
    const first_name = typeof req.body?.first_name === 'string' ? req.body.first_name : ''
    const last_name = typeof req.body?.last_name === 'string' ? req.body.last_name : ''

    if (!line_uid || !batch || !first_name || !last_name) {
      res.status(400).json({ error: 'ต้องระบุ line_uid, batch, first_name และ last_name' })
      return
    }

    const nb = normalizeWhitespace(batch)
    const nf = normalizeWhitespace(first_name)
    const nl = normalizeWhitespace(last_name)

    const supabase = getServiceSupabase()

    const { data: rows, error: qErr } = await supabase
      .from('members')
      .select('id, line_uid, membership_status')
      .eq('batch', nb)
      .eq('first_name', nf)
      .eq('last_name', nl)

    if (qErr) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
      return
    }

    const list = rows ?? []
    if (list.length === 0) {
      res.status(404).json({
        code: 'NOT_IN_REGISTRY',
        error: 'ไม่พบข้อมูลในทะเบียนสมาชิก',
      })
      return
    }

    if (list.length > 1) {
      res.status(409).json({
        code: 'AMBIGUOUS_MATCH',
        error: 'พบข้อมูลซ้ำในระบบ กรุณาติดต่อผู้ดูแล',
        count: list.length,
      })
      return
    }

    const member = list[0]!

    if (member.line_uid && member.line_uid !== line_uid) {
      res.status(409).json({
        code: 'MEMBER_ALREADY_LINKED',
        error: 'สมาชิกนี้ผูกบัญชี LINE อื่นแล้ว',
      })
      return
    }

    const { data: uidOwner, error: uidErr } = await supabase
      .from('members')
      .select('id')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (uidErr) {
      res.status(500).json({ error: 'ตรวจสอบ LINE UID ไม่สำเร็จ', details: uidErr })
      return
    }

    if (uidOwner && uidOwner.id !== member.id) {
      res.status(409).json({
        code: 'LINE_UID_TAKEN',
        error: 'บัญชี LINE นี้ถูกใช้กับสมาชิกอื่นแล้ว',
      })
      return
    }

    if (!isMemberMembershipActive((member as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    if (member.line_uid === line_uid) {
      const synced = await syncAppUserAfterMemberLink(supabase, line_uid, member.id as string)
      if (!synced.ok) {
        res.status(500).json({ error: 'อัปเดต app_users ไม่สำเร็จ', details: synced.error })
        return
      }
      const full = await fetchMemberRowById(supabase, member.id as string)
      res.json({ ok: true, memberId: member.id, alreadyLinked: true, member: full })
      return
    }

    const { error: upErr } = await supabase
      .from('members')
      .update({ line_uid, updated_at: new Date().toISOString() })
      .eq('id', member.id)

    if (upErr) {
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ', details: upErr })
      return
    }

    const syncedAfterLink = await syncAppUserAfterMemberLink(supabase, line_uid, member.id as string)
    if (!syncedAfterLink.ok) {
      res.status(500).json({ error: 'อัปเดต app_users ไม่สำเร็จ', details: syncedAfterLink.error })
      return
    }

    const full = await fetchMemberRowById(supabase, member.id as string)
    res.json({ ok: true, memberId: member.id, linked: true, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * สมาชิกที่ผูก line_uid แล้ว — อัปเดตฟิลด์รอง (ไม่แก้ รุ่น/ชื่อ/นามสกุล จากฟอร์มนี้)
 * Body: { line_uid, updates: { "เบอร์โทรศัพท์": "...", ... } } หรือใช้ชื่อคอลัมน์ DB
 */
membersRouter.post('/update-self', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const rawUpdates = req.body?.updates
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }
    if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
      res.status(400).json({ error: 'ต้องระบุ updates object' })
      return
    }

    const updates = parseMemberSelfUpdates(rawUpdates as Record<string, unknown>)
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'ไม่มีฟิลด์ที่อนุญาตให้แก้ หรือค่าว่างทั้งหมด' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error: qErr } = await supabase
      .from('members')
      .select('*')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (qErr) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
      return
    }
    if (!row) {
      res.status(403).json({
        error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้ — ใช้ "ตรวจสอบและผูก" ก่อน',
      })
      return
    }
    if (!isMemberMembershipActive((row as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    const persisted = await persistMemberSelfUpdateWithVersions(supabase, row as Record<string, unknown>, updates)
    if (!persisted.ok) {
      const label =
        persisted.step === 'update'
          ? 'อัปเดตข้อมูลไม่สำเร็จ'
          : persisted.step === 'deactivate'
            ? 'บันทึกประวัติไม่สำเร็จ (deactivate)'
            : 'บันทึกประวัติไม่สำเร็จ (insert)'
      res.status(500).json({ error: label, details: persisted.details })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * อัปโหลดรูปโปรไฟล์ไป Supabase Storage แล้วตั้ง members.photo_url + บันทึก member_profile_versions
 * multipart: line_uid (text), photo (ไฟล์ — ฟิลด์ชื่อ photo)
 */
membersRouter.post('/profile-photo', profilePhotoUpload.single('photo'), async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const file = req.file
    if (!file?.buffer?.length) {
      res.status(400).json({ error: 'ต้องแนบไฟล์รูป (ฟิลด์ photo)' })
      return
    }

    const mime = String(file.mimetype || '').toLowerCase()
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) {
      res.status(415).json({ error: 'รองรับเฉพาะ JPEG, PNG, WebP, GIF' })
      return
    }

    let supabase: ReturnType<typeof getServiceSupabase>
    try {
      supabase = getServiceSupabase()
    } catch {
      res.status(500).json({ error: 'เซิร์ฟเวอร์ยังไม่ตั้งค่า Supabase' })
      return
    }

    const { data: row, error: qErr } = await supabase
      .from('members')
      .select('*')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (qErr) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
      return
    }
    if (!row) {
      res.status(403).json({
        error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้ — ใช้ "ตรวจสอบและผูก" ก่อน',
      })
      return
    }
    if (!isMemberMembershipActive((row as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    const memberId = String(row.id)
    const objectPath = `${memberId}/${randomUUID()}.${extFromImageMime(mime)}`
    const previousPhotoUrl = typeof row.photo_url === 'string' ? row.photo_url.trim() : ''
    const oldObjectPath = previousPhotoUrl
      ? parseStoragePublicObjectPath(previousPhotoUrl, MEMBER_PROFILE_PHOTO_BUCKET)
      : null

    const { error: upStorage } = await supabase.storage
      .from(MEMBER_PROFILE_PHOTO_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: mime,
        upsert: false,
      })

    if (upStorage) {
      res.status(500).json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ', details: upStorage })
      return
    }

    const { data: pub } = supabase.storage.from(MEMBER_PROFILE_PHOTO_BUCKET).getPublicUrl(objectPath)
    const publicUrl = pub?.publicUrl
    if (!publicUrl) {
      res.status(500).json({ error: 'สร้าง URL รูปไม่สำเร็จ' })
      return
    }

    const persisted = await persistMemberSelfUpdateWithVersions(supabase, row as Record<string, unknown>, {
      photo_url: publicUrl,
    })
    if (!persisted.ok) {
      await supabase.storage.from(MEMBER_PROFILE_PHOTO_BUCKET).remove([objectPath])
      const label =
        persisted.step === 'update'
          ? 'อัปเดตข้อมูลไม่สำเร็จ'
          : persisted.step === 'deactivate'
            ? 'บันทึกประวัติไม่สำเร็จ (deactivate)'
            : 'บันทึกประวัติไม่สำเร็จ (insert)'
      res.status(500).json({ error: label, details: persisted.details })
      return
    }

    if (oldObjectPath && oldObjectPath !== objectPath) {
      await supabase.storage.from(MEMBER_PROFILE_PHOTO_BUCKET).remove([oldObjectPath])
    }

    const full = await fetchMemberRowById(supabase, memberId)
    res.json({ ok: true, memberId, photoUrl: publicUrl, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * ประวัติชุดข้อมูลที่สมาชิกแก้ผ่านพอร์ทัล (ชุด active ล่าสุด — query: line_uid)
 */
membersRouter.get('/profile-versions', async (req, res) => {
  try {
    const line_uid = typeof req.query.line_uid === 'string' ? req.query.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error: qErr } = await supabase
      .from('members')
      .select('id, membership_status')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (qErr) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
      return
    }
    if (!row) {
      res.status(403).json({ error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }
    if (!isMemberMembershipActive((row as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    const { data: versions, error: vErr } = await supabase
      .from('member_profile_versions')
      .select('id, created_at, is_active, snapshot')
      .eq('member_id', row.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (vErr) {
      res.status(500).json({ error: 'โหลดประวัติไม่สำเร็จ', details: vErr })
      return
    }

    res.json({ ok: true, versions: versions ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** สมัครใหม่: บันทึกคำร้อง (รอประธานรุ่น → Admin) */
membersRouter.post('/register-request', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'ต้องส่ง JSON body' })
      return
    }

    const line_uid = typeof req.body.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const body = req.body as Record<string, unknown>
    const requested_data: Record<string, unknown> = { ...body }
    delete requested_data.line_uid

    const supabase = getServiceSupabase()

    const { data: uidOwner, error: uidErr } = await supabase
      .from('members')
      .select('id')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (uidErr) {
      res.status(500).json({ error: 'ตรวจสอบ LINE UID ไม่สำเร็จ', details: uidErr })
      return
    }

    if (uidOwner) {
      res.status(409).json({ code: 'LINE_UID_TAKEN', error: 'บัญชี LINE นี้ลงทะเบียนแล้ว' })
      return
    }

    const { data: row, error: insErr } = await supabase
      .from('member_update_requests')
      .insert({
        line_uid,
        request_type: 'new_registration',
        requested_data,
        action_history: [
          {
            action: 'submitted',
            actor: 'member',
            at: new Date().toISOString(),
            comment: null,
            from_status: null,
            to_status: 'pending_president',
          },
        ],
        status: 'pending_president',
      })
      .select('id')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'สร้างคำร้องไม่สำเร็จ', details: insErr })
      return
    }

    void notifyNewMemberRequest(row.id as string)

    res.status(201).json({ ok: true, requestId: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

type FundScope = 'yupparaj_school' | 'association' | 'cram_school'

function isFundScope(s: string): s is FundScope {
  return s === 'yupparaj_school' || s === 'association' || s === 'cram_school'
}

/**
 * สถิติบริจาคกองโรงเรียนยุพราช (สาธารณะ — ไม่ต้องล็อกอิน) สำหรับพอร์ทัลสมาชิก
 * รวมยอดตามโครงการ ตามรุ่น รายชื่อผู้บริจาค — ดึงจาก donations + school_activities
 */
membersRouter.get('/donations/yupparaj-stats', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: acts, error: aErr } = await supabase
      .from('school_activities')
      .select('id, title, category, target_amount')
      .eq('fund_scope', 'yupparaj_school')
      .eq('active', true)
      .order('title', { ascending: true })
    if (aErr) {
      res.status(500).json({ error: 'โหลดกิจกรรมไม่สำเร็จ', details: aErr })
      return
    }

    const { data: dons, error: dErr } = await supabase
      .from('donations')
      .select(
        'id, activity_id, amount, donor_first_name, donor_last_name, donor_batch, donor_batch_name, created_at',
      )
      .eq('fund_scope', 'yupparaj_school')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (dErr) {
      res.status(500).json({ error: 'โหลดการบริจาคไม่สำเร็จ', details: dErr })
      return
    }

    const titleById = new Map<string, { title: string; category: string }>()
    for (const a of acts ?? []) {
      const id = String((a as { id: string }).id)
      titleById.set(id, {
        title: String((a as { title?: string | null }).title ?? '').trim() || '—',
        category: String((a as { category?: string | null }).category ?? '').trim(),
      })
    }

    const extraIds = Array.from(
      new Set(
        (dons ?? [])
          .map((r) => ((r as { activity_id?: string | null }).activity_id == null ? '' : String((r as { activity_id: string }).activity_id)))
          .filter((id) => id && !titleById.has(id)),
      ),
    )
    if (extraIds.length > 0) {
      const { data: extraActs } = await supabase
        .from('school_activities')
        .select('id, title, category')
        .in('id', extraIds)
      for (const a of extraActs ?? []) {
        const id = String((a as { id: string }).id)
        if (!titleById.has(id)) {
          titleById.set(id, {
            title: String((a as { title?: string | null }).title ?? '').trim() || '—',
            category: String((a as { category?: string | null }).category ?? '').trim(),
          })
        }
      }
    }

    let totalAmount = 0
    let donationCount = 0
    const byAct = new Map<string, { raised: number; count: number }>()
    type BatchAgg = { batch: string; batchName: string | null; total: number; count: number }
    const byBatch = new Map<string, BatchAgg>()

    for (const row of dons ?? []) {
      const r = row as {
        activity_id?: string | null
        amount?: unknown
        donor_batch?: string | null
        donor_batch_name?: string | null
      }
      const raw = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
      if (!Number.isFinite(raw) || raw <= 0) continue
      totalAmount += raw
      donationCount += 1

      const aid = r.activity_id == null ? '' : String(r.activity_id)
      if (aid) {
        const cur = byAct.get(aid) ?? { raised: 0, count: 0 }
        cur.raised += raw
        cur.count += 1
        byAct.set(aid, cur)
      }

      const bRaw = r.donor_batch != null && String(r.donor_batch).trim() ? String(r.donor_batch).trim() : '—'
      const bn =
        r.donor_batch_name != null && String(r.donor_batch_name).trim() ? String(r.donor_batch_name).trim() : null
      const bk = `${bRaw}|||${bn ?? ''}`
      const curB = byBatch.get(bk) ?? { batch: bRaw, batchName: bn, total: 0, count: 0 }
      curB.total += raw
      curB.count += 1
      byBatch.set(bk, curB)
    }

    const byActivity = (acts ?? []).map((a) => {
      const id = String((a as { id: string }).id)
      const st = byAct.get(id) ?? { raised: 0, count: 0 }
      const tgtRaw = (a as { target_amount?: unknown }).target_amount
      const tgt = tgtRaw != null && tgtRaw !== '' ? Number(tgtRaw) : null
      const targetAmount = tgt != null && Number.isFinite(tgt) && tgt >= 0 ? tgt : null
      const progressPercent =
        targetAmount != null && targetAmount > 0 && Number.isFinite(st.raised)
          ? Math.min(100, Math.round((st.raised / targetAmount) * 100))
          : null
      const meta = titleById.get(id) ?? { title: '—', category: '' }
      return {
        activityId: id,
        title: meta.title,
        category: meta.category,
        targetAmount,
        raisedAmount: Math.round(st.raised * 100) / 100,
        donationCount: st.count,
        progressPercent,
      }
    })

    const byBatchList = [...byBatch.values()]
      .map((b) => ({
        batch: b.batch,
        batchName: b.batchName,
        totalAmount: Math.round(b.total * 100) / 100,
        donationCount: b.count,
      }))
      .sort((x, y) => y.totalAmount - x.totalAmount)

    const donors = (dons ?? [])
      .map((row) => {
        const r = row as {
          id: string
          activity_id?: string | null
          amount?: unknown
          donor_first_name?: string | null
          donor_last_name?: string | null
          donor_batch?: string | null
          donor_batch_name?: string | null
          created_at?: string | null
        }
        const raw = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
        if (!Number.isFinite(raw) || raw <= 0) return null
        const aid = r.activity_id == null ? '' : String(r.activity_id)
        const act = aid ? titleById.get(aid) : undefined
        const donorName = [r.donor_first_name, r.donor_last_name].filter(Boolean).join(' ').trim() || '—'
        return {
          id: String(r.id),
          activityId: aid || null,
          donorName,
          batch: r.donor_batch != null && String(r.donor_batch).trim() ? String(r.donor_batch).trim() : null,
          batchName:
            r.donor_batch_name != null && String(r.donor_batch_name).trim() ? String(r.donor_batch_name).trim() : null,
          amount: Math.round(raw * 100) / 100,
          activityTitle: act?.title ?? '—',
          activityCategory: act?.category && String(act.category).trim() ? String(act.category).trim() : null,
          createdAt: r.created_at ?? null,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      totalAmount: Math.round(totalAmount * 100) / 100,
      donationCount,
      byActivity,
      byBatch: byBatchList,
      donors,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * ประวัติการบริจาคของสมาชิก (ผ่านพอร์ทัล)
 * Body: { line_uid }
 */
membersRouter.post('/donations/history', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: member, error: mErr } = await supabase
      .from('members')
      .select('id, membership_status')
      .eq('line_uid', line_uid)
      .maybeSingle()
    if (mErr) {
      res.status(500).json({ error: 'โหลดข้อมูลสมาชิกไม่สำเร็จ', details: mErr })
      return
    }
    if (!member) {
      res.status(403).json({ error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }
    if (!isMemberMembershipActive((member as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    const { data: donRows, error: dErr } = await supabase
      .from('donations')
      .select('id, amount, created_at, transfer_at, activity_id, slip_file_url, note, fund_scope')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(40)
    if (dErr) {
      res.status(500).json({ error: 'โหลดประวัติการบริจาคไม่สำเร็จ', details: dErr })
      return
    }

    const activityIds = Array.from(
      new Set((donRows ?? []).map((r) => (r.activity_id == null ? '' : String(r.activity_id))).filter(Boolean)),
    )
    const titleById = new Map<string, { title: string; category: string }>()
    if (activityIds.length > 0) {
      const { data: acts } = await supabase.from('school_activities').select('id, title, category').in('id', activityIds)
      for (const a of acts ?? []) {
        const row = a as { id: string; title?: string | null; category?: string | null }
        titleById.set(String(row.id), {
          title: String(row.title ?? '').trim() || '—',
          category: String(row.category ?? '').trim(),
        })
      }
    }

    const donations = (donRows ?? []).map((r) => {
      const aid = r.activity_id == null ? '' : String(r.activity_id)
      const act = aid ? titleById.get(aid) : undefined
      const n = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
      return {
        id: String(r.id),
        amount: Number.isFinite(n) ? n : 0,
        createdAt: r.created_at ?? null,
        transferAt: (r as { transfer_at?: string | null }).transfer_at ?? null,
        activityId: aid || null,
        activityTitle: act?.title ?? null,
        activityCategory: act?.category && String(act.category).trim() ? String(act.category).trim() : null,
        fundScope: r.fund_scope != null && String(r.fund_scope).trim() ? String(r.fund_scope) : null,
        slipFileUrl: r.slip_file_url ?? null,
        note: r.note ?? null,
      }
    })

    res.json({ ok: true, donations })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * บริจาคผ่านพอร์ทัลสมาชิก (กิจกรรมโรงเรียนยุพราช / สมาคม / กวดวิชา — ตาม fund_scope ของกิจกรรม)
 * Body: { line_uid, activity_id, amount, transfer_at?, slip_file_url?, note? }
 * ยอด yupparaj_school ไม่ผูก legal_entity ของสมาคม/กวดวิชา (แยกบัญชีเชิงนโยบาย)
 */
membersRouter.post('/donations', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const activity_id = typeof req.body?.activity_id === 'string' ? req.body.activity_id.trim() : ''
    const amount = Number(req.body?.amount)
    const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim() : null
    const slip_file_url =
      typeof req.body?.slip_file_url === 'string' && req.body.slip_file_url.trim()
        ? req.body.slip_file_url.trim()
        : null
    let transfer_at: string | null = null
    if (typeof req.body?.transfer_at === 'string' && req.body.transfer_at.trim()) {
      const t = new Date(req.body.transfer_at.trim())
      transfer_at = Number.isFinite(t.getTime()) ? t.toISOString() : null
    }

    if (!line_uid || !activity_id || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'ต้องระบุ line_uid, activity_id และ amount > 0' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: member, error: mErr } = await supabase.from('members').select('*').eq('line_uid', line_uid).maybeSingle()
    if (mErr) {
      res.status(500).json({ error: 'โหลดข้อมูลสมาชิกไม่สำเร็จ', details: mErr })
      return
    }
    if (!member) {
      res.status(403).json({ error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }
    if (!isMemberMembershipActive((member as { membership_status?: string | null }).membership_status)) {
      res.status(403).json(MEMBERSHIP_INACTIVE_JSON)
      return
    }

    const { data: activity, error: aErr } = await supabase
      .from('school_activities')
      .select('id, active, fund_scope')
      .eq('id', activity_id)
      .maybeSingle()
    if (aErr) {
      res.status(500).json({ error: 'โหลดกิจกรรมไม่สำเร็จ', details: aErr })
      return
    }
    if (!activity || activity.active !== true) {
      res.status(400).json({ error: 'ไม่พบกิจกรรมหรือกิจกรรมปิดรับบริจาค' })
      return
    }

    const rawScope = typeof activity.fund_scope === 'string' ? activity.fund_scope.trim() : 'association'
    const fund_scope: FundScope = isFundScope(rawScope) ? rawScope : 'association'

    let legal_entity_id: string | null = null
    if (fund_scope === 'association' || fund_scope === 'cram_school') {
      const code = fund_scope === 'association' ? 'association' : 'cram_school'
      const { data: ent, error: eErr } = await supabase.from('legal_entities').select('id').eq('code', code).maybeSingle()
      if (eErr) {
        res.status(500).json({ error: 'โหลดนิติบุคคลไม่สำเร็จ', details: eErr })
        return
      }
      legal_entity_id = ent?.id ? String(ent.id) : null
    }

    const { data: appUser } = await supabase.from('app_users').select('id').eq('line_uid', line_uid).maybeSingle()

    const donor_first_name = typeof member.first_name === 'string' ? member.first_name : null
    const donor_last_name = typeof member.last_name === 'string' ? member.last_name : null
    const donor_batch = typeof member.batch === 'string' ? member.batch : null
    const donor_batch_name = typeof member.batch_name === 'string' ? member.batch_name : null

    const { data: row, error: insErr } = await supabase
      .from('donations')
      .insert({
        activity_id,
        member_id: member.id,
        app_user_id: appUser?.id ?? null,
        batch: donor_batch,
        amount,
        currency: 'THB',
        transfer_at,
        slip_file_url,
        note,
        legal_entity_id,
        fund_scope,
        donor_first_name,
        donor_last_name,
        donor_batch,
        donor_batch_name,
      })
      .select('id,amount,activity_id,fund_scope,created_at,transfer_at,slip_file_url')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'บันทึกการบริจาคไม่สำเร็จ', details: insErr })
      return
    }

    res.status(201).json({ ok: true, donation: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
