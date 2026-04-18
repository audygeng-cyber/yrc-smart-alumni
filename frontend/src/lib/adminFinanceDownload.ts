import { financeAdminHeaders } from './adminFinanceHttp'

/** GET ไปที่ path (รวม query) พร้อม x-admin-key — ใช้กับ blob / CSV / ข้อความ */
export function fetchFinanceAdminRaw(
  base: string,
  pathWithQuery: string,
  adminKey: string,
): Promise<Response> {
  return fetch(`${base}${pathWithQuery}`, { headers: financeAdminHeaders(adminKey) })
}

/** สร้างลิงก์ชั่วคราวแล้วคลิกดาวน์โหลด (เบราว์เซอร์) */
export function triggerBrowserFileDownload(blob: Blob, downloadFilename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadFilename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * GET แล้วดาวน์โหลดเป็นไฟล์เมื่อ HTTP ok
 * เมื่อไม่ ok คืน body เป็นข้อความ (อ่านจาก blob เดิม)
 */
export async function downloadBlobFromAdminGet(
  base: string,
  pathWithQuery: string,
  adminKey: string,
  downloadFilename: string,
): Promise<{ ok: true } | { ok: false; status: number; errorText: string }> {
  const r = await fetchFinanceAdminRaw(base, pathWithQuery, adminKey)
  const blob = await r.blob()
  if (!r.ok) {
    const errorText = await blob.text().catch(() => '')
    return { ok: false, status: r.status, errorText }
  }
  triggerBrowserFileDownload(blob, downloadFilename)
  return { ok: true }
}
