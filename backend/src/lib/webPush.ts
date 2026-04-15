import webpush from 'web-push'
import { getServiceSupabase } from './supabase.js'

let vapidConfigured = false

function ensureVapid(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@localhost'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? ''
}

/** แจ้งผู้ที่ลงทะเบียน push ว่ามีคำร้องสมาชิกใหม่ */
export async function notifyNewMemberRequest(requestId: string): Promise<void> {
  if (!ensureVapid()) return

  const supabase = getServiceSupabase()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error || !subs?.length) return

  const payload = JSON.stringify({
    title: 'YRC Smart Alumni',
    body: `มีคำร้องสมาชิกใหม่ (${requestId.slice(0, 8)}…)`,
    url: '/',
    requestId,
  })

  for (const s of subs) {
    const sub = {
      endpoint: s.endpoint as string,
      keys: {
        p256dh: s.p256dh as string,
        auth: s.auth as string,
      },
    }
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600 })
    } catch (e: unknown) {
      const status = typeof e === 'object' && e !== null && 'statusCode' in e ? (e as { statusCode?: number }).statusCode : undefined
      if (status === 410 || status === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id as string)
      }
    }
  }
}
