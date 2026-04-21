/**
 * คืน URL สำหรับใช้ใน <img src> เฉพาะเมื่อเป็น http/https — กัน scheme อื่น (เช่น javascript:)
 */
export function safeHttpImageUrl(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}
