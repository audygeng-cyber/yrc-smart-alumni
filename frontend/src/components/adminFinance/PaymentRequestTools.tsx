import type { Dispatch, SetStateAction } from 'react'
import { PAYMENT_PURPOSE_OPTIONS } from '../../lib/adminFinanceConstants'
import type { BankAccount } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type PaymentRequestToolsProps = {
  loading: boolean
  paymentEntity: 'association' | 'cram_school'
  setPaymentEntity: Dispatch<SetStateAction<'association' | 'cram_school'>>
  paymentPurpose: string
  setPaymentPurpose: Dispatch<SetStateAction<string>>
  paymentAmount: string
  setPaymentAmount: Dispatch<SetStateAction<string>>
  paymentPurposeCategory: string
  setPaymentPurposeCategory: Dispatch<SetStateAction<string>>
  paymentVatRate: string
  setPaymentVatRate: Dispatch<SetStateAction<string>>
  paymentWhtRate: string
  setPaymentWhtRate: Dispatch<SetStateAction<string>>
  paymentTaxpayerId: string
  setPaymentTaxpayerId: Dispatch<SetStateAction<string>>
  paymentBankAccountId: string
  setPaymentBankAccountId: Dispatch<SetStateAction<string>>
  paymentMeetingId: string
  setPaymentMeetingId: Dispatch<SetStateAction<string>>
  paymentRequestId: string
  setPaymentRequestId: Dispatch<SetStateAction<string>>
  paymentLowAmountOtherBlocked: boolean
  filteredAccounts: BankAccount[]
  selectedAccount: BankAccount | null
  approveRoleCode: 'bank_signer_3of5' | 'committee'
  setApproveRoleCode: Dispatch<SetStateAction<'bank_signer_3of5' | 'committee'>>
  approveSignerId: string
  setApproveSignerId: Dispatch<SetStateAction<string>>
  approveDecision: 'approve' | 'reject'
  setApproveDecision: Dispatch<SetStateAction<'approve' | 'reject'>>
  onCreatePaymentRequest: () => void
  onApprovePayment: () => void
}

