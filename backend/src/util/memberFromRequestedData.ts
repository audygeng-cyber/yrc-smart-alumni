import type { MemberRow } from './memberImportMap.js'

const MEMBER_KEYS: (keyof MemberRow)[] = [
  'row_number',
  'member_code',
  'student_id',
  'batch',
  'batch_name',
  'batch_year',
  'title',
  'first_name',
  'last_name',
  'birth_date',
  'joined_date',
  'nickname',
  'house_number',
  'alley',
  'moo',
  'village',
  'road',
  'subdistrict',
  'district',
  'province',
  'postal_code',
  'phone',
  'email',
  'line_display_id',
  'membership_status',
  'photo_url',
]

function pickString(d: Record<string, unknown>, key: string): string | null {
  const v = d[key]
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  return String(v)
}

function pickInt(d: Record<string, unknown>, key: string): number | null {
  const v = d[key]
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

/** สร้างแถวสำหรับ insert เข้า members จากคำร้องสมัครใหม่ (หลังประธานรุ่น + Admin อนุมัติครบแล้วเท่านั้น) */
export function memberInsertFromRequestedData(
  line_uid: string,
  requested_data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    line_uid,
    organization: 'alumni',
    /** ค่าเริ่มต้น Active — สมาชิกถือว่า active ในทะเบียนหลังคำร้องผ่านลำดับอนุมัติแล้ว */
    membership_status: pickString(requested_data, 'membership_status') ?? 'Active',
  }

  for (const key of MEMBER_KEYS) {
    if (key === 'membership_status') continue
    if (key === 'row_number') {
      const n = pickInt(requested_data, 'row_number')
      if (n !== null) out.row_number = n
      continue
    }
    const s = pickString(requested_data, key as string)
    if (s !== null) out[key] = s
  }

  return out
}
