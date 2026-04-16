const SW_PATH = '/sw.js'

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent ?? ''
  const platform = navigator.platform ?? ''
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false

  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true
}

export function getPushSupportHint(): string | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  if (!window.isSecureContext) return 'การแจ้งเตือนต้องเปิดผ่าน HTTPS หรือ localhost เท่านั้น'
  if (!('serviceWorker' in navigator)) return 'เบราว์เซอร์นี้ไม่รองรับ Service Worker'
  if (!('Notification' in window)) return 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน'
  if (isIosDevice() && !isStandaloneDisplayMode()) {
    return 'บน iPhone/iPad ต้องกด Share > Add to Home Screen แล้วเปิดแอปจากไอคอนบนหน้าจอหลักก่อน จึงจะเปิดการแจ้งเตือนได้'
  }
  return null
}

export async function subscribePushNotifications(apiBase: string): Promise<string> {
  const hint = getPushSupportHint()
  if (hint) return hint

  const r = await fetch(`${apiBase}/api/push/vapid-public`)
  if (r.status === 503) {
    return 'ยังไม่ตั้งค่า VAPID บน server (ดู README)'
  }
  const { publicKey } = (await r.json()) as { publicKey?: string }
  if (!publicKey) {
    return 'ไม่ได้รับ VAPID public key'
  }

  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  await navigator.serviceWorker.ready

  if (!reg.pushManager || typeof reg.pushManager.subscribe !== 'function') {
    return isIosDevice()
      ? 'อุปกรณ์นี้ยังไม่พร้อมสำหรับ Web Push กรุณาเปิดเว็บจาก Home Screen app แล้วลองใหม่'
      : 'เบราว์เซอร์นี้ยังไม่รองรับ Web Push'
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return 'ไม่ได้รับอนุญาตแจ้งเตือน'
  }

  const existingSub = await reg.pushManager.getSubscription()
  const sub =
    existingSub ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const j = sub.toJSON()
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) {
    return 'สร้าง subscription ไม่สำเร็จ'
  }

  const post = await fetch(`${apiBase}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: j.endpoint,
      keys: { p256dh: j.keys.p256dh, auth: j.keys.auth },
    }),
  })

  if (!post.ok) {
    const err = await post.json().catch(() => ({}))
    return `บันทึก subscription ล้มเหลว: ${JSON.stringify(err)}`
  }

  return 'เปิดการแจ้งเตือนแล้ว — เมื่อมีคำร้องสมาชิกใหม่จะแจ้งเตือน'
}
