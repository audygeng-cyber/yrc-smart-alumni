/** Shared helpers for admin `fetch` flows (import, school-activities, cram, etc.). */

export type ApiJsonResult = {
  status: number
  ok: boolean
  payload: unknown
  rawText: string
}

/** Read body as text then parse JSON — if not JSON, payload is null but status + rawText remain for debugging. */
export async function readApiJson(r: Response): Promise<ApiJsonResult> {
  const rawText = await r.text()
  let payload: unknown = null
  const trimmed = rawText.trim()
  if (trimmed) {
    try {
      payload = JSON.parse(trimmed) as unknown
    } catch {
      payload = null
    }
  }
  return { status: r.status, ok: r.ok, payload, rawText }
}

export type FormatFetchErrorOptions = {
  /** Truncate raw body in the message (e.g. import uploads). Omit for full text. */
  maxRawLength?: number
  /** Extra hint when 404 on import/summary endpoints. */
  include404ImportHint?: boolean
}

export function formatFetchError(
  label: string,
  status: number,
  payload: unknown,
  rawText: string,
  options?: FormatFetchErrorOptions,
): string {
  const jsonPart =
    payload !== null && payload !== undefined ? JSON.stringify(payload, null, 2) : '(ไม่ใช่ JSON หรือ body ว่าง)'
  const maxRaw = options?.maxRawLength
  const snippet = !rawText.trim()
    ? '(ไม่มี body)'
    : maxRaw != null && rawText.length > maxRaw
      ? `${rawText.slice(0, maxRaw)}…`
      : rawText
  const hint404 =
    options?.include404ImportHint && status === 404
      ? '\n\nถ้าเป็น 404: มักหมายความว่า API บน Cloud Run (ค่า VITE_API_URL) ยังไม่ใช่เวอร์ชันล่าสุด — ให้ build + deploy backend แล้วลองใหม่\nเส้นทางแผงนำเข้า/ทะเบียนที่ต้องมีบน API: GET /api/admin/members/directory, GET /api/admin/members/summary, PATCH /api/admin/members/:id/directory-flags, POST /api/admin/members/import'
      : ''
  return `${label} ไม่สำเร็จ — HTTP ${status}\n${jsonPart}\n\nดิบจากเซิร์ฟเวอร์:\n${snippet}${hint404}`
}
