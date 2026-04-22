/**
 * โทเคน QR ประจำตัว — เก็บในคอลัมน์ `members.member_identity_qr_token` (UUID ไม่ซ้ำ)
 * ไม่มีตาราง QR แยก: ภาพ QR สร้างจาก URL ที่มี query `t`
 */

/** สอดคล้อง `electionPublic.parseUuid` — รับ UUID ที่ใช้ใน query `t` */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** อ่านค่า UUID จากแถว members (รองรับ string จาก PostgREST) */
export function readMemberIdentityQrToken(row: Record<string, unknown>): string | null {
  const v = row.member_identity_qr_token
  if (v == null || v === '') return null
  const s = (typeof v === 'string' ? v.trim() : String(v).trim()).toLowerCase()
  if (!s) return null
  return UUID_RE.test(s) ? s : null
}
