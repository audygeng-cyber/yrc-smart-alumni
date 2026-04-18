/**
 * ใช้ร่วมกันสำหรับ UI ที่ **รีเฟรชข้อมูลอัตโนมัติ**: คำนวณเวลาจนถึง **ต้นชั่วโมงถัดไป**
 * ตามเวลาเครื่อง (เช่น 10:00, 11:00) — จับคู่กับการรันครั้งแรกทันทีเมื่อผู้ใช้เปิดโหมดรีเฟรช
 *
 * Milliseconds until the next local wall-clock hour boundary
 * (e.g. 10:23:45 → time until 11:00:00.000).
 */
export function msUntilNextHour(now: Date = new Date()): number {
  const next = new Date(now.getTime())
  next.setHours(next.getHours() + 1, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
