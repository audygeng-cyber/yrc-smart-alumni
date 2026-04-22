import { normalizeWhitespace } from './normalize.js'

const MAX_FRAG = 120

/** ตัดอักขระที่ทำให้ PostgREST `.or()` / `ilike` พัง และจำกัดความยาว */
export function sanitizeIlikeFragment(raw: string): string {
  return normalizeWhitespace(raw)
    .replace(/[%_,()\\.]/g, '')
    .slice(0, MAX_FRAG)
}

export type MemberDirectoryView = 'person' | 'batch' | 'batch_presidents' | 'outstanding' | 'committee'

export function parseDirectoryView(v: string | undefined): MemberDirectoryView | null {
  const n = typeof v === 'string' ? v.trim() : ''
  if (n === 'person' || n === 'batch' || n === 'batch_presidents' || n === 'outstanding' || n === 'committee') return n
  return null
}
