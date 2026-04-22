import type { SupabaseClient } from '@supabase/supabase-js'
import { KNOWN_OUTSTANDING_PROGRAM_KEYS, MemberDistinctionCode } from '../constants/memberDistinctionCodes.js'
import { normalizeWhitespace } from './normalize.js'

export type DistinctionRow = {
  id: string
  member_id: string
  code: string
  mark_key: string
  label_th: string | null
}

export type DistinctionSpec = {
  code: string
  mark_key: string
  label_th: string | null
}

const PROGRAM_ALIASES: [RegExp, string][] = [
  [/yupparaj_?120|120\s*ปี\s*ยุพรา|ยุพรา\s*120/i, 'yupparaj_120'],
]

export function normalizeOutstandingProgramKey(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = normalizeWhitespace(raw)
  if (!s) return null
  const canon = s.toLowerCase()
  if (KNOWN_OUTSTANDING_PROGRAM_KEYS[canon]) return canon
  for (const [re, key] of PROGRAM_ALIASES) {
    if (re.test(s)) return key
  }
  if (/^[a-z0-9_]{2,64}$/i.test(s)) return s.toLowerCase()
  return null
}

export function normalizeBuddhistYearKey(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = normalizeWhitespace(raw).replace(/\D/g, '')
  if (s.length < 4) return null
  const y = s.slice(0, 4)
  if (/^\d{4}$/.test(y)) return y
  return null
}

/** อ่านคอลัมน์เทมเพลตนำเข้า (หัวไทย) → รายการ distinction สำหรับแถวหนึ่ง */
export function extractDistinctionSpecsFromImportRow(raw: Record<string, unknown>): DistinctionSpec[] {
  const specs: DistinctionSpec[] = []
  const get = (h: string): unknown => raw[h.trim()]

  const bp = get('ประธานรุ่น')
  if (cellToBool(bp) === true) {
    specs.push({ code: MemberDistinctionCode.batchPresident, mark_key: '', label_th: null })
  }

  const oa = get('ศิษย์เก่าดีเด่น')
  if (cellToBool(oa) === true) {
    specs.push({ code: MemberDistinctionCode.outstandingAlumni, mark_key: '', label_th: null })
  }

  const yearRaw = cellToString(get('ศิษย์เก่าดีเด่น (ปี พ.ศ.)'))
  const yearKey = normalizeBuddhistYearKey(yearRaw)
  if (yearKey) {
    specs.push({
      code: MemberDistinctionCode.outstandingAlumniYear,
      mark_key: yearKey,
      label_th: `ศิษย์เก่าดีเด่น ปี พ.ศ. ${yearKey}`,
    })
  }

  const progRaw = cellToString(get('ศิษย์เก่าดีเด่น (โปรแกรม)'))
  const progKey = normalizeOutstandingProgramKey(progRaw)
  if (progKey) {
    const meta = KNOWN_OUTSTANDING_PROGRAM_KEYS[progKey]
    specs.push({
      code: MemberDistinctionCode.outstandingProgram,
      mark_key: progKey,
      label_th: meta?.label_th ?? progKey,
    })
  }

  const base = get('ฐานสถานะศิษย์เก่า')
  if (cellToBool(base) === true) {
    specs.push({ code: MemberDistinctionCode.alumniBase, mark_key: '', label_th: 'ฐานสถานะศิษย์เก่า' })
  }

  return dedupeDistinctionSpecs(specs)
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return String(v)
  const s = String(v).trim()
  return s === '' ? null : s
}

function cellToBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number' && Number.isFinite(v)) return v !== 0
  const s = String(v).trim().toLowerCase()
  if (['y', 'yes', 't', 'true', '1', 'ใช่', 'ใช้', 'x', '✓', 'v'].includes(s)) return true
  if (['n', 'no', 'f', 'false', '0', 'ไม่', '-'].includes(s)) return false
  return null
}