export function PaymentRequestTools({
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
  onCreatePaymentRequest,
  onApprovePayment,
}: PaymentRequestToolsProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4" role="group" aria-label="เครื่องมือสร้างและอนุมัติคำขอจ่ายเงิน">
      <h3 className="text-sm font-medium text-slate-200">2) สร้าง/อนุมัติคำขอจ่ายเงิน</h3>
      <select
        value={paymentEntity}
        onChange={(e) => setPaymentEntity(e.target.value as 'association' | 'cram_school')}
        aria-label="เลือกหน่วยงานสำหรับคำขอจ่ายเงิน"
        className={`mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="association">สมาคมศิษย์เก่า (association)</option>
        <option value="cram_school">โรงเรียนกวดวิชา (cram_school)</option>
      </select>
      <input
        value={paymentPurpose}
        onChange={(e) => setPaymentPurpose(e.target.value)}
        aria-label="วัตถุประสงค์การจ่ายเงิน"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="วัตถุประสงค์การจ่าย"
      />
      <input
        value={paymentAmount}
        onChange={(e) => setPaymentAmount(e.target.value)}
        aria-label="จำนวนเงินสำหรับคำขอจ่าย"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="จำนวนเงิน"
      />
      <select
        value={paymentPurposeCategory}
        onChange={(e) => setPaymentPurposeCategory(e.target.value)}
        aria-label="หมวดวัตถุประสงค์ (สำหรับค่าใช้จ่ายไม่เกิน 20,000)"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        {PAYMENT_PURPOSE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {paymentLowAmountOtherBlocked ? (
        <p className="mt-2 text-xs text-amber-300/95" role="status" aria-live="polite">
          ยอดไม่เกิน 20,000 บาทไม่สามารถใช้หมวด &quot;อื่นๆ&quot; — เลือกหมวดค่าใช้จ่ายปกติ หรือใช้ยอดเกิน 20,000 พร้อมมติประชุม
        </p>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={paymentVatRate}
          onChange={(e) => setPaymentVatRate(e.target.value)}
          aria-label="อัตรา VAT"
          className={`rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm ${portalFocusRing}`}
        >
          <option value="0">VAT 0%</option>
          <option value="0.07">VAT 7%</option>
        </select>
        <select
          value={paymentWhtRate}
          onChange={(e) => setPaymentWhtRate(e.target.value)}
          aria-label="อัตราหัก ณ ที่จ่าย"
          className={`rounded border border-slate-700 bg-slate-900 px-2 py-2 text-sm ${portalFocusRing}`}
        >
          <option value="0">WHT 0%</option>
          <option value="0.01">WHT 1%</option>
          <option value="0.03">WHT 3%</option>
          <option value="0.05">WHT 5%</option>
        </select>
      </div>
      <input
        value={paymentTaxpayerId}
        onChange={(e) => setPaymentTaxpayerId(e.target.value)}
        aria-label="เลขประจำตัวผู้เสียภาษี (ถ้ามี)"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="เลขผู้เสียภาษี (ถ้ามี)"
      />
      <select
        value={paymentBankAccountId}
        onChange={(e) => setPaymentBankAccountId(e.target.value)}
        aria-label="รหัสบัญชีธนาคารสำหรับคำขอจ่าย"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="">{'รหัสบัญชีธนาคาร (bank_account_id) — ใช้เมื่อจำนวนเงิน <= 20000'}</option>
        {filteredAccounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_name} ({a.account_no_masked})
          </option>
        ))}
      </select>
      <input
        value={paymentMeetingId}
        onChange={(e) => setPaymentMeetingId(e.target.value)}
        aria-label="รหัสรอบประชุมสำหรับคำขอจ่ายเงินที่เกิน 20000"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="รหัสรอบประชุม (meeting_session_id) — ใช้เมื่อจำนวนเงิน > 20000"
      />
      <button
        type="button"
        disabled={loading || paymentLowAmountOtherBlocked}
        onClick={onCreatePaymentRequest}
        aria-label="สร้างคำขอจ่ายเงินใหม่"
        className={`mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
      >
        สร้างคำขอจ่ายเงิน
      </button>

      <input
        value={paymentRequestId}
        onChange={(e) => setPaymentRequestId(e.target.value)}
        aria-label="รหัสคำขอจ่ายเงิน"
        className={`mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="รหัสคำขอจ่ายเงิน (payment_request_id)"
      />
      <select
        value={approveRoleCode}
        onChange={(e) => setApproveRoleCode(e.target.value as 'bank_signer_3of5' | 'committee')}
        aria-label="เลือกบทบาทผู้อนุมัติ"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="bank_signer_3of5">ผู้ลงนามธนาคาร 3 ใน 5 (bank_signer_3of5)</option>
        <option value="committee">คณะกรรมการ (committee)</option>
      </select>
      <select
        value={approveSignerId}
        onChange={(e) => setApproveSignerId(e.target.value)}
        aria-label="เลือกผู้อนุมัติจากบัญชีผู้ลงนาม"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        disabled={approveRoleCode !== 'bank_signer_3of5'}
      >
        <option value="">ผู้อนุมัติ (approver_signer_id)</option>
        {(selectedAccount?.signers ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.signer_name}
          </option>
        ))}
      </select>
      <select
        value={approveDecision}
        onChange={(e) => setApproveDecision(e.target.value as 'approve' | 'reject')}
        aria-label="เลือกผลการอนุมัติ"
        className={`mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="approve">อนุมัติ</option>
        <option value="reject">ปฏิเสธ</option>
      </select>
      <button
        type="button"
        disabled={loading}
        onClick={onApprovePayment}
        aria-label="บันทึกผลอนุมัติหรือปฏิเสธคำขอจ่ายเงิน"
        className={`mt-3 rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50 ${portalFocusRing}`}
      >
        อนุมัติ/ปฏิเสธ
      </button>
    </div>
  )
}
