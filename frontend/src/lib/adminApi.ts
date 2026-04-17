/** sessionStorage key สำหรับ x-admin-key — ใช้ร่วมกันทุกแผง Admin */
export const ADMIN_UPLOAD_STORAGE_KEY = 'yrc_admin_upload_key'

export function normalizeApiBase(base: string): string {
  return base.trim().replace(/\/+$/, '')
}

/** Header สำหรับ fetch JSON ที่ต้องการ x-admin-key (ว่างได้ถ้ายังไม่ใส่ key) */
export function adminJsonHeaders(adminKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const k = adminKey.trim()
  if (k) h['x-admin-key'] = k
  return h
}
