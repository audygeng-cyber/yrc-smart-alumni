import { HEADER_TO_DB, type MemberRow } from './memberImportMap.js'

/** ฟิลด์ที่สมาชิกแก้เองไม่ได้ */
const LOCKED = new Set<keyof MemberRow>([
  'batch',
  'first_name',
  'last_name',
  'line_uid',
  'organization',
  'import_batch_id',
  'row_number',
])

const ALLOWED_DB_KEYS = new Set(
  Object.values(HEADER_TO_DB).filter((k) => !LOCKED.has(k)),
) as Set<keyof MemberRow>

function trimOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * รับ body จากฟอร์ม (หัวคอลัมน์ภาษาไทย หรือชื่อฟิลด์ DB) → ค่าที่จะอัปเดต
 */
export function parseMemberSelfUpdates(raw: Record<string, unknown>): Partial<MemberRow> {
  const out: Partial<MemberRow> = {}

  for (const [keyRaw, val] of Object.entries(raw)) {
    const k = keyRaw.trim()
    let dbKey: keyof MemberRow | undefined = HEADER_TO_DB[k]
    if (!dbKey && ALLOWED_DB_KEYS.has(k as keyof MemberRow)) {
      dbKey = k as keyof MemberRow
    }
    if (!dbKey || !ALLOWED_DB_KEYS.has(dbKey)) continue

    const s = trimOrNull(val)
    ;(out as Record<string, unknown>)[dbKey] = s
  }

  return out
}
