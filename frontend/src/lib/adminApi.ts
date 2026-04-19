/** sessionStorage key สำหรับ x-admin-key — ใช้ร่วมกันทุกแผง Admin */
export const ADMIN_UPLOAD_STORAGE_KEY = 'yrc_admin_upload_key'

/** ฐาน API ต้องไม่ลงท้ายด้วย /api — โค้ดต่อ path เป็น /api/... เอง */
export function normalizeApiBase(base: string): string {
  let b = base.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) {
    b = b.slice(0, -4).replace(/\/+$/, '')
  }
  return b
}

/** Header สำหรับ fetch JSON ที่ต้องการ x-admin-key (ว่างได้ถ้ายังไม่ใส่ key) */
export function adminJsonHeaders(adminKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const k = adminKey.trim()
  if (k) h['x-admin-key'] = k
  return h
}
