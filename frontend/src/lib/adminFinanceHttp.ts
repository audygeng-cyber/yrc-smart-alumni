/** Header สำหรับ `fetch` ไปที่ `/api/admin/finance/*` (Admin key) */
export function financeAdminHeaders(adminKey: string): HeadersInit {
  return { 'x-admin-key': adminKey.trim() }
}

/** GET/POST JSON ไป finance admin — รวม Content-Type */
export function financeAdminJsonHeaders(adminKey: string): HeadersInit {
  return {
    'x-admin-key': adminKey.trim(),
    'Content-Type': 'application/json',
  }
}
