/**
 * ดึง object path ใน bucket จาก public URL ของ Supabase Storage
 * รูปแบบ: .../storage/v1/object/public/{bucketId}/{path}
 */
export function parseStoragePublicObjectPath(publicUrl: string, bucketId: string): string | null {
  const raw = typeof publicUrl === 'string' ? publicUrl.trim() : ''
  if (!raw) return null
  try {
    const u = new URL(raw)
    const marker = `/object/public/${bucketId}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    const rest = u.pathname.slice(idx + marker.length)
    if (!rest) return null
    const trimmed = rest.replace(/^\/+/, '')
    try {
      return decodeURIComponent(trimmed)
    } catch {
      return trimmed
    }
  } catch {
    return null
  }
}
