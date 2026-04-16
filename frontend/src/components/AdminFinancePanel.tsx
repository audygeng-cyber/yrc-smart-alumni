import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'yrc_admin_upload_key'

type Props = { apiBase: string }

type BankSigner = {
  id: string
  signer_name: string
  kbiz_name: string
  in_kbiz: boolean
  active: boolean
}

type BankAccount = {
  id: string
  legal_entity_id: string
  bank_name: string
  account_name: string
  account_no_masked: string
  signer_pool_size: number
  required_signers: number
  kbiz_enabled: boolean
  signers: BankSigner[]
}

type PendingPayment = {
  id: string
  legal_entity_id: string
  amount: number
  status: string
}

type OverviewPayload = {
  entities: { id: string; code: string; name_th: string }[]
  pendingPayments: PendingPayment[]
  donationByBatch: Record<string, number>
  donationByEntity: Record<string, number>
}

type PlSummaryPayload = {
  totals: { revenue: number; expense: number; netIncome: number }
  accountSummaries: {
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    net: number
  }[]
}

type DonationsReportPayload = {
  totals: { donations: number; totalAmount: number }
  byBatch: { batch: string; totalAmount: number }[]
  byEntity: { legalEntityCode: string; totalAmount: number }[]
  byDonor: { donorLabel: string; totalAmount: number; count: number }[]
}

type ReportFilterEntity = '' | 'association' | 'cram_school'

function normalizeApiBase(base: string): string {
  return base.trim().replace(/\/+$/, '')
}

async function readApiJson(r: Response): Promise<{
  status: number
  ok: boolean
  payload: unknown
  rawText: string
}> {
  const rawText = await r.text()
  let payload: unknown = null
  const trimmed = rawText.trim()
  if (trimmed) {
    try {
      payload = JSON.parse(trimmed) as unknown
    } catch {
      payload = null
    }
  }
  return { status: r.status, ok: r.ok, payload, rawText }
}

function formatFetchError(label: string, status: number, payload: unknown, rawText: string): string {
  const jsonPart =
    payload !== null && payload !== undefined ? JSON.stringify(payload, null, 2) : '(ไม่ใช่ JSON หรือ body ว่าง)'
  return `${label} ไม่สำเร็จ — HTTP ${status}\n${jsonPart}\n\nดิบจากเซิร์ฟเวอร์:\n${rawText || '(ไม่มี body)'}`
}

