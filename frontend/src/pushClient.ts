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

export async function subscribePushNotifications(apiBase: string): Promise<string> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'เบราว์เซอร์นี้ไม่รองรับ Web Push'
  }

  const r = await fetch(`${apiBase}/api/push/vapid-public`)
  if (r.status === 503) {
    return 'ยังไม่ตั้งค่า VAPID บน server (ดู README)'
  }
  const { publicKey } = (await r.json()) as { publicKey?: string }
  if (!publicKey) {
    return 'ไม่ได้รับ VAPID public key'
  }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    return 'ไม่ได้รับอนุญาตแจ้งเตือน'
  }

  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  await navigator.serviceWorker.ready

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

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
