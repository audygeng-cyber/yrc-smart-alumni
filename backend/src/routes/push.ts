import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { getVapidPublicKey } from '../lib/webPush.js'

export const pushRouter = Router()

/** Public key สำหรับ subscribe ฝั่ง browser */
pushRouter.get('/vapid-public', (_req, res) => {
  const key = getVapidPublicKey()
  if (!key) {
    res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า VAPID บนเซิร์ฟเวอร์' })
    return
  }
  res.json({ publicKey: key })
})

/**
 * ลงทะเบียน subscription หลังได้ permission + subscription จาก PushManager
 * body: { endpoint, keys: { p256dh, auth } }
 */
pushRouter.post('/subscribe', async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
    const keys = body.keys as Record<string, unknown> | undefined
    const p256dh = keys && typeof keys.p256dh === 'string' ? keys.p256dh.trim() : ''
    const auth = keys && typeof keys.auth === 'string' ? keys.auth.trim() : ''

    if (!endpoint || !p256dh || !auth) {
      res.status(400).json({ error: 'ต้องระบุ endpoint และ keys.p256dh, keys.auth' })
      return
    }

    const supabase = getServiceSupabase()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
      },
      { onConflict: 'endpoint' },
    )

    if (error) {
      res.status(500).json({ error: 'บันทึก subscription ไม่สำเร็จ', details: error })
      return
    }

    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
