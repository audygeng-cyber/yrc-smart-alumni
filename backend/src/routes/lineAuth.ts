import { Router } from 'express'

const LINE_TOKEN = 'https://api.line.me/oauth2/v2.1/token'
const LINE_VERIFY = 'https://api.line.me/oauth2/v2.1/verify'

/** ใน development/test ถ้าไม่ตั้ง env จะใช้ค่านี้ — production (เช่น Docker) ต้องตั้ง LINE_REDIRECT_URIS เอง */
const DEFAULT_DEV_LINE_REDIRECT_URIS = ['http://localhost:5173/', 'http://127.0.0.1:5173/']

function allowedRedirectUris(): string[] {
  const raw = process.env.LINE_REDIRECT_URIS ?? process.env.LINE_REDIRECT_URI ?? ''
  const fromEnv = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv
  if (process.env.NODE_ENV === 'production') {
    return []
  }
  return DEFAULT_DEV_LINE_REDIRECT_URIS
}

export const lineAuthRouter = Router()

/**
 * แลก authorization code → ตรวจ id_token กับ LINE → คืน line_uid (sub)
 * redirect_uri ต้องตรงกับที่ลงทะเบียนใน LINE Developers และตรงกับที่ใช้ตอนขอ authorize
 */
lineAuthRouter.post('/token', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    const redirect_uri = typeof req.body?.redirect_uri === 'string' ? req.body.redirect_uri.trim() : ''

    if (!code || !redirect_uri) {
      res.status(400).json({ error: 'ต้องระบุ code และ redirect_uri' })
      return
    }

    const allow = allowedRedirectUris()
    if (allow.length === 0) {
      res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า LINE_REDIRECT_URIS (หรือ LINE_REDIRECT_URI)' })
      return
    }

    if (!allow.includes(redirect_uri)) {
      res.status(400).json({
        error: 'redirect_uri ไม่ได้รับอนุญาต',
        allowed: allow,
      })
      return
    }

    const clientId = process.env.LINE_CHANNEL_ID
    const clientSecret = process.env.LINE_CHANNEL_SECRET
    if (!clientId || !clientSecret) {
      res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ID / LINE_CHANNEL_SECRET' })
      return
    }

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
    })

    const tokenRes = await fetch(LINE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    })

    const tokenJson = (await tokenRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!tokenRes.ok) {
      res.status(401).json({ error: 'line_token_exchange_failed', details: tokenJson })
      return
    }

    const id_token = typeof tokenJson.id_token === 'string' ? tokenJson.id_token : ''
    if (!id_token) {
      res.status(502).json({ error: 'ไม่พบ id_token ในการตอบกลับจาก LINE', details: tokenJson })
      return
    }

    const verifyBody = new URLSearchParams({
      id_token,
      client_id: clientId,
    })

    const verifyRes = await fetch(LINE_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody,
    })

    const verifyJson = (await verifyRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!verifyRes.ok) {
      res.status(401).json({ error: 'line_id_token_verify_failed', details: verifyJson })
      return
    }

    const sub = typeof verifyJson.sub === 'string' ? verifyJson.sub : ''
    if (!sub) {
      res.status(502).json({ error: 'ไม่พบ sub ในการตอบกลับจาก LINE verify', details: verifyJson })
      return
    }

    res.json({
      line_uid: sub,
      name: typeof verifyJson.name === 'string' ? verifyJson.name : null,
      picture: typeof verifyJson.picture === 'string' ? verifyJson.picture : null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
