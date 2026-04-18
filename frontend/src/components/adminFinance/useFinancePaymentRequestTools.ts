/**
 * Payment request + approval UI state for Admin Finance.
 * Product direction: accounting layer holds correctness/evidence; approval holds spend authority —
 * one pipeline, with payment requests originating from (or tied to) accounting work, not a second keyed system.
 * See docs/ACCOUNTING_FLOW.md (section บัญชีกับการอนุมัติจ่าย).
 */
import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { postPaymentRequest, postPaymentRequestApprove } from '../../lib/adminFinanceJournalPaymentApi'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { ActivityItem, BankAccount, OverviewPayload } from '../../lib/adminFinanceTypes'
import { formatFetchError } from '../../lib/adminHttp'
import type { PaymentRequestToolsProps } from './PaymentRequestTools'

type Params = {
  base: string
  adminKey: string
  accounts: BankAccount[]
  overview: OverviewPayload | null
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  setMsg: Dispatch<SetStateAction<string | null>>
  addActivity: (level: ActivityItem['level'], message: string) => void
}

export function useFinancePaymentRequestTools({
  base,
  adminKey,
  accounts,
  overview,
  loading,
  setLoading,
  setMsg,
  addActivity,
}: Params): {
  payment: PaymentRequestToolsProps
  setPaymentMeetingId: Dispatch<SetStateAction<string>>
  prefillPaymentFromJournal: (args: {
    journalId: string
    legalEntityCode: 'association' | 'cram_school'
    purpose: string
  }) => void
} {
  const [paymentEntity, setPaymentEntity] = useState<'association' | 'cram_school'>('association')
  const [paymentPurpose, setPaymentPurpose] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('')
  const [paymentMeetingId, setPaymentMeetingId] = useState('')
  const [paymentRequestId, setPaymentRequestId] = useState('')
  const [paymentPurposeCategory, setPaymentPurposeCategory] = useState<string>('other')
  const [paymentVatRate, setPaymentVatRate] = useState('0')
  const [paymentWhtRate, setPaymentWhtRate] = useState('0')
  const [paymentTaxpayerId, setPaymentTaxpayerId] = useState('')
  const [paymentJournalEntryId, setPaymentJournalEntryId] = useState('')

  const [approveSignerId, setApproveSignerId] = useState('')
  const [approveRoleCode, setApproveRoleCode] = useState<'bank_signer_3of5' | 'committee'>('bank_signer_3of5')
  const [approveDecision, setApproveDecision] = useState<'approve' | 'reject'>('approve')

  const filteredAccounts = useMemo(() => {
    const ent = overview?.entities.find((e) => e.code === paymentEntity)
    if (!ent) return accounts
    return accounts.filter((a) => a.legal_entity_id === ent.id)
  }, [accounts, overview?.entities, paymentEntity])

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === paymentBankAccountId) ?? null,
    [accounts, paymentBankAccountId],
  )

  const paymentAmountParsed = Number(paymentAmount)
  const paymentLowAmountOtherBlocked =
    Number.isFinite(paymentAmountParsed) &&
    paymentAmountParsed > 0 &&
    paymentAmountParsed <= 20000 &&
    paymentPurposeCategory === 'other'

  const prefillPaymentFromJournal = useCallback(
    (args: { journalId: string; legalEntityCode: 'association' | 'cram_school'; purpose: string }) => {
      setPaymentEntity(args.legalEntityCode)
      setPaymentPurpose(args.purpose)
      setPaymentJournalEntryId(args.journalId.trim())
      setPaymentRequestId('')
    },
    [],
  )

  const clearPaymentJournalLink = useCallback(() => {
    setPaymentJournalEntryId('')
  }, [])

  const createPaymentRequest = useCallback(async () => {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const amount = Number(paymentAmount)
    if (!paymentPurpose.trim() || !Number.isFinite(amount) || amount <= 0) {
      return setMsg('กรอกวัตถุประสงค์และจำนวนเงินที่มากกว่า 0')
    }
    if (amount <= 20000 && !paymentBankAccountId) {
      return setMsg('ยอด <= 20,000 ต้องเลือกบัญชีธนาคาร')
    }
    if (amount <= 20000 && paymentPurposeCategory === 'other') {
      return setMsg('ยอดไม่เกิน 20,000 บาทต้องเลือกหมวดค่าใช้จ่ายปกติธุระ (ห้ามใช้ “อื่นๆ”) — ใช้ยอดเกิน 20,000 พร้อมมติประชุมแทน')
    }
    if (amount > 20000 && !paymentMeetingId.trim()) {
      return setMsg('ยอด > 20,000 ต้องกรอกรหัสการประชุม')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postPaymentRequest(base, adminKey, {
        legal_entity_code: paymentEntity,
        purpose: paymentPurpose.trim(),
        purpose_category: paymentPurposeCategory || undefined,
        amount,
        vat_rate: Number(paymentVatRate),
        wht_rate: Number(paymentWhtRate),
        taxpayer_id: paymentTaxpayerId.trim() || undefined,
        bank_account_id: amount <= 20000 ? paymentBankAccountId : undefined,
        meeting_session_id: amount > 20000 ? paymentMeetingId.trim() : undefined,
        journal_entry_id: paymentJournalEntryId.trim() || undefined,
        requested_by: 'admin-ui',
      })
      if (!p.ok) {
        addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()} (${formatThNumber(amount)})`)
        return setMsg(formatFetchError('สร้างคำขอจ่ายเงิน', p.status, p.payload, p.rawText))
      }
      const j = (p.payload ?? {}) as { paymentRequest?: { id?: string } }
      if (j.paymentRequest?.id) setPaymentRequestId(j.paymentRequest.id)
      setPaymentJournalEntryId('')
      setMsg('สร้างคำขอจ่ายเงินแล้ว')
      addActivity('info', `สร้างคำขอจ่ายเงินสำเร็จ: ${paymentPurpose.trim()} (${formatThNumber(amount)})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()}`)
    } finally {
      setLoading(false)
    }
  }, [
    addActivity,
    adminKey,
    base,
    paymentAmount,
    paymentBankAccountId,
    paymentEntity,
    paymentMeetingId,
    paymentPurpose,
    paymentPurposeCategory,
    paymentTaxpayerId,
    paymentVatRate,
    paymentWhtRate,
    paymentJournalEntryId,
    setLoading,
    setMsg,
  ])

  const approvePayment = useCallback(async () => {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!paymentRequestId.trim()) return setMsg('กรอกรหัสคำขอจ่ายเงิน')
    if (approveRoleCode === 'bank_signer_3of5' && !approveSignerId.trim()) {
      return setMsg('เลือก signer สำหรับ 3 ใน 5')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postPaymentRequestApprove(base, adminKey, paymentRequestId.trim(), {
        approver_role_code: approveRoleCode,
        approver_signer_id: approveRoleCode === 'bank_signer_3of5' ? approveSignerId.trim() : undefined,
        approver_name: approveRoleCode === 'committee' ? 'committee-voter' : undefined,
        decision: approveDecision,
      })
      if (!p.ok) {
        addActivity(
          'error',
          `อนุมัติรายการไม่สำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
        )
        return setMsg(formatFetchError('อนุมัติรายการ', p.status, p.payload, p.rawText))
      }
      setMsg(JSON.stringify(p.payload, null, 2))
      addActivity(
        approveDecision === 'approve' ? 'info' : 'warn',
        `บันทึกการตัดสินคำขอสำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
      )
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity(
        'error',
        `อนุมัติรายการไม่สำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
      )
    } finally {
      setLoading(false)
    }
  }, [
    addActivity,
    adminKey,
    approveDecision,
    approveRoleCode,
    approveSignerId,
    base,
    paymentRequestId,
    setLoading,
    setMsg,
  ])

  const payment: PaymentRequestToolsProps = {
    loading,
    paymentEntity,
    setPaymentEntity,
    paymentPurpose,
    setPaymentPurpose,
    paymentAmount,
    setPaymentAmount,
    paymentPurposeCategory,
    setPaymentPurposeCategory,
    paymentVatRate,
    setPaymentVatRate,
    paymentWhtRate,
    setPaymentWhtRate,
    paymentTaxpayerId,
    setPaymentTaxpayerId,
    paymentBankAccountId,
    setPaymentBankAccountId,
    paymentMeetingId,
    setPaymentMeetingId,
    paymentRequestId,
    setPaymentRequestId,
    paymentLowAmountOtherBlocked,
    filteredAccounts,
    selectedAccount,
    approveRoleCode,
    setApproveRoleCode,
    approveSignerId,
    setApproveSignerId,
    approveDecision,
    setApproveDecision,
    paymentJournalEntryId,
    onClearPaymentJournalLink: clearPaymentJournalLink,
    onCreatePaymentRequest: () => void createPaymentRequest(),
    onApprovePayment: () => void approvePayment(),
  }

  return { payment, setPaymentMeetingId, prefillPaymentFromJournal }
}
