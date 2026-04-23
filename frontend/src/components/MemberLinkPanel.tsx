import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MEMBER_REGISTER_EXTRA_HEADERS } from '../memberImportMap'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing } from '../portal/portalLabels'

type Props = {
  apiBase: string
  lineUid: string
  lineUidFromOAuth: boolean
  onLineUidChange: (v: string) => void
  onClearLineSession: () => void
  lineLoginAvailable: boolean
  onStartLineLogin: () => void
  /** เรียกเมื่อตรวจพบในทะเบียนและผูกสำเร็จ — ให้แอปเปิดหน้าสมาชิก */
  onMemberVerified?: (member: Record<string, unknown>) => void
}

type MemberRow = Record<string, unknown>
type RequestStatusRow = {
  id?: string
  request_type?: string
  status?: string
  created_at?: string
  president_approved_at?: string | null
  admin_approved_at?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  requested_data?: Record<string, unknown> | null
}

export function MemberLinkPanel({
  apiBase,
  lineUid,
  lineUidFromOAuth,
  onLineUidChange,
  onClearLineSession,
  lineLoginAvailable,
  onStartLineLogin,
  onMemberVerified,
}: Props) {
  const navigate = useNavigate()
  const manualUidPanelId = 'member-link-manual-uid-panel'
  const requestStatusSummaryId = 'member-link-request-status-summary'
  const verificationHintId = 'member-link-verification-hint'
  const [batch, setBatch] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [registryBatches, setRegistryBatches] = useState<string[] | undefined>(undefined)
  const [registryBatchesErr, setRegistryBatchesErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const isErrorMsg = msg !== null && (msg.includes('HTTP') || msg.includes('ไม่สำเร็จ'))
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showManualUid, setShowManualUid] = useState(!lineLoginAvailable)
  const [requestStatus, setRequestStatus] = useState<RequestStatusRow | null>(null)
  const [requestStatusLoading, setRequestStatusLoading] = useState(false)

  const [registerExtra, setRegisterExtra] = useState<Record<string, string>>(() =>
    Object.fromEntries(MEMBER_REGISTER_EXTRA_HEADERS.map((h) => [h, ''])),
  )

  const approvedRequestedNames = useMemo(() => {
    const raw = requestStatus?.requested_data
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const batchValue = typeof raw.batch === 'string' ? raw.batch.trim() : ''
    const firstNameValue = typeof raw.first_name === 'string' ? raw.first_name.trim() : ''
    const lastNameValue = typeof raw.last_name === 'string' ? raw.last_name.trim() : ''

    if (!batchValue || !firstNameValue || !lastNameValue) return null
    return {
      batch: batchValue,
      firstName: firstNameValue,
      lastName: lastNameValue,
    }
  }, [requestStatus])

  useEffect(() => {
    try {
      if (sessionStorage.getItem('yrc_link_open_register') === '1') {
        sessionStorage.removeItem('yrc_link_open_register')
        setShowRegister(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setRegistryBatches(undefined)
      setRegistryBatchesErr(null)
      try {
        const r = await fetch(`${apiBase}/api/members/registry-batches`)
        const j = (await r.json().catch(() => ({}))) as { ok?: unknown; batches?: unknown; error?: unknown }
        if (cancelled) return
        if (r.ok && j.ok === true && Array.isArray(j.batches)) {
          setRegistryBatches(j.batches.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))
          return
        }
        setRegistryBatches([])
        setRegistryBatchesErr(
          typeof j.error === 'string' && j.error.trim()
            ? j.error.trim()
            : `โหลดรายการรุ่นไม่สำเร็จ (HTTP ${r.status})`,
        )
      } catch {
        if (!cancelled) {
          setRegistryBatches([])
          setRegistryBatchesErr('เรียก API รายการรุ่นไม่สำเร็จ — ตรวจ VITE_API_URL')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase])

  useEffect(() => {
    if (!lineUid.trim()) {
      setRequestStatus(null)
      setRequestStatusLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setRequestStatusLoading(true)
      try {
        const r = await fetch(`${apiBase}/api/members/request-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line_uid: lineUid.trim() }),
        })
        const j = (await r.json().catch(() => ({}))) as { request?: RequestStatusRow }
        if (cancelled) return
        setRequestStatus(r.ok && j.request ? j.request : null)
      } catch {
        if (!cancelled) setRequestStatus(null)
      } finally {
        if (!cancelled) setRequestStatusLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiBase, lineUid])

  const requestStatusLabel = useMemo(() => {
    switch (requestStatus?.status) {
      case 'pending_president':
        return 'รอประธานรุ่นอนุมัติ (ยังไม่ Active)'
      case 'pending_admin':
        return 'รอ Admin อนุมัติ (ยังไม่ Active)'
      case 'approved':
        return 'อนุมัติครบแล้ว (พร้อม Active ในทะเบียน)'
      case 'rejected':
        return 'ถูกปฏิเสธ'
      default:
        return ''
    }
  }, [requestStatus])

  const requestStatusTone = useMemo(() => {
    switch (requestStatus?.status) {
      case 'approved':
        return 'border-fuchsia-900/40 bg-fuchsia-950/20 text-fuchsia-100'
      case 'rejected':
        return 'border-rose-900/40 bg-rose-950/20 text-rose-100'
      default:
        return 'border-amber-900/40 bg-amber-950/20 text-amber-100'
    }
  }, [requestStatus])
  const hasApprovedRequest = requestStatus?.status === 'approved'
  const requestStatusSummary = requestStatusLoading
    ? 'กำลังตรวจสอบสถานะคำร้องล่าสุดของ LINE UID นี้'
    : requestStatus
      ? `สถานะล่าสุด: ${requestStatusLabel || requestStatus.status || '-'}`
      : 'ยังไม่พบคำร้องล่าสุดของ LINE UID นี้'

  async function verifyLinkWithValues(nextBatch: string, nextFirstName: string, nextLastName: string) {
    setLoading(true)
    setMsg(null)
    setShowRegister(false)
    try {
      const r = await fetch(`${apiBase}/api/members/verify-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          batch: nextBatch.trim(),
          first_name: nextFirstName.trim(),
          last_name: nextLastName.trim(),
        }),
      })
      const j = (await r.json().catch(() => ({}))) as {
        code?: string
        member?: MemberRow
        error?: string
      }
      if (r.status === 404 && j.code === 'NOT_IN_REGISTRY') {
        setMsg('ไม่พบในทะเบียน — กรอกแบบฟอร์มสมัครสมาชิกด้านล่าง (หน้าพอร์ทัลสมาชิก)')
        setShowRegister(true)
        try {
          sessionStorage.setItem('yrc_link_open_register', '1')
        } catch {
          /* ignore */
        }
        navigate('/member', { replace: true })
        return
      }
      if (r.status === 403 && j.code === 'MEMBERSHIP_INACTIVE') {
        setMsg(
          typeof j.error === 'string' && j.error.trim()
            ? j.error.trim()
            : 'สมาชิกภาพในทะเบียนยังไม่ Active — หากส่งคำร้องสมัครใหม่ ต้องรอประธานรุ่นและ Admin อนุมัติครบก่อน หรือติดต่อผู้ดูแลหากเป็นสมาชิกเดิม',
        )
        return
      }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      if (j.member && typeof j.member === 'object') {
        setMsg('ผูกสำเร็จ — เปิดหน้าสมาชิกให้แล้ว')
        onMemberVerified?.(j.member)
        return
      }
      setMsg(JSON.stringify(j, null, 2))
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function verifyLink() {
    await verifyLinkWithValues(batch, firstName, lastName)
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
      if (r.ok) {
        setShowRegister(false)
        setRequestStatus({
          id: (j as { requestId?: string }).requestId,
          request_type: 'new_registration',
          status: 'pending_president',
          created_at: new Date().toISOString(),
          requested_data: body,
        })
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function applyApprovedRequestData() {
    if (!approvedRequestedNames) return
    setBatch(approvedRequestedNames.batch)
    setFirstName(approvedRequestedNames.firstName)
    setLastName(approvedRequestedNames.lastName)
    setMsg('เติมข้อมูลจากคำร้องล่าสุดแล้ว กด "ตรวจสอบและผูก" เพื่อเข้าหน้าสมาชิก')
  }

  async function autoLinkFromApprovedRequest() {
    if (!approvedRequestedNames) return
    setBatch(approvedRequestedNames.batch)
    setFirstName(approvedRequestedNames.firstName)
    setLastName(approvedRequestedNames.lastName)
    await verifyLinkWithValues(
      approvedRequestedNames.batch,
      approvedRequestedNames.firstName,
      approvedRequestedNames.lastName,
    )
  }

  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6" aria-busy={loading || requestStatusLoading}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">ผูกบัญชีสมาชิก</h2>
      <p className="mt-2 text-xs text-slate-400">
        เลือกรุ่นจากทะเบียน · กรอกชื่อ · นามสกุล ให้ตรงที่ Admin นำเข้า แล้วกด &quot;เข้าสู่ระบบด้วย LINE&quot; ด้านล่างเพื่อดึง LINE UID
      </p>
      <p className="mt-2 text-xs text-slate-500">
        สมัครใหม่: หลังส่งคำร้อง ต้องรอประธานรุ่นอนุมัติ แล้ว Admin อนุมัติตามลำดับ — ระหว่างรอจะยังไม่มีสมาชิกภาพ Active ในทะเบียน (ยังเข้าพอร์ทัลเต็มรูปแบบไม่ได้) จนกว่าจะอนุมัติครบและมีแถวสมาชิกในระบบ
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BatchField
          label="รุ่น"
          value={batch}
          onChange={setBatch}
          options={registryBatches ?? []}
          loading={registryBatches === undefined}
          loadError={registryBatchesErr}
        />
        <Field label="ชื่อ" value={firstName} onChange={setFirstName} />
        <Field label="นามสกุล" value={lastName} onChange={setLastName} className="sm:col-span-2" />
      </div>

      {lineLoginAvailable ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={onStartLineLogin}
            aria-label="เข้าสู่ระบบด้วย LINE เพื่อดึง LINE UID"
            className={`${themeTapTarget} w-full rounded-lg bg-[#06C755] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 ${portalFocusRing}`}
          >
            เข้าสู่ระบบด้วย LINE
          </button>
          {lineUidFromOAuth && lineUid ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-sm">
              <p className="text-slate-400">LINE UID (จาก LINE)</p>
              <p className="mt-1 break-all font-mono text-fuchsia-300">{lineUid}</p>
              <button
                type="button"
                onClick={onClearLineSession}
                aria-label="ออกจากบัญชี LINE ที่ผูกไว้"
                className={`${themeTapTarget} mt-3 inline-flex min-h-[44px] items-center rounded-sm text-xs text-amber-400 underline hover:text-amber-300 ${portalFocusRing}`}
              >
                ออกจากบัญชี LINE นี้
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowManualUid((v) => !v)}
            aria-pressed={showManualUid}
            aria-expanded={showManualUid || !lineLoginAvailable}
            aria-controls={manualUidPanelId}
            aria-label="สลับโหมดกรอก LINE UID เองสำหรับทดสอบ"
            className={`${themeTapTarget} inline-flex min-h-[44px] items-center rounded-sm text-xs text-slate-400 underline hover:text-slate-400 ${portalFocusRing}`}
          >
            {showManualUid ? 'ซ่อนการใส่ LINE UID เอง (ทดสอบ)' : 'ทดสอบ — ใส่ LINE UID เอง'}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-amber-200/80">
          ยังไม่ได้ตั้งค่า VITE_LINE_CHANNEL_ID / VITE_LINE_REDIRECT_URI — ใช้การใส่ LINE UID ด้านล่างได้
        </p>
      )}

      {(!lineUidFromOAuth || showManualUid || !lineLoginAvailable) && (
        <label id={manualUidPanelId} className="mt-4 block text-sm text-slate-300">
          LINE UID {lineUidFromOAuth ? '' : '(หรือวางจากที่อื่น)'}
          <input
            value={lineUid}
            onChange={(e) => onLineUidChange(e.target.value)}
            readOnly={lineUidFromOAuth && !showManualUid}
            aria-label="LINE UID"
            className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none read-only:opacity-80 focus-visible:border-fuchsia-700 ${portalFocusRing}`}
            placeholder="ได้หลังเข้า LINE หรือใส่เองในโหมดทดสอบ"
          />
        </label>
      )}

      <p className="mt-4 text-xs text-slate-400">
        ตรวจสอบว่ามีในทะเบียนหรือไม่ — รุ่นเลือกจากรายการในฐานข้อมูล · ชื่อ · นามสกุล ต้องตรงที่ Admin นำเข้า
      </p>
      <p id={verificationHintId} className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
        {requestStatusSummary}
      </p>

      {lineUid.trim() ? (
        <section
          className={`mt-4 rounded-lg border p-4 text-sm ${requestStatusTone}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-busy={requestStatusLoading}
        >
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">สถานะคำร้องสมัครสมาชิก</p>
          {requestStatusLoading ? (
            <p className="mt-2">กำลังตรวจสอบสถานะคำร้องล่าสุดของ LINE UID นี้...</p>
          ) : requestStatus ? (
            <>
              <p className="mt-2 font-medium">
                {requestStatusLabel || `สถานะ ${requestStatus.status ?? '-'}`}
              </p>
              <p className="mt-1 text-xs opacity-80">
                requestId: {requestStatus.id ?? '-'} · type: {requestStatus.request_type ?? '-'}
              </p>
              <p className="mt-1 text-xs opacity-80">
                ส่งคำร้องเมื่อ: {requestStatus.created_at ? new Date(requestStatus.created_at).toLocaleString('th-TH') : '-'}
              </p>
              {requestStatus.status === 'approved' ? (
                <>
                  <p className="mt-2 text-xs opacity-90">
                    คำร้องนี้ได้รับอนุมัติแล้ว ถ้ายังไม่เห็นข้อมูลสมาชิก ให้กด &quot;ตรวจสอบและผูก&quot; อีกครั้ง
                  </p>
                  {approvedRequestedNames ? (
                    <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" role="group" aria-label="เครื่องมือใช้ข้อมูลจากคำร้องล่าสุด">
                      <button
                        type="button"
                        onClick={applyApprovedRequestData}
                        aria-label="ใช้ข้อมูลจากคำร้องล่าสุดเพื่อเติมฟอร์ม"
                        className={`${themeTapTarget} rounded-lg px-3 py-2 text-xs font-medium text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
                      >
                        ใช้ข้อมูลจากคำร้องล่าสุด
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={autoLinkFromApprovedRequest}
                        aria-label="ผูกบัญชีอัตโนมัติจากข้อมูลคำร้องล่าสุด"
                        className={`${themeTapTarget} rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50 ${themeAccent.buttonPrimaryStrong} ${portalFocusRing}`}
                      >
                        ผูกอัตโนมัติ
                      </button>
                      <span className="min-w-0 break-words text-xs opacity-80 sm:self-center">
                        {approvedRequestedNames.batch} · {approvedRequestedNames.firstName} {approvedRequestedNames.lastName}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
              {requestStatus.status === 'rejected' ? (
                <p className="mt-2 text-xs opacity-90">
                  เหตุผล: {requestStatus.rejection_reason?.trim() || 'ไม่มีเหตุผลที่ระบุไว้'}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-xs opacity-80">ยังไม่พบคำร้องสมัครใหม่ของ LINE UID นี้</p>
          )}
        </section>
      ) : null}
      <button
        type="button"
        disabled={loading || !lineUid.trim()}
        onClick={verifyLink}
        aria-label="ตรวจสอบข้อมูลและผูกบัญชีสมาชิก"
        aria-describedby={`${verificationHintId} ${requestStatusSummaryId}`}
        className={`${themeTapTarget} mt-4 rounded-lg ${themeAccent.buttonPrimaryStrong} px-4 py-2 text-sm font-medium disabled:opacity-50 ${portalFocusRing}`}
      >
        ตรวจสอบและผูก
      </button>
      <p id={requestStatusSummaryId} className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
        {hasApprovedRequest
          ? 'พบคำร้องที่อนุมัติแล้ว สามารถกด "ใช้ข้อมูลจากคำร้องล่าสุด" หรือกดตรวจสอบเพื่อผูกบัญชีได้ทันที'
          : 'หากยังไม่พบในทะเบียน ให้ส่งคำร้องสมัครใหม่และรอประธานรุ่น/ผู้ดูแลอนุมัติ'}
      </p>

      {showRegister && (
        <div className="mt-8 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-medium text-slate-300">สมัครสมาชิกใหม่ (คำร้อง)</h3>
          <p className="mt-1 text-xs text-slate-400">
            เลือกรุ่น · กรอกชื่อ · นามสกุล และรายละเอียดอื่นตามที่มี — ส่งแล้วรอประธานรุ่น / Admin อนุมัติ
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
            aria-label="ส่งคำร้องสมัครสมาชิกใหม่"
            className={`${themeTapTarget} mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
          >
            ส่งคำร้องสมัครใหม่
          </button>
        </div>
      )}

      {msg && (
        <pre
          className="mt-4 max-h-56 max-w-full overflow-auto overscroll-x-contain rounded-lg bg-slate-950 p-3 text-left text-xs text-fuchsia-200/90"
          role={isErrorMsg ? 'alert' : 'status'}
          aria-live={isErrorMsg ? undefined : 'polite'}
          aria-atomic="true"
        >
          {msg}
        </pre>
      )}
      {loading ? (
        <p className="mt-3 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          กำลังตรวจสอบหรือส่งคำร้องสมาชิก...
        </p>
      ) : null}
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
        aria-label={label}
        className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-fuchsia-700 ${portalFocusRing}`}
      />
    </label>
  )
}

/** รุ่น: dropdown จากทะเบียน — โหลดไม่ได้หรือทะเบียนว่าง → ช่องพิมพ์; ค่าที่ไม่อยู่ในรายการ → เพิ่มเป็นตัวเลือกชั่วคราว */
function BatchField({
  label,
  value,
  onChange,
  options,
  loading,
  loadError,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  loading: boolean
  loadError: string | null
}) {
  const trimmed = value.trim()
  const extraOption =
    trimmed && options.length > 0 && !options.includes(trimmed) ? trimmed : null
  const selectValue =
    trimmed && (options.includes(trimmed) || extraOption === trimmed) ? trimmed : ''

  if (loadError) {
    return (
      <div className="block text-sm text-slate-300">
        <label className="block">
          {label}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} พิมพ์เอง`}
            placeholder="พิมพ์รุ่นให้ตรงทะเบียน"
            className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-fuchsia-700 ${portalFocusRing}`}
          />
        </label>
        <p className="mt-1 text-[11px] text-amber-200/90" role="alert">
          ไม่สามารถโหลดรายการรุ่น — {loadError}
        </p>
      </div>
    )
  }

  if (!loading && options.length === 0) {
    return (
      <div className="block text-sm text-slate-300">
        <label className="block">
          {label}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} พิมพ์เอง`}
            placeholder="ยังไม่มีรุ่นในระบบ — พิมพ์รุ่นตามทะเบียน"
            className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-fuchsia-700 ${portalFocusRing}`}
          />
        </label>
        <p className="mt-1 text-[11px] text-slate-500">ยังไม่มีรุ่นในทะเบียน — ติดต่อผู้ดูแลให้นำเข้าข้อมูลสมาชิก</p>
      </div>
    )
  }

  return (
    <label className="block text-sm text-slate-300">
      {label}
      <span className="sr-only">จากทะเบียนสมาชิก</span>
      <select
        value={selectValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        aria-label={`${label} จากทะเบียน`}
        className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-fuchsia-700 disabled:opacity-60 ${portalFocusRing}`}
      >
        <option value="">{loading ? 'กำลังโหลดรายการรุ่น…' : '— เลือกรุ่น —'}</option>
        {extraOption ? (
          <option value={extraOption}>
            {extraOption} (ไม่อยู่ในรายการล่าสุด — ตรวจทะเบียน)
          </option>
        ) : null}
        {options.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      {extraOption ? (
        <p className="mt-1 text-[11px] text-slate-500">ถ้ารุ่นไม่ตรงทะเบียน ให้แก้แล้วเลือกจากรายการด้านบน</p>
      ) : null}
    </label>
  )
}
