import crypto from 'node:crypto'

const STATE_TTL_MS = 15 * 60 * 1000

function signingSecret(): string {
  return (
    process.env.LINE_OAUTH_STATE_SECRET?.trim() ||
    process.env.LINE_CHANNEL_SECRET?.trim() ||
    ''
  )
}

/** สร้าง state สำหรับ LINE OAuth — ใช้แทน sessionStorage เพื่อรองรับมือถือ (WebView vs Safari คนละ storage) */
export function createSignedLineOAuthState(): string | null {
  const secret = signingSecret()
  if (!secret) return null
  const nonce = crypto.randomBytes(16).toString('base64url')
  const exp = Date.now() + STATE_TTL_MS
  const payload = `${nonce}.${exp}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySignedLineOAuthState(state: string): boolean {
  const secret = signingSecret()
  if (!secret || !state) return false
  const lastDot = state.lastIndexOf('.')
  if (lastDot <= 0) return false
  const payload = state.slice(0, lastDot)
  const sig = state.slice(lastDot + 1)
  if (!payload.includes('.') || !sig) return false
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  try {
    if (!crypto.timingSafeEqual(a, b)) return false
  } catch {
    return false
  }
  const expSep = payload.indexOf('.')
  const exp = Number(payload.slice(expSep + 1))
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  return true
}