export function AdminFinancePanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [plSummary, setPlSummary] = useState<PlSummaryPayload | null>(null)
  const [donationsReport, setDonationsReport] = useState<DonationsReportPayload | null>(null)
  const [reportEntity, setReportEntity] = useState<ReportFilterEntity>('')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')

  const [meetingEntity, setMeetingEntity] = useState<'association' | 'cram_school'>('association')
  const [meetingTitle, setMeetingTitle] = useState('ประชุมพิจารณารายการจ่ายเงิน')
  const [meetingExpected, setMeetingExpected] = useState('35')
  const [meetingId, setMeetingId] = useState('')
  const [meetingSummary, setMeetingSummary] = useState<string>('')
  const [attendanceName, setAttendanceName] = useState('')
  const [attendanceRole, setAttendanceRole] = useState<'committee' | 'cram_executive'>('committee')
  const [attendanceLineUid, setAttendanceLineUid] = useState('')

  const [paymentEntity, setPaymentEntity] = useState<'association' | 'cram_school'>('association')
  const [paymentPurpose, setPaymentPurpose] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('')
  const [paymentMeetingId, setPaymentMeetingId] = useState('')
  const [paymentRequestId, setPaymentRequestId] = useState('')

  const [approveSignerId, setApproveSignerId] = useState('')
  const [approveRoleCode, setApproveRoleCode] = useState<'bank_signer_3of5' | 'committee'>('bank_signer_3of5')
  const [approveDecision, setApproveDecision] = useState<'approve' | 'reject'>('approve')

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_KEY) ?? '')
  }, [])

  const filteredAccounts = useMemo(() => {
    const ent = overview?.entities.find((e) => e.code === paymentEntity)
    if (!ent) return accounts
    return accounts.filter((a) => a.legal_entity_id === ent.id)
  }, [accounts, overview?.entities, paymentEntity])

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === paymentBankAccountId) ?? null,
    [accounts, paymentBankAccountId],
  )

  function buildReportQueryString() {
    const q = new URLSearchParams()
    if (reportEntity) q.set('legal_entity_code', reportEntity)
    if (reportFrom.trim()) q.set('from', reportFrom.trim())
    if (reportTo.trim()) q.set('to', reportTo.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  async function loadOverviewAndAccounts() {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r1 = await fetch(`${base}/api/admin/finance/overview`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p1 = await readApiJson(r1)
      if (!p1.ok) {
        setMsg(formatFetchError('โหลดภาพรวม Finance', p1.status, p1.payload, p1.rawText))
        return
      }
      setOverview((p1.payload ?? null) as OverviewPayload | null)

      const r2 = await fetch(`${base}/api/admin/finance/bank-accounts`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p2 = await readApiJson(r2)
      if (!p2.ok) {
        setMsg(formatFetchError('โหลดบัญชีธนาคาร', p2.status, p2.payload, p2.rawText))
        return
      }
      const data = (p2.payload ?? {}) as { accounts?: BankAccount[] }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setMsg('โหลดภาพรวมและบัญชีธนาคารแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadPlSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/reports/pl-summary${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลด P/L summary', p.status, p.payload, p.rawText))
      setPlSummary((p.payload ?? null) as PlSummaryPayload | null)
      setMsg('โหลดรายงาน P/L แล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadDonationsReport() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/reports/donations${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลด donations dashboard', p.status, p.payload, p.rawText))
      setDonationsReport((p.payload ?? null) as DonationsReportPayload | null)
      setMsg('โหลด donations dashboard แล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function downloadCsv(path: string, filename: string) {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}${path}${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const blob = await r.blob()
      if (!r.ok) {
        const txt = await blob.text().catch(() => '')
        setMsg(`ดาวน์โหลด ${filename} ไม่สำเร็จ — HTTP ${r.status}\n${txt}`)
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg(`ดาวน์โหลด ${filename} แล้ว`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeeting() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    const expected = Number(meetingExpected)
    if (!meetingTitle.trim() || !Number.isFinite(expected) || expected <= 0) {
      return setMsg('กรอกชื่อประชุม และ expected participants > 0')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: meetingEntity,
          title: meetingTitle.trim(),
          expected_participants: expected,
          created_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สร้างประชุม', p.status, p.payload, p.rawText))
      const j = (p.payload ?? {}) as { meetingSession?: { id?: string }; quorumRequired?: number }
      if (j.meetingSession?.id) {
        setMeetingId(j.meetingSession.id)
        setPaymentMeetingId(j.meetingSession.id)
      }
      setMsg(`สร้างประชุมแล้ว quorum required=${String(j.quorumRequired ?? '')}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function signAttendance() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!meetingId.trim() || !attendanceName.trim()) return setMsg('กรอก Meeting ID และชื่อผู้เข้าประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/sign-attendance`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendee_name: attendanceName.trim(),
          attendee_role_code: attendanceRole,
          line_uid: attendanceLineUid.trim() || undefined,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('ลงชื่อเข้าประชุม', p.status, p.payload, p.rawText))
      setMsg('ลงชื่อเข้าประชุมแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอก Meeting ID')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/summary`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สรุปประชุม', p.status, p.payload, p.rawText))
      setMeetingSummary(JSON.stringify(p.payload, null, 2))
      setMsg('โหลดสรุปประชุมแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createPaymentRequest() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    const amount = Number(paymentAmount)
    if (!paymentPurpose.trim() || !Number.isFinite(amount) || amount <= 0) {
      return setMsg('กรอก purpose และ amount > 0')
    }
    if (amount <= 20000 && !paymentBankAccountId) {
      return setMsg('ยอด <= 20,000 ต้องเลือก bank account')
    }
    if (amount > 20000 && !paymentMeetingId.trim()) {
      return setMsg('ยอด > 20,000 ต้องกรอก Meeting ID')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/payment-requests`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: paymentEntity,
          purpose: paymentPurpose.trim(),
          amount,
          bank_account_id: amount <= 20000 ? paymentBankAccountId : undefined,
          meeting_session_id: amount > 20000 ? paymentMeetingId.trim() : undefined,
          requested_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สร้างคำขอจ่ายเงิน', p.status, p.payload, p.rawText))
      const j = (p.payload ?? {}) as { paymentRequest?: { id?: string } }
      if (j.paymentRequest?.id) setPaymentRequestId(j.paymentRequest.id)
      setMsg('สร้างคำขอจ่ายเงินแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function approvePayment() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!paymentRequestId.trim()) return setMsg('กรอก Payment Request ID')
    if (approveRoleCode === 'bank_signer_3of5' && !approveSignerId.trim()) {
      return setMsg('เลือก signer สำหรับ 3 ใน 5')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/payment-requests/${paymentRequestId.trim()}/approve`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_role_code: approveRoleCode,
          approver_signer_id: approveRoleCode === 'bank_signer_3of5' ? approveSignerId.trim() : undefined,
          approver_name: approveRoleCode === 'committee' ? 'committee-voter' : undefined,
          decision: approveDecision,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('อนุมัติรายการ', p.status, p.payload, p.rawText))
      setMsg(JSON.stringify(p.payload, null, 2))
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-200/90">
        Admin Finance — บัญชี/ประชุม/อนุมัติจ่ายเงิน
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ใช้คีย์เดียวกับ Admin panel ด้านบน (อ่านจาก session เดียวกัน)
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={loadOverviewAndAccounts}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          โหลด Overview + Bank Accounts
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={loadPlSummary}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          โหลด P/L Summary
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={loadDonationsReport}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          โหลด Donations Dashboard
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => downloadCsv('/api/admin/finance/exports/donations.csv', 'finance-donations.csv')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Donations CSV
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            downloadCsv('/api/admin/finance/exports/payment-requests.csv', 'finance-payment-requests.csv')
          }
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Payment Requests CSV
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => downloadCsv('/api/admin/finance/exports/meeting-sessions.csv', 'finance-meeting-sessions.csv')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Meeting Sessions CSV
        </button>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs md:grid-cols-4">
        <select
          value={reportEntity}
          onChange={(e) => setReportEntity(e.target.value as ReportFilterEntity)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">ทุกหน่วยงาน (ทั้งหมด)</option>
          <option value="association">association</option>
          <option value="cram_school">cram_school</option>
        </select>
        <input
          type="date"
          value={reportFrom}
          onChange={(e) => setReportFrom(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="from"
        />
        <input
          type="date"
          value={reportTo}
          onChange={(e) => setReportTo(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="to"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setReportEntity('')
            setReportFrom('')
            setReportTo('')
          }}
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
        >
          ล้างตัวกรองรายงาน
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p>Bank Accounts: {accounts.length}</p>
        {overview ? (
          <>
            <p className="mt-1">Pending payments: {overview.pendingPayments.length}</p>
            <p className="mt-1">
              Donation batches: {Object.keys(overview.donationByBatch).length} | Donation total:{' '}
              {Object.values(overview.donationByBatch)
                .reduce((s, n) => s + n, 0)
                .toLocaleString()}
            </p>
          </>
        ) : null}
        {plSummary ? (
          <p className="mt-1">
            P/L: Revenue {plSummary.totals.revenue.toLocaleString()} | Expense{' '}
            {plSummary.totals.expense.toLocaleString()} | Net {plSummary.totals.netIncome.toLocaleString()}
          </p>
        ) : null}
        {donationsReport ? (
          <p className="mt-1">
            Donations: {donationsReport.totals.donations} รายการ | Total{' '}
            {donationsReport.totals.totalAmount.toLocaleString()}
          </p>
        ) : null}
      </div>

      {plSummary ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200">
          <p className="mb-2 font-medium">P/L Accounts (Top 10)</p>
          <div className="grid grid-cols-4 gap-2 font-semibold text-slate-400">
            <span>Code</span>
            <span>Name</span>
            <span>Type</span>
            <span className="text-right">Net</span>
          </div>
          {plSummary.accountSummaries.slice(0, 10).map((r) => (
            <div key={`${r.accountCode}:${r.accountName}`} className="grid grid-cols-4 gap-2 py-1">
              <span>{r.accountCode}</span>
              <span>{r.accountName}</span>
              <span>{r.accountType}</span>
              <span className="text-right">{r.net.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : null}

      {donationsReport ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200">
          <p className="mb-2 font-medium">Top Donors (Top 10)</p>
          <div className="grid grid-cols-3 gap-2 font-semibold text-slate-400">
            <span>Donor</span>
            <span className="text-right">Count</span>
            <span className="text-right">Amount</span>
          </div>
          {donationsReport.byDonor.slice(0, 10).map((r) => (
            <div key={r.donorLabel} className="grid grid-cols-3 gap-2 py-1">
              <span>{r.donorLabel}</span>
              <span className="text-right">{r.count.toLocaleString()}</span>
              <span className="text-right">{r.totalAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-medium text-slate-200">1) สร้างประชุม</h3>
          <select
            value={meetingEntity}
            onChange={(e) => setMeetingEntity(e.target.value as 'association' | 'cram_school')}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="association">association</option>
            <option value="cram_school">cram_school</option>
          </select>
          <input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Meeting title"
          />
          <input
            value={meetingExpected}
            onChange={(e) => setMeetingExpected(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Expected participants"
          />
          <button
            type="button"
            disabled={loading}
            onClick={createMeeting}
            className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            สร้างประชุม
          </button>

          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Meeting ID"
          />
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              value={attendanceName}
              onChange={(e) => setAttendanceName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="ชื่อผู้เข้าประชุม"
            />
            <select
              value={attendanceRole}
              onChange={(e) => setAttendanceRole(e.target.value as 'committee' | 'cram_executive')}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="committee">committee</option>
              <option value="cram_executive">cram_executive</option>
            </select>
            <input
              value={attendanceLineUid}
              onChange={(e) => setAttendanceLineUid(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="line_uid (optional)"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={signAttendance}
              className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              ลงชื่อเข้าประชุม
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={loadMeetingSummary}
              className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              สรุปประชุม
            </button>
          </div>
          {meetingSummary ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">
              {meetingSummary}
            </pre>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-medium text-slate-200">2) สร้าง/อนุมัติคำขอจ่ายเงิน</h3>
          <select
            value={paymentEntity}
            onChange={(e) => setPaymentEntity(e.target.value as 'association' | 'cram_school')}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="association">association</option>
            <option value="cram_school">cram_school</option>
          </select>
          <input
            value={paymentPurpose}
            onChange={(e) => setPaymentPurpose(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="purpose"
          />
          <input
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="amount"
          />
          <select
            value={paymentBankAccountId}
            onChange={(e) => setPaymentBankAccountId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">{'bank_account_id (ใช้เมื่อ amount <= 20000)'}</option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} ({a.account_no_masked})
              </option>
            ))}
          </select>
          <input
            value={paymentMeetingId}
            onChange={(e) => setPaymentMeetingId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="meeting_session_id (ใช้เมื่อ amount > 20000)"
          />
          <button
            type="button"
            disabled={loading}
            onClick={createPaymentRequest}
            className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            สร้าง Payment Request
          </button>

          <input
            value={paymentRequestId}
            onChange={(e) => setPaymentRequestId(e.target.value)}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Payment Request ID"
          />
          <select
            value={approveRoleCode}
            onChange={(e) => setApproveRoleCode(e.target.value as 'bank_signer_3of5' | 'committee')}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="bank_signer_3of5">bank_signer_3of5</option>
            <option value="committee">committee</option>
          </select>
          <select
            value={approveSignerId}
            onChange={(e) => setApproveSignerId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            disabled={approveRoleCode !== 'bank_signer_3of5'}
          >
            <option value="">approver_signer_id</option>
            {(selectedAccount?.signers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.signer_name}
              </option>
            ))}
          </select>
          <select
            value={approveDecision}
            onChange={(e) => setApproveDecision(e.target.value as 'approve' | 'reject')}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="approve">approve</option>
            <option value="reject">reject</option>
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={approvePayment}
            className="mt-3 rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            อนุมัติ/ปฏิเสธ
          </button>
        </div>
      </div>

      {msg ? (
        <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      ) : null}
    </section>
  )
}
