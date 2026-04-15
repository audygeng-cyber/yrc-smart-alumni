import { useState } from 'react'

type Props = { apiBase: string }

export function MemberLinkPanel({ apiBase }: Props) {
  const [lineUid, setLineUid] = useState('')
  const [batch, setBatch] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

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
      if (r.status === 404 && j.code === 'NOT_IN_REGISTRY') {
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
      setMsg(r.ok ? `ส่งคำร้องแล้ว requestId=${j.requestId}` : JSON.stringify(j, null, 2))
      if (r.ok) setShowRegister(false)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
        ผูกบัญชี (ทดสอบ — ใส่ Line UID เอง)
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ภายหลังจะเปลี่ยนเป็น LINE Login จริง แล้วส่ง id_token ให้ backend ตรวจ
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Line UID" value={lineUid} onChange={setLineUid} />
        <Field label="รุ่น" value={batch} onChange={setBatch} />
        <Field label="ชื่อ" value={firstName} onChange={setFirstName} />
        <Field label="นามสกุล" value={lastName} onChange={setLastName} />
      </div>
      <button
        type="button"
        disabled={loading}
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
            disabled={loading}
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
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-700"
      />
    </label>
  )
}
