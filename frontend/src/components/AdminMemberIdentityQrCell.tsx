import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { portalFocusRing } from '../portal/portalLabels'

/** QR ขนาดเล็กสำหรับตารางทะเบียน Admin — ค่า `value` คือ URL เต็มที่ฝังใน QR */
export function AdminMemberIdentityQrCell({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (!value) {
      setDataUrl(null)
      setErr(false)
      return
    }
    let cancelled = false
    setErr(false)
    setDataUrl(null)
    QRCode.toDataURL(value, { width: 52, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setErr(true)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  if (!value) {
    return <span className="text-slate-600">—</span>
  }
  if (err || !dataUrl) {
    return <span className="text-[10px] text-slate-500">{err ? 'QR ผิดพลาด' : '…'}</span>
  }
  return (
    <img
      src={dataUrl}
      alt=""
      width={52}
      height={52}
      className="rounded border border-slate-700 bg-white p-0.5"
      decoding="async"
    />
  )
}

type CopyBtnProps = { url: string; label?: string }

export function CopyIdentityScanUrlButton({ url, label = 'คัดลอกลิงก์' }: CopyBtnProps) {
  const [done, setDone] = useState(false)
  if (!url) return null
  return (
    <button
      type="button"
      className={`mt-1 block text-[10px] font-medium text-fuchsia-300 hover:text-fuchsia-200 ${portalFocusRing}`}
      onClick={() => {
        void navigator.clipboard.writeText(url).then(
          () => {
            setDone(true)
            window.setTimeout(() => setDone(false), 2000)
          },
          () => {
            window.alert('คัดลอกไม่สำเร็จ — ลองเลือกลิงก์ด้วยมือหรือใช้ HTTPS')
          },
        )
      }}
    >
      {done ? 'คัดลอกแล้ว' : label}
    </button>
  )
}
