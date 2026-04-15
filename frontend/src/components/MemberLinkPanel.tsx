import { useState } from 'react'

type Props = {
  apiBase: string
  lineUid: string
  lineUidFromOAuth: boolean
  onLineUidChange: (v: string) => void
  onClearLineSession: () => void
  lineLoginAvailable: boolean
  onStartLineLogin: () => void
}

export function MemberLinkPanel({
  apiBase,
  lineUid,
  lineUidFromOAuth,
  onLineUidChange,
  onClearLineSession,
  lineLoginAvailable,
  onStartLineLogin,
}: Props) {
  const [batch, setBatch] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showManualUid, setShowManualUid] = useState(!lineLoginAvailable)

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  async function verifyLink() {
    setLoading(true)
    setMsg(null)
    setShowRegister(false)
    try {
      const r = await fetch(`${apiBase}/api/members/verify-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          batch: batch.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 404 && (j as { code?: string }).code === 'NOT_IN_REGISTRY') {
        setMsg('ไม่พบในทะเบียน — กรอกแบบฟอร์มสมัครใหม่ด้านล่าง')
        setShowRegister(true)
        return
      }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setMsg(JSON.stringify(j, null, 2))
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function submitRegister() {
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${apiBase}/api/members/register-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          batch: batch.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      setMsg(r.ok ? `ส่งคำร้องแล้ว requestId=${(j as { requestId?: string }).requestId}` : JSON.stringify(j, null, 2))
      if (r.ok) setShowRegister(false)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">ผูกบัญชีสมาชิก</h2>

      {lineLoginAvailable ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onStartLineLogin}
            className="w-full rounded-lg bg-[#06C755] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            เข้าสู่ระบบด้วย LINE
          </button>
          {lineUidFromOAuth && lineUid ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm">
              <p className="text-slate-400">Line UID (จาก LINE)</p>
              <p className="mt-1 break-all font-mono text-emerald-300">{lineUid}</p>
              <button
                type="button"
                onClick={onClearLineSession}
                className="mt-3 text-xs text-amber-400 underline hover:text-amber-300"
              >
                ออกจากบัญชี LINE นี้
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowManualUid((v) => !v)}
            className="text-xs text-slate-500 underline hover:text-slate-400"
          >
            {showManualUid ? 'ซ่อนการใส่ Line UID เอง (ทดสอบ)' : 'ทดสอบ — ใส่ Line UID เอง'}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-200/80">
          ยังไม่ได้ตั้งค่า VITE_LINE_CHANNEL_ID / VITE_LINE_REDIRECT_URI — ใช้การใส่ Line UID ด้านล่างได้
        </p>
      )}

      {(showManualUid || !lineLoginAvailable) && (
        <label className="mt-4 block text-sm text-slate-300">
          Line UID {lineUidFromOAuth ? '' : '(ทดสอบ)'}
          <input
            value={lineUid}
            onChange={(e) => onLineUidChange(e.target.value)}
            readOnly={lineUidFromOAuth && !showManualUid}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none read-only:opacity-80 focus:border-emerald-700"
            placeholder="ได้หลังเข้า LINE หรือใส่เองเมื่อ dev"
          />
        </label>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="รุ่น" value={batch} onChange={setBatch} />
        <Field label="ชื่อ" value={firstName} onChange={setFirstName} />
        <Field label="นามสกุล" value={lastName} onChange={setLastName} className="sm:col-span-2" />
      </div>
      <button
        type="button"
        disabled={loading || !lineUid.trim()}
        onClick={verifyLink}
        className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        ตรวจสอบและผูก
      </button>

      {showRegister && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-medium text-slate-300">สมัครสมาชิกใหม่ (คำร้อง)</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="เบอร์โทร (ถ้ามี)" value={phone} onChange={setPhone} />
            <Field label="อีเมล (ถ้ามี)" value={email} onChange={setEmail} />
          </div>
          <button
            type="button"
            disabled={loading || !lineUid.trim()}
            onClick={submitRegister}
            className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
          >
            ส่งคำร้องสมัครใหม่
          </button>
        </div>
      )}

      {msg && (
        <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-emerald-200/90">
          {msg}
        </pre>
      )}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <label className={`block text-sm text-slate-300 ${className}`}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-700"
      />
    </label>
  )
}
