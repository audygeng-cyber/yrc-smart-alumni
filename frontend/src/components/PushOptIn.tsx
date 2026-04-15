import { useState } from 'react'
import { subscribePushNotifications } from '../pushClient'

type Props = { apiBase: string }

export function PushOptIn({ apiBase }: Props) {
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onEnable() {
    setLoading(true)
    setMsg(null)
    try {
      const m = await subscribePushNotifications(apiBase)
      setMsg(m)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-left">
      <h3 className="text-sm font-medium text-slate-300">การแจ้งเตือน (Web Push)</h3>
      <p className="mt-1 text-xs text-slate-500">
        ใช้ได้เมื่อ backend ตั้งค่า VAPID และรัน migration ตาราง push_subscriptions — แจ้งเมื่อมีคำร้องสมาชิกใหม่
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onEnable()}
        className="mt-3 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
      >
        {loading ? 'กำลังเปิด…' : 'เปิดการแจ้งเตือนในเบราว์เซอร์นี้'}
      </button>
      {msg && <p className="mt-3 text-sm text-emerald-300/90">{msg}</p>}
    </div>
  )
}