export function dedupeDistinctionSpecs(specs: DistinctionSpec[]): DistinctionSpec[] {
  const seen = new Set<string>()
  const out: DistinctionSpec[] = []
  for (const s of specs) {
    const k = `${s.code}\0${s.mark_key}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

/** จาก requested_data ตอนสมัคร (คีย์อังกฤษ snake_case) */
export function distinctionSpecsFromRegistrationData(data: Record<string, unknown>): DistinctionSpec[] {
  const specs: DistinctionSpec[] = []
  if (pickBool(data, 'batch_president') === true) {
    specs.push({ code: MemberDistinctionCode.batchPresident, mark_key: '', label_th: null })
  }
  if (pickBool(data, 'outstanding_alumni') === true) {
    specs.push({ code: MemberDistinctionCode.outstandingAlumni, mark_key: '', label_th: null })
  }
  const y = normalizeBuddhistYearKey(pickStr(data, 'outstanding_alumni_year'))
  if (y) {
    specs.push({
      code: MemberDistinctionCode.outstandingAlumniYear,
      mark_key: y,
      label_th: `ศิษย์เก่าดีเด่น ปี พ.ศ. ${y}`,
    })
  }
  const pk = normalizeOutstandingProgramKey(pickStr(data, 'outstanding_program'))
  if (pk) {
    const meta = KNOWN_OUTSTANDING_PROGRAM_KEYS[pk]
    specs.push({
      code: MemberDistinctionCode.outstandingProgram,
      mark_key: pk,
      label_th: meta?.label_th ?? pk,
    })
  }
  if (pickBool(data, 'alumni_base') === true) {
    specs.push({ code: MemberDistinctionCode.alumniBase, mark_key: '', label_th: 'ฐานสถานะศิษย์เก่า' })
  }
  return dedupeDistinctionSpecs(specs)
}

function pickStr(d: Record<string, unknown>, key: string): string | null {
  const v = d[key]
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  return String(v).trim() || null
}

function pickBool(d: Record<string, unknown>, key: string): boolean | null {
  const v = d[key]
  if (v === true || v === false) return v
  if (v === 1 || v === '1' || v === 'true') return true
  if (v === 0 || v === '0' || v === 'false') return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (['y', 'yes', 'ใช่'].includes(s)) return true
    if (['n', 'no', 'ไม่'].includes(s)) return false
  }
  return null
}

export async function replaceMemberDistinctions(
  supabase: SupabaseClient,
  memberId: string,
  specs: DistinctionSpec[],
): Promise<{ error: Error | null }> {
  const { error: delErr } = await supabase.from('member_distinctions').delete().eq('member_id', memberId)
  if (delErr) return { error: new Error(delErr.message) }
  if (!specs.length) return { error: null }
  const rows = specs.map((s) => ({
    member_id: memberId,
    code: s.code,
    mark_key: s.mark_key ?? '',
    label_th: s.label_th,
  }))
  const { error: insErr } = await supabase.from('member_distinctions').insert(rows)
  if (insErr) return { error: new Error(insErr.message) }
  return { error: null }
}

export async function fetchDistinctionsByMemberIds(
  supabase: SupabaseClient,
  memberIds: string[],
): Promise<Map<string, DistinctionRow[]>> {
  const map = new Map<string, DistinctionRow[]>()
  if (!memberIds.length) return map
  const { data, error } = await supabase
    .from('member_distinctions')
    .select('id,member_id,code,mark_key,label_th')
    .in('member_id', memberIds)
  if (error || !data) return map
  for (const row of data as DistinctionRow[]) {
    const list = map.get(row.member_id) ?? []
    list.push(row)
    map.set(row.member_id, list)
  }
  return map
}

export type DirectoryDistinctionRollup = {
  batch_president: boolean
  outstanding_alumni: boolean
  distinctions: DistinctionRow[]
  /** สรุปข้อความสั้น ๆ สำหรับตาราง */
  distinction_summary: string
}

export function rollupDistinctions(rows: DistinctionRow[]): DirectoryDistinctionRollup {
  const batch_president = rows.some((r) => r.code === MemberDistinctionCode.batchPresident)
  const outstanding_alumni = rows.some(
    (r) =>
      r.code === MemberDistinctionCode.outstandingAlumni ||
      r.code === MemberDistinctionCode.outstandingAlumniYear ||
      r.code === MemberDistinctionCode.outstandingProgram,
  )
  const parts: string[] = []
  for (const r of rows) {
    if (r.code === MemberDistinctionCode.batchPresident) parts.push('ประธานรุ่น')
    else if (r.code === MemberDistinctionCode.outstandingAlumni) parts.push('ดีเด่น')
    else if (r.code === MemberDistinctionCode.outstandingAlumniYear) parts.push(`ดีเด่น ${r.mark_key}`)
    else if (r.code === MemberDistinctionCode.outstandingProgram)
      parts.push(r.label_th ?? r.mark_key ?? 'โปรแกรม')
    else if (r.code === MemberDistinctionCode.alumniBase) parts.push('ฐานสถานะ')
    else parts.push(r.code)
  }
  const distinction_summary = parts.length ? [...new Set(parts)].join(', ') : '—'
  return {
    batch_president,
    outstanding_alumni,
    distinctions: rows,
    distinction_summary,
  }
}

/** ลบเฉพาะประธานรุ่นทุกคนในรุ่น แล้วใส่ให้ memberId */
export async function setBatchPresidentDistinctionForBatch(
  supabase: SupabaseClient,
  batchStored: string,
  memberId: string,
): Promise<{ error: Error | null }> {
  const { data: mids, error: qErr } = await supabase.from('members').select('id').eq('batch', batchStored)
  if (qErr) return { error: new Error(qErr.message) }
  const ids = (mids ?? []).map((m: { id: string }) => m.id).filter(Boolean)
  if (!ids.length) return { error: null }
  const { error: dErr } = await supabase
    .from('member_distinctions')
    .delete()
    .in('member_id', ids)
    .eq('code', MemberDistinctionCode.batchPresident)
  if (dErr) return { error: new Error(dErr.message) }
  const { error: iErr } = await supabase.from('member_distinctions').insert({
    member_id: memberId,
    code: MemberDistinctionCode.batchPresident,
    mark_key: '',
    label_th: null,
  })
  if (iErr) return { error: new Error(iErr.message) }
  return { error: null }
}
