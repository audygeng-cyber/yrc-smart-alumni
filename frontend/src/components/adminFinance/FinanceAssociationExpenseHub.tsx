import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchPaymentRequestDetail,
  fetchPaymentRequestsList,
  patchPaymentRequest,
  postPaymentRequest,
} from '../../lib/adminFinanceJournalPaymentApi'
import { postTaxCalculate } from '../../lib/adminFinanceOpsApi'
import { PAYMENT_PURPOSE_OPTIONS } from '../../lib/adminFinanceConstants'
import type { ActivityItem, BankAccount } from '../../lib/adminFinanceTypes'
import { formatFetchError } from '../../lib/adminHttp'
import { themeAccent } from '../../lib/themeTokens'
import { portalFocusRing } from '../../portal/portalLabels'

type LegalEntityRow = { id: string; code: string; name_th: string }

type LineRow = { id: string; description: string; qty: string; unit: string; unitPrice: string }

type PaymentRequestRow = {
  id: string
  requested_at: string
  purpose: string
  purpose_category?: string | null
  amount: number
  vat_amount?: number | null
  wht_amount?: number | null
  status: string
  approval_rule?: string
  required_approvals?: number
  required_role_code?: string
  legal_entity_code?: string
  bank_account_id?: string | null
  kbiz_transfer_ref?: string | null
  transfer_slip_file_url?: string | null
  note?: string | null
}

function formatMoneyTh(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function netPayableFromRow(r: PaymentRequestRow): number {
  const base = Number(r.amount ?? 0)
  const vat = Number(r.vat_amount ?? 0)
  const wht = Number(r.wht_amount ?? 0)
  return Math.round((base + vat - wht) * 100) / 100
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'รออนุมัติ'
    case 'approved':
      return 'อนุมัติจ่ายแล้ว'
    case 'rejected':
      return 'ไม่อนุมัติ'
    case 'executed':
      return 'โอนแล้ว'
    default:
      return status
  }
}

function ruleShort(rule: string | undefined): string {
  if (rule === 'committee_3of5_upto_20000') return 'KBiz 3 ใน 5'
  if (rule === 'committee_35_over_20000') return 'มติประชุม ก.ก.'
  return rule ?? '—'
}

function purposeCategoryLabel(v: string | undefined | null): string {
  if (!v) return '—'
  const hit = PAYMENT_PURPOSE_OPTIONS.find((o) => o.value === v)
  return hit?.label ?? v
}

