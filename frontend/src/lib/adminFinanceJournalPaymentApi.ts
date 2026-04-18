import { financeAdminJson } from './adminFinanceJsonFetch'
import type { ApiJsonResult } from './adminHttp'

export async function postJournalDraft(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    entry_date: string
    reference_no: string | null
    memo: string | null
    created_by: string
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/journals', adminKey, body)
}

export async function postJournalLine(
  base: string,
  adminKey: string,
  journalId: string,
  body: {
    account_code: string
    debit_amount: number
    credit_amount: number
    description: string | null
    actor: string
  },
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(journalId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/journals/${safeId}/lines`, adminKey, body)
}

export async function postJournalPost(
  base: string,
  adminKey: string,
  journalId: string,
  body: { posted_by: string },
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(journalId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/journals/${safeId}/post`, adminKey, body)
}

export async function postJournalVoid(
  base: string,
  adminKey: string,
  journalId: string,
  body: { voided_by: string; reason: string },
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(journalId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/journals/${safeId}/void`, adminKey, body)
}

export async function postPaymentRequest(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    purpose: string
    purpose_category?: string
    amount: number
    vat_rate: number
    wht_rate: number
    taxpayer_id?: string
    bank_account_id?: string
    meeting_session_id?: string
    /** Originating journal entry (same legal entity; not voided) */
    journal_entry_id?: string
    requested_by: string
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/payment-requests', adminKey, body)
}

export async function postPaymentRequestApprove(
  base: string,
  adminKey: string,
  paymentRequestId: string,
  body: {
    approver_role_code: string
    approver_signer_id?: string
    approver_name?: string
    decision: string
  },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(paymentRequestId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/payment-requests/${id}/approve`, adminKey, body)
}
