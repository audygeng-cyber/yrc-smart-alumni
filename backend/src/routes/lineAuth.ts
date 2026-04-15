import { Router } from 'express'

const LINE_TOKEN = 'https://api.line.me/oauth2/v2.1/token'
const LINE_VERIFY = 'https://api.line.me/oauth2/v2.1/verify'

function allowedRedirectUris(): string[] {
  const raw = process.env.LINE_REDIRECT_URIS ?? process.env.LINE_REDIRECT_URI ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
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
      res.status(400).json({ error: 'code and redirect_uri are required' })
      return
    }

    const allow = allowedRedirectUris()
    if (allow.length === 0) {
      res.status(500).json({ error: 'LINE_REDIRECT_URIS (or LINE_REDIRECT_URI) is not configured' })
      return
    }

    if (!allow.includes(redirect_uri)) {
      res.status(400).json({
        error: 'redirect_uri not allowed',
        allowed: allow,
      })
      return
    }

    const clientId = process.env.LINE_CHANNEL_ID
    const clientSecret = process.env.LINE_CHANNEL_SECRET
    if (!clientId || !clientSecret) {
      res.status(500).json({ error: 'LINE_CHANNEL_ID / LINE_CHANNEL_SECRET not configured' })
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
      res.status(502).json({ error: 'no_id_token in LINE response', details: tokenJson })
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
      res.status(502).json({ error: 'no sub in LINE verify response', details: verifyJson })
      return
    }

    res.json({
      line_uid: sub,
      name: typeof verifyJson.name === 'string' ? verifyJson.name : null,
      picture: typeof verifyJson.picture === 'string' ? verifyJson.picture : null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