function docNoFromId(id: string): string {
  return `EXP-${String(id).replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

function buildKbizNotifyText(p: {
  docNo: string
  net: number
  rule?: string
  bank: BankAccount | undefined
  purposeFirstLine: string
}): string {
  const signers = (p.bank?.signers ?? []).filter((s) => s.active && s.in_kbiz).map((s) => s.signer_name)
  const signerLines =
    signers.length > 0 ? signers.map((n) => `- ${n}`).join('\n') : '(โหลดรายชื่อผู้ลงนามจากแผงการเงิน — โหลดภาพรวม+บัญชีธนาคาร)'

  return [
    'แจ้งผู้มีอำนาจลงนาม KBiz',
    '',
    `เอกสาร: ${p.docNo}`,
    `รายการ: ${p.purposeFirstLine}`,
    `ยอดจ่ายสุทธิ: ${formatMoneyTh(p.net)} บาท`,
    `เส้นทางอนุมัติ: ${ruleShort(p.rule)}`,
    p.bank
      ? `บัญชี: ${p.bank.bank_name} ${p.bank.account_name} (${p.bank.account_no_masked})`
      : 'บัญชี: (ไม่ระบุ — กรณีมติประชุมอาจไม่ผูกบัญชีในกฎเดิม)',
    '',
    'รายชื่อผู้ลงนามที่มีสิทธิ์ KBiz (จากระบบ):',
    signerLines,
    '',
    'กรุณาเข้าระบบ KBiz เพื่อดำเนินการโอนเงินตามคำขอที่อนุมัติแล้ว',
  ].join('\n')
}

function buildPurposePayload(p: {
  payeeName: string
  payeeAddress: string
  externalRef: string
  publicRemarks: string
  lines: LineRow[]
  attachmentHint: string
}): string {
  const lineBlock = p.lines
    .map((row, i) => {
      const q = Number(row.qty) || 0
      const up = Number(row.unitPrice) || 0
      const lineTot = Math.round(q * up * 100) / 100
      return `${i + 1}. ${row.description.trim() || '—'} | จำนวน ${q} ${row.unit.trim() || '-'} | รวม ${formatMoneyTh(lineTot)}`
    })
    .join('\n')
  return [
    p.payeeName.trim() ? `ผู้รับเงิน/คู่ค้า: ${p.payeeName.trim()}` : '',
    p.payeeAddress.trim() ? `ที่อยู่: ${p.payeeAddress.trim()}` : '',
    p.externalRef.trim() ? `เลขอ้างอิง: ${p.externalRef.trim()}` : '',
    p.publicRemarks.trim() ? `หมายเหตุ: ${p.publicRemarks.trim()}` : '',
    lineBlock ? `รายการ:\n${lineBlock}` : '',
    p.attachmentHint.trim() ? `แนบไฟล์ (ชื่อไฟล์): ${p.attachmentHint.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const focus = portalFocusRing

export type FinanceAssociationExpenseHubProps = {
  apiBase: string
  adminKey: string
  loading: boolean
  setLoading: (v: boolean) => void
  setMsg: (v: string | null) => void
  addActivity: (level: ActivityItem['level'], message: string) => void
  entities: LegalEntityRow[]
  accounts: BankAccount[]
  onCreated?: () => void
}

export function FinanceAssociationExpenseHub({
  apiBase,
  adminKey,
  loading,
  setLoading,
  setMsg,
  addActivity,
  entities,
  accounts,
  onCreated,
}: FinanceAssociationExpenseHubProps) {
  const [list, setList] = useState<PaymentRequestRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'executed'>('all')
  const [entityCode, setEntityCode] = useState<'association' | 'cram_school'>('association')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailApprovals, setDetailApprovals] = useState<Array<Record<string, unknown>> | null>(null)
  const [detailPaymentRequest, setDetailPaymentRequest] = useState<PaymentRequestRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editKbizRef, setEditKbizRef] = useState('')
  const [editSlipUrl, setEditSlipUrl] = useState('')
  const [editNoteDetail, setEditNoteDetail] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [payeeName, setPayeeName] = useState('')
  const [payeeAddress, setPayeeAddress] = useState('')
  const [taxpayerId, setTaxpayerId] = useState('')
  const [externalRef, setExternalRef] = useState('')
  const [publicRemarks, setPublicRemarks] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [purposeCategory, setPurposeCategory] = useState<string>(PAYMENT_PURPOSE_OPTIONS[0]?.value ?? 'other')
  const [lines, setLines] = useState<LineRow[]>([
    { id: crypto.randomUUID(), description: '', qty: '1', unit: 'รายการ', unitPrice: '' },
  ])
  const [discountPct, setDiscountPct] = useState('0')
  const [vatEnabled, setVatEnabled] = useState(true)
  const [whtRate, setWhtRate] = useState('0')
  const [bankAccountId, setBankAccountId] = useState('')
  const [meetingSessionId, setMeetingSessionId] = useState('')
  const [requestedBy, setRequestedBy] = useState('finance-admin')
  const [attachmentNames, setAttachmentNames] = useState('')

  const selectedEntityId = useMemo(
    () => entities.find((e) => e.code === entityCode)?.id ?? '',
    [entities, entityCode],
  )

  const filteredAccounts = useMemo(() => {
    if (!selectedEntityId) return accounts
    return accounts.filter((a) => String(a.legal_entity_id) === selectedEntityId)
  }, [accounts, selectedEntityId])

  const lineSubtotal = useMemo(() => {
    let s = 0
    for (const row of lines) {
      const q = Number(row.qty) || 0
      const up = Number(row.unitPrice) || 0
      s += q * up
    }
    return Math.round(s * 100) / 100
  }, [lines])

  const discountedBase = useMemo(() => {
    const d = Number(discountPct) || 0
    const factor = Math.max(0, 1 - Math.min(100, d) / 100)
    return Math.round(lineSubtotal * factor * 100) / 100
  }, [lineSubtotal, discountPct])

  const loadList = useCallback(async () => {
    if (!adminKey.trim()) return
    setListLoading(true)
    try {
      const q =
        statusFilter === 'all'
          ? { legal_entity_code: entityCode, limit: 100 }
          : { legal_entity_code: entityCode, status: statusFilter, limit: 100 }
      const res = await fetchPaymentRequestsList(apiBase, adminKey, q)
      if (!res.ok) {
        setMsg(formatFetchError('โหลดรายการคำขอจ่าย', res.status, res.payload, res.rawText))
        return
      }
      const payload = res.payload as { paymentRequests?: PaymentRequestRow[] }
      setList(Array.isArray(payload.paymentRequests) ? payload.paymentRequests : [])
    } catch {
      setMsg('เรียก API รายการคำขอจ่ายไม่สำเร็จ')
    } finally {
      setListLoading(false)
    }
  }, [adminKey, apiBase, entityCode, setMsg, statusFilter])

  useEffect(() => {
    void loadList()
  }, [loadList])

  async function loadDetail(id: string) {
    if (!adminKey.trim()) return
    setDetailLoading(true)
    setDetailApprovals(null)
    setDetailPaymentRequest(null)
    setEditKbizRef('')
    setEditSlipUrl('')
    setEditNoteDetail('')
    try {
      const res = await fetchPaymentRequestDetail(apiBase, adminKey, id)
      if (!res.ok) {
        setMsg(formatFetchError('โหลดรายละเอียดคำขอ', res.status, res.payload, res.rawText))
        return
      }
      const payload = res.payload as {
        approvals?: Array<Record<string, unknown>>
        paymentRequest?: PaymentRequestRow
      }
      setDetailApprovals(Array.isArray(payload.approvals) ? payload.approvals : [])
      const pr = payload.paymentRequest
      if (pr) {
        setDetailPaymentRequest(pr)
        setEditKbizRef(String(pr.kbiz_transfer_ref ?? ''))
        setEditSlipUrl(String(pr.transfer_slip_file_url ?? ''))
        setEditNoteDetail(String(pr.note ?? ''))
      }
    } catch {
      setMsg('โหลดรายละเอียดไม่สำเร็จ')
    } finally {
      setDetailLoading(false)
    }
  }

  async function copyKbizNotifyText(row: PaymentRequestRow) {
    const pr = detailPaymentRequest?.id === row.id ? detailPaymentRequest : null
    const base = pr ?? row
    const bankId = base.bank_account_id
    const bank = bankId ? accounts.find((a) => a.id === bankId) : undefined
    const text = buildKbizNotifyText({
      docNo: docNoFromId(row.id),
      net: netPayableFromRow(base),
      rule: base.approval_rule,
      bank,
      purposeFirstLine: base.purpose.split('\n')[0] ?? base.purpose,
    })
    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกข้อความแจ้ง KBiz แล้ว')
    } catch {
      setMsg('คัดลอกไม่สำเร็จ — เลือกข้อความด้วยมือ')
    }
  }

  async function saveDetailPatch(rowId: string) {
    if (!adminKey.trim()) return
    const pr = detailPaymentRequest?.id === rowId ? detailPaymentRequest : null
    if (!pr) return
    const body: { kbiz_transfer_ref?: string; transfer_slip_file_url?: string; note?: string } = {}
    const k0 = String(pr.kbiz_transfer_ref ?? '').trim()
    const k1 = editKbizRef.trim()
    if (k1 !== k0) body.kbiz_transfer_ref = k1
    const s0 = String(pr.transfer_slip_file_url ?? '').trim()
    const s1 = editSlipUrl.trim()
    if (s1 !== s0) body.transfer_slip_file_url = s1
    const n0 = String(pr.note ?? '').trim()
    const n1 = editNoteDetail.trim()
    if (n1 !== n0) body.note = n1
    if (Object.keys(body).length === 0) {
      setMsg('ไม่มีการเปลี่ยนแปลง')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const res = await patchPaymentRequest(apiBase, adminKey, rowId, body)
      if (!res.ok) {
        setMsg(formatFetchError('บันทึกคำขอจ่าย', res.status, res.payload, res.rawText))
        return
      }
      const payload = res.payload as { paymentRequest?: PaymentRequestRow }
      const updated = payload.paymentRequest
      if (updated) {
        setDetailPaymentRequest({ ...pr, ...updated })
        setEditKbizRef(String(updated.kbiz_transfer_ref ?? ''))
        setEditSlipUrl(String(updated.transfer_slip_file_url ?? ''))
        setEditNoteDetail(String(updated.note ?? ''))
        setList((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...updated } : r)))
      }
      setMsg('บันทึกแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function markDetailExecuted(rowId: string) {
    if (!adminKey.trim()) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await patchPaymentRequest(apiBase, adminKey, rowId, { mark_executed: true })
      if (!res.ok) {
        setMsg(formatFetchError('ทำเครื่องหมายโอนแล้ว', res.status, res.payload, res.rawText))
        return
      }
      const payload = res.payload as { paymentRequest?: PaymentRequestRow }
      const updated = payload.paymentRequest
      if (updated) {
        setDetailPaymentRequest((prev) => (prev?.id === rowId ? { ...prev, ...updated } : prev))
        setList((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...updated } : r)))
      }
      setMsg('บันทึกสถานะโอนแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), description: '', qty: '1', unit: 'รายการ', unitPrice: '' }])
  }

  function updateLine(id: string, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  async function submitExpense() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    if (discountedBase <= 0) {
      setMsg('ยอดหลังส่วนลดต้องมากกว่า 0')
      return
    }
    const purpose = buildPurposePayload({
      payeeName,
      payeeAddress,
      externalRef,
      publicRemarks,
      lines,
      attachmentHint: attachmentNames,
    })
    if (!purpose.trim()) {
      setMsg('กรอกรายละเอียดค่าใช้จ่ายอย่างน้อยบางส่วน')
      return
    }

    const vatRate = vatEnabled ? 0.07 : 0
    const wht = Number(whtRate) || 0
    if (![0, 0.01, 0.03, 0.05].includes(wht)) {
      setMsg('อัตราหัก ณ ที่จ่ายต้องเป็น 0, 1%, 3% หรือ 5%')
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const taxRes = await postTaxCalculate(apiBase, adminKey, {
        base_amount: discountedBase,
        vat_rate: vatRate,
        wht_rate: wht,
      })
      if (!taxRes.ok) {
        setMsg(formatFetchError('คำนวณภาษี', taxRes.status, taxRes.payload, taxRes.rawText))
        return
      }

      const needMeeting = discountedBase > 20000
      if (needMeeting && !meetingSessionId.trim()) {
        setMsg('ยอดเกิน 20,000 บาท — ต้องระบุ meeting_session_id (รอบประชุมที่มีมติ)')
        return
      }
      if (!needMeeting && !bankAccountId.trim()) {
        setMsg('ยอดไม่เกิน 20,000 บาท — เลือกบัญชีธนาคารสำหรับตรวจสอบผู้ลงนาม KBiz 3 ใน 5')
        return
      }

      const body = {
        legal_entity_code: entityCode,
        purpose,
        purpose_category: purposeCategory,
        amount: discountedBase,
        vat_rate: vatRate,
        wht_rate: wht,
        taxpayer_id: taxpayerId.trim() || undefined,
        bank_account_id: needMeeting ? undefined : bankAccountId.trim(),
        meeting_session_id: needMeeting ? meetingSessionId.trim() : undefined,
        requested_by: requestedBy.trim() || 'finance-admin',
        note: internalNote.trim() || undefined,
      }

      const res = await postPaymentRequest(apiBase, adminKey, body)
      if (!res.ok) {
        setMsg(formatFetchError('สร้างคำขอจ่าย', res.status, res.payload, res.rawText))
        addActivity('warn', 'สร้างคำขอจ่ายไม่สำเร็จ')
        return
      }
      setMsg('บันทึกคำขอจ่ายแล้ว — อยู่ในสถานะรออนุมัติตามสิทธิ์')
      addActivity('info', 'สร้างคำขอจ่ายสำเร็จ')
      setShowForm(false)
      await loadList()
      onCreated?.()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <section
        className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-950/90 to-slate-900/40 p-5 text-sm text-slate-300"
        aria-label="ลำดับการอนุมัติและ KBiz"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-200/90">
          งานสมาคม — ลำดับอนุมัติค่าใช้จ่าย (รายรับเงินสมาคมใช้สมุดรายวันและรายงานด้านล่างแทนใบสำคัญรับ)
        </p>
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          <li className="rounded-lg border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="text-xs font-semibold text-slate-200">1. สร้างค่าใช้จ่าย / ขออนุมัติ</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              ผู้ดูแลบันทึกรายการ ยอดรวม และหลักฐาน (ชื่อไฟล์แนบ) ระบบกำหนดเส้นทางอนุมัติตามยอดและหมวดค่าใช้จ่าย
            </p>
          </li>
          <li className="rounded-lg border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="text-xs font-semibold text-slate-200">2. อนุมัติตามสิทธิ์</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              ยอดไม่เกิน 20,000 บ. (ค่าใช้จ่ายปกติธุระ): ต้องได้รับการอนุมัติจากผู้มีอำนาจลงนามในสมุดบัญชีที่มีชื่อใน KBiz{' '}
              <span className="text-fuchsia-200/90">3 ใน 5 คน</span> ครบก่อนจึงเป็น &quot;อนุมัติจ่าย&quot; · ยอดเกิน 20,000 บ. ใช้มติประชุม
              ก.ก. ตามที่ backend กำหนด
            </p>
          </li>
          <li className="rounded-lg border border-slate-700/80 bg-slate-950/50 p-3">
            <p className="text-xs font-semibold text-slate-200">3. แจ้งผู้มีอำนาจ KBiz → โอนเงิน</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              หลังอนุมัติครบ ให้แจ้งผู้มีอำนาจลงนามที่ใช้ KBiz เพื่อเข้าระบบธนาคารและโอนเงินต่อไป (ขั้นตอนจริงอยู่นอกแอป — บันทึกเลขอ้างอิงโอน/ลิงก์สลิป/หมายเหตุภายใน และทำเครื่องหมาย &quot;โอนแล้ว&quot; ในรายละเอียดรายการ)
            </p>
          </li>
        </ol>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400">
            หน่วยงาน
            <select
              value={entityCode}
              onChange={(e) => setEntityCode(e.target.value as 'association' | 'cram_school')}
              className={`mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 ${focus}`}
            >
              <option value="association">สมาคมศิษย์เก่า</option>
              <option value="cram_school">โรงเรียนกวดวิชา</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            สถานะ
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className={`mt-1 block rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 ${focus}`}
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รออนุมัติ</option>
              <option value="approved">อนุมัติจ่ายแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
              <option value="executed">โอนแล้ว</option>
            </select>
          </label>
          <button
            type="button"
            disabled={loading || listLoading}
            onClick={() => void loadList()}
            className={`rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-white hover:bg-slate-600 disabled:opacity-50 ${focus}`}
          >
            รีเฟรชรายการ
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={`tap-target rounded-lg ${themeAccent.buttonPrimaryStrong} px-3 py-2 text-xs font-semibold ${focus}`}
          >
            {showForm ? 'ปิดฟอร์มสร้าง' : '+ สร้างค่าใช้จ่าย'}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">วันที่</th>
                <th className="px-3 py-2">เลขที่เอกสาร</th>
                <th className="px-3 py-2">รายละเอียด / ผู้รับเงิน</th>
                <th className="px-3 py-2">หมวด</th>
                <th className="px-3 py-2 text-right">ยอดจ่ายสุทธิ</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2">เส้นทางอนุมัติ</th>
                <th className="px-3 py-2 w-24"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {listLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    กำลังโหลด…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                    ยังไม่มีรายการในหน่วยงานนี้
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  const docNo = docNoFromId(row.id)
                  const firstLine = row.purpose.split('\n')[0] ?? row.purpose
                  const open = expandedId === row.id
                  const detailPr = detailPaymentRequest?.id === row.id ? detailPaymentRequest : null
                  const displayRow = detailPr ?? row
                  const roleCode = String(displayRow.required_role_code ?? '')
                  const needAppr = Number(displayRow.required_approvals ?? 0)
                  const gotAppr = (detailApprovals ?? []).filter(
                    (a) => String(a.approver_role_code) === roleCode && String(a.decision) === 'approve',
                  ).length
                  return (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-slate-900/40">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                          {row.requested_at ? new Date(row.requested_at).toLocaleDateString('th-TH') : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-fuchsia-200/90">{docNo}</td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-slate-300" title={row.purpose}>
                          {firstLine}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">{purposeCategoryLabel(row.purpose_category)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-100">
                          {formatMoneyTh(netPayableFromRow(row))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              row.status === 'pending'
                                ? 'bg-amber-950/80 text-amber-200'
                                : row.status === 'approved'
                                  ? 'bg-fuchsia-950/80 text-fuchsia-200'
                                  : row.status === 'rejected'
                                    ? 'bg-rose-950/80 text-rose-200'
                                    : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-400">{ruleShort(row.approval_rule)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className={`text-[11px] text-fuchsia-400 underline ${focus}`}
                            onClick={() => {
                              setExpandedId(open ? null : row.id)
                              if (!open) void loadDetail(row.id)
                              else {
                                setDetailApprovals(null)
                                setDetailPaymentRequest(null)
                                setEditKbizRef('')
                                setEditSlipUrl('')
                                setEditNoteDetail('')
                              }
                            }}
                          >
                            {open ? 'ย่อ' : 'รายละเอียด'}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="bg-slate-950/60">
                          <td colSpan={8} className="px-3 py-3 text-xs text-slate-400">
                            {detailLoading ? (
                              <p>กำลังโหลดรายละเอียดและประวัติอนุมัติ…</p>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-slate-300">ความคืบหน้าการอนุมัติ</p>
                                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                                    {needAppr > 0
                                      ? `อนุมัติแล้ว ${gotAppr} / ต้องการ ${needAppr}`
                                      : `อนุมัติแล้ว ${gotAppr} (มติประชุม — ไม่กำหนดจำนวนในระบบ)`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={loading || detailLoading || detailPaymentRequest?.id !== row.id}
                                    onClick={() => void copyKbizNotifyText(row)}
                                    className={`tap-target rounded-lg ${themeAccent.buttonOutlineOnDark} px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 ${focus}`}
                                  >
                                    คัดลอกข้อความแจ้ง KBiz
                                  </button>
                                  {displayRow.status === 'approved' ? (
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() => void markDetailExecuted(row.id)}
                                      className={`rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50 ${focus}`}
                                    >
                                      บันทึกว่าโอนแล้ว (executed)
                                    </button>
                                  ) : null}
                                </div>
                                <p className="font-medium text-slate-300">รายละเอียดคำขอ</p>
                                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/80 p-2 text-[11px] text-slate-400">
                                  {displayRow.purpose}
                                </pre>
                                <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 md:grid-cols-2">
                                  <label className="block text-[11px] text-slate-400">
                                    เลขอ้างอิงโอน KBiz
                                    <input
                                      value={editKbizRef}
                                      onChange={(e) => setEditKbizRef(e.target.value)}
                                      disabled={loading || displayRow.status === 'rejected'}
                                      className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50 ${focus}`}
                                    />
                                  </label>
                                  <label className="block text-[11px] text-slate-400">
                                    URL สลิป/หลักฐาน (อัปโหลดไฟล์จริงยังไม่มี — วางลิงก์ภายนอกได้)
                                    <input
                                      value={editSlipUrl}
                                      onChange={(e) => setEditSlipUrl(e.target.value)}
                                      disabled={loading || displayRow.status === 'rejected'}
                                      className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50 ${focus}`}
                                    />
                                  </label>
                                  <label className="block text-[11px] text-slate-400 md:col-span-2">
                                    หมายเหตุภายใน (note)
                                    <textarea
                                      value={editNoteDetail}
                                      onChange={(e) => setEditNoteDetail(e.target.value)}
                                      rows={2}
                                      disabled={loading || displayRow.status === 'rejected'}
                                      className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50 ${focus}`}
                                    />
                                  </label>
                                  <div className="md:col-span-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={loading || displayRow.status === 'rejected'}
                                      onClick={() => void saveDetailPatch(row.id)}
                                      className={`tap-target rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${focus}`}
                                    >
                                      บันทึกฟิลด์ด้านบน
                                    </button>
                                    {editSlipUrl.trim().startsWith('http') ? (
                                      <a
                                        href={editSlipUrl.trim()}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] text-slate-200 underline ${focus}`}
                                      >
                                        เปิดลิงก์สลิป
                                      </a>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="mt-1 font-medium text-slate-300">ประวัติการอนุมัติ</p>
                                {detailApprovals && detailApprovals.length > 0 ? (
                                  <ul className="list-inside list-disc space-y-1 text-[11px]">
                                    {detailApprovals.map((a, i) => (
                                      <li key={String(a.id ?? `idx-${i}`)}>
                                        {String(a.approver_name ?? '')} · {String(a.approver_role_code ?? '')} ·{' '}
                                        {String(a.decision ?? '')}{' '}
                                        {a.decided_at ? `(${new Date(String(a.decided_at)).toLocaleString('th-TH')})` : ''}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-slate-400">ยังไม่มีการอนุมัติบันทึก</p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <section className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/10 p-4 text-sm text-slate-200">
          <h3 className="text-sm font-semibold text-fuchsia-100/95">ฟอร์มค่าใช้จ่าย (สไตล์เอกสาร — ฝั่งสมาคม)</h3>
          <p className="mt-1 text-xs text-slate-400">
            ยอดรวมจากตารางรายการ → หักส่วนลด → คำนวณภาษีเหมือน backend · แนบไฟล์จริงยังไม่อัปโหลดเซิร์ฟเวอร์ — ระบุชื่อไฟล์เพื่ออ้างอิง
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="block text-xs text-slate-400">
              ผู้รับเงิน / คู่ค้า
              <input
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
                placeholder="ชื่อบุคคลหรือนิติบุคคล"
              />
            </label>
            <label className="block text-xs text-slate-400">
              เลขประจำตัวผู้เสียภาษี (ถ้ามี)
              <input
                value={taxpayerId}
                onChange={(e) => setTaxpayerId(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              />
            </label>
            <label className="block text-xs text-slate-400 lg:col-span-2">
              ที่อยู่
              <textarea
                value={payeeAddress}
                onChange={(e) => setPayeeAddress(e.target.value)}
                rows={2}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              />
            </label>
            <label className="block text-xs text-slate-400">
              เลขที่อ้างอิงภายนอก
              <input
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              />
            </label>
            <label className="block text-xs text-slate-400">
              หมวดค่าใช้จ่าย
              <select
                value={purposeCategory}
                onChange={(e) => setPurposeCategory(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              >
                {PAYMENT_PURPOSE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900/90 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="px-2 py-2">ลำดับ</th>
                  <th className="px-2 py-2">รายละเอียด</th>
                  <th className="px-2 py-2">จำนวน</th>
                  <th className="px-2 py-2">หน่วย</th>
                  <th className="px-2 py-2">ราคา/หน่วย</th>
                  <th className="px-2 py-2 text-right">รวม</th>
                  <th className="px-2 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, idx) => {
                  const q = Number(row.qty) || 0
                  const up = Number(row.unitPrice) || 0
                  const tot = Math.round(q * up * 100) / 100
                  return (
                    <tr key={row.id} className="border-t border-slate-800">
                      <td className="px-2 py-1 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-1">
                        <input
                          value={row.description}
                          onChange={(e) => updateLine(row.id, { description: e.target.value })}
                          className={`w-full min-w-[140px] rounded border border-slate-700 bg-slate-950 px-2 py-1 ${focus}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={row.qty}
                          onChange={(e) => updateLine(row.id, { qty: e.target.value })}
                          className={`w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${focus}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={row.unit}
                          onChange={(e) => updateLine(row.id, { unit: e.target.value })}
                          className={`w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${focus}`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          value={row.unitPrice}
                          onChange={(e) => updateLine(row.id, { unitPrice: e.target.value })}
                          className={`w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${focus}`}
                        />
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-slate-200">{formatMoneyTh(tot)}</td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => removeLine(row.id)}
                          className={`text-rose-400/90 ${focus}`}
                          aria-label="ลบแถว"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addLine}
            className={`mt-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${focus}`}
          >
            + เพิ่มแถวรายการ
          </button>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <p className="font-medium text-slate-400">สรุปยอด</p>
              <div className="flex justify-between text-slate-300">
                <span>รวมเป็นเงิน</span>
                <span className="tabular-nums">{formatMoneyTh(lineSubtotal)}</span>
              </div>
              <label className="flex items-center justify-between gap-2 text-slate-300">
                <span>ส่วนลด (%)</span>
                <input
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className={`w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right ${focus}`}
                />
              </label>
              <div className="flex justify-between font-medium text-fuchsia-200/90">
                <span>ฐานภาษีหลังส่วนลด</span>
                <span className="tabular-nums">{formatMoneyTh(discountedBase)}</span>
              </div>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className={focus}
                />
                ภาษีมูลค่าเพิ่ม 7%
              </label>
              <label className="flex items-center justify-between gap-2 text-slate-300">
                <span>หัก ณ ที่จ่าย</span>
                <select
                  value={whtRate}
                  onChange={(e) => setWhtRate(e.target.value)}
                  className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${focus}`}
                >
                  <option value="0">ไม่หัก</option>
                  <option value="0.01">1%</option>
                  <option value="0.03">3%</option>
                  <option value="0.05">5%</option>
                </select>
              </label>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">
                หมายเหตุ (แสดงในรายละเอียดคำขอ)
                <textarea
                  value={publicRemarks}
                  onChange={(e) => setPublicRemarks(e.target.value)}
                  rows={3}
                  className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
                />
              </label>
              <label className="block text-slate-400">
                โน้ตภายใน (เก็บใน note — ไม่ส่งถึงคู่ค้า)
                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={2}
                  className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
                />
              </label>
              <label className="block text-slate-400">
                แนบไฟล์ — ระบุชื่อไฟล์ที่แนบ (PDF/รูป)
                <input
                  value={attachmentNames}
                  onChange={(e) => setAttachmentNames(e.target.value)}
                  className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
                  placeholder="เช่น ใบเสร็จ_001.pdf, สลิป.jpg"
                />
              </label>
              <div className="rounded border border-dashed border-slate-700 bg-slate-950/60 px-3 py-4 text-center text-[11px] text-slate-400">
                ลากวางไฟล์ / อัปโหลดจริง — รอเชื่อม storage ในขั้นถัดไป
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-slate-400">
              บัญชีธนาคาร (ยอด ≤ 20,000 บ. — ตรวจผู้ลงนาม KBiz)
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              >
                <option value="">— เลือก —</option>
                {filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} · {a.account_name} ({a.account_no_masked})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              meeting_session_id (ยอด &gt; 20,000 บ.)
              <input
                value={meetingSessionId}
                onChange={(e) => setMeetingSessionId(e.target.value)}
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm ${focus}`}
                placeholder="UUID รอบประชุม"
              />
            </label>
            <label className="block text-xs text-slate-400 md:col-span-2">
              ผู้สร้างคำขอ (requested_by)
              <input
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                className={`mt-1 w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${focus}`}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void submitExpense()}
              className={`tap-target rounded-lg ${themeAccent.buttonPrimaryStrong} px-4 py-2 text-sm font-semibold disabled:opacity-50 ${focus}`}
            >
              บันทึกคำขอจ่าย (ส่งเข้าลำดับอนุมัติ)
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
