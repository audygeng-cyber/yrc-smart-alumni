/**
 * สมาชิกถือว่า "ใช้งานพอร์ทัลได้" เมื่อสถานะในทะเบียนเป็น Active (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
 * ค่าอื่น (Inactive, Pending, ฯลฯ) ถือว่ายังไม่ active
 */
export function isMemberMembershipActive(membershipStatus: unknown): boolean {
  if (membershipStatus == null) return false
  const s = String(membershipStatus).trim().toLowerCase()
  return s === 'active'
}
