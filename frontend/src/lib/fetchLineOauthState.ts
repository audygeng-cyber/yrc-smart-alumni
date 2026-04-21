import { normalizeApiBase } from './adminApi'

export type LineOauthStateResult =
  | { ok: true; state: string; method: 'GET' | 'POST' }
  | { ok: false; status: number; detail: string; triedPost: boolean }

function looksLikeHtmlErrorPage(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.includes('cannot get /')
}

function parseStateJson(raw: string): { state?: string; error?: string } {
  try {
    return JSON.parse(raw) as { state?: string; error?: string }
  } catch {
    return {}
  }
}

/**
 * ดึง signed OAuth state จาก API — ลอง GET ก่อน (simple request / CORS บนมือถือ)
 * ถ้าได้ 404 หรือ HTML (เช่น route ยังไม่มีบน Cloud Run เก่า) จะลอง POST ซ้ำครั้งหนึ่ง
 */
export async function fetchLineOauthState(apiBase: string): Promise<LineOauthStateResult> {
  const url = `${normalizeApiBase(apiBase)}/api/auth/line/oauth-state`
  const opts = { cache: 'no-store' as const, mode: 'cors' as const }

  const tryOnce = async (method: 'GET' | 'POST'): Promise<{ status: number; raw: string; sj: { state?: string; error?: string } }> => {
    const r = await fetch(url, {
      method,
      ...opts,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? '{}' : undefined,
    })
    const raw = await r.text()
    const sj = parseStateJson(raw)
    return { status: r.status, raw, sj }
  }

  let first = await tryOnce('GET')
  let triedPost = false

  const noState = !first.sj.state?.trim()
  const shouldRetryPost =
    noState &&
    (first.status === 404 || first.status === 405 || looksLikeHtmlErrorPage(first.raw))

  if (shouldRetryPost) {
    triedPost = true
    first = await tryOnce('POST')
  }

  const detail =
    (typeof first.sj.error === 'string' && first.sj.error.trim()) ||
    (first.raw.trim().slice(0, 200) || first.status.toString() || 'ไม่ทราบสาเหตุ')

  if (!first.status.toString().startsWith('2') || !first.sj.state?.trim()) {
    return { ok: false, status: first.status, detail, triedPost }
  }

  return { ok: true, state: first.sj.state.trim(), method: triedPost ? 'POST' : 'GET' }
}
