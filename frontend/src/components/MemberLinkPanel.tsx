import { useState } from 'react'
import { HEADER_TO_MEMBER_KEY, MEMBER_REGISTER_EXTRA_HEADERS, MEMBER_SELF_EDIT_HEADERS } from '../memberImportMap'

type Props = {
  apiBase: string
  lineUid: string
  lineUidFromOAuth: boolean
  onLineUidChange: (v: string) => void
  onClearLineSession: () => void
  lineLoginAvailable: boolean
  onStartLineLogin: () => void
}

type MemberRow = Record<string, unknown>

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

  const [linkedMember, setLinkedMember] = useState<MemberRow | null>(null)
  const [selfEdit, setSelfEdit] = useState<Record<string, string>>({})

  const [registerExtra, setRegisterExtra] = useState<Record<string, string>>(() =>
    Object.fromEntries(MEMBER_REGISTER_EXTRA_HEADERS.map((h) => [h, ''])),
  )

  function fillSelfEditFromMember(m: MemberRow) {
    const next: Record<string, string> = {}
    for (const h of MEMBER_SELF_EDIT_HEADERS) {
      const k = HEADER_TO_MEMBER_KEY[h]
      if (!k) continue
      const v = m[k]
      next[h] = v == null || v === '' ? '' : String(v)
    }
    setSelfEdit(next)
  }

  async function verifyLink() {
    setLoading(true)
    setMsg(null)
    setShowRegister(false)
    setLinkedMember(null)
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
      const j = (await r.json().catch(() => ({}))) as {
        code?: string
        member?: MemberRow
        error?: string
      }
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
      if (j.member && typeof j.member === 'object') {
        setLinkedMember(j.member)
        fillSelfEditFromMember(j.member)
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function submitSelfUpdate() {
    setLoading(true)
    setMsg(null)
    try {
      const updates: Record<string, string> = {}
      for (const [h, v] of Object.entries(selfEdit)) {
        if (v.trim() !== '') updates[h] = v.trim()
      }
      const r = await fetch(`${apiBase}/api/members/update-self`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          updates,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setMsg(JSON.stringify(j, null, 2))
      if ((j as { member?: MemberRow }).member) {
        setLinkedMember((j as { member: MemberRow }).member)
        fillSelfEditFromMember((j as { member: MemberRow }).member)
      }
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
      const body: Record<string, string> = {
        line_uid: lineUid.trim(),
        batch: batch.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }
      for (const h of MEMBER_REGISTER_EXTRA_HEADERS) {
        const v = registerExtra[h]?.trim()
        if (v) body[h] = v
      }
      const r = await fetch(`${apiBase}/api/members/register-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

      <p className="mt-4 text-xs text-slate-500">
        ตรวจสอบว่ามีในทะเบียนหรือไม่ — ต้องตรงกับข้อมูลที่ Admin นำเข้า (รุ่น · ชื่อ · นามสกุล)
      </p>
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

      {linkedMember ? (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-medium text-slate-300">แก้ไขข้อมูลเพิ่มเติม (ตามหัวตารางนำเข้า)</h3>
          <p className="mt-1 text-xs text-slate-500">
            รุ่น · ชื่อ · นามสกุล แก้ได้เฉพาะผ่านผู้ดูแล — ช่องด้านล่างสำหรับข้อมูลอื่น
          </p>
          <div className="mt-4 grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {MEMBER_SELF_EDIT_HEADERS.map((h) => (
              <Field
                key={h}
                label={h}
                value={selfEdit[h] ?? ''}
                onChange={(v) => setSelfEdit((prev) => ({ ...prev, [h]: v }))}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={loading || !lineUid.trim()}
            onClick={submitSelfUpdate}
            className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            บันทึกข้อมูลเพิ่มเติม
          </button>
        </div>
      ) : null}

      {showRegister && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-medium text-slate-300">สมัครสมาชิกใหม่ (คำร้อง)</h3>
          <p className="mt-1 text-xs text-slate-500">
            กรอกรุ่น · ชื่อ · นามสกุล และรายละเอียดอื่นตามที่มี — ส่งแล้วรอประธานรุ่น / Admin อนุมัติ
          </p>
          <div className="mt-4 grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {MEMBER_REGISTER_EXTRA_HEADERS.map((h) => (
              <Field
                key={h}
                label={h}
                value={registerExtra[h] ?? ''}
                onChange={(v) => setRegisterExtra((prev) => ({ ...prev, [h]: v }))}
              />
            ))}
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
