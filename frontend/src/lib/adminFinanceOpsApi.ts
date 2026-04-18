import { financeAdminGetJson, financeAdminJson } from './adminFinanceJsonFetch'
import type { ApiJsonResult } from './adminHttp'

export async function postPeriodClosingClose(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    period_from: string
    period_to: string
    closed_by: string
    note: string | null
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/period-closing', adminKey, body)
}

export async function postPeriodClosingMarkAuditorSent(
  base: string,
  adminKey: string,
  periodClosingId: string,
  body: { auditor_sent_by: string; auditor_handoff_note: string | null },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(periodClosingId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/period-closing/${id}/mark-auditor-sent`, adminKey, body)
}

export async function postPeriodClosingMarkAuditorCompleted(
  base: string,
  adminKey: string,
  periodClosingId: string,
  body: { auditor_completed_by: string; auditor_completed_note: string | null },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(periodClosingId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/period-closing/${id}/mark-auditor-completed`, adminKey, body)
}

export async function fetchFiscalYearsList(
  base: string,
  adminKey: string,
  legalEntityCode: string,
): Promise<ApiJsonResult> {
  const q = new URLSearchParams()
  q.set('legal_entity_code', legalEntityCode)
  return financeAdminGetJson(base, `/api/admin/finance/fiscal-years?${q}`, adminKey)
}

export async function postFiscalYearCreate(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    period_from: string
    period_to: string
    fiscal_label: string | null
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/fiscal-years', adminKey, body)
}

export async function postFiscalYearClose(
  base: string,
  adminKey: string,
  fiscalYearId: string,
  body: {
    closed_by: string
    close_note: string | null
    accumulated_surplus_account_code: string
  },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(fiscalYearId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/fiscal-years/${id}/close`, adminKey, body)
}

export async function fetchFixedAssetsList(
  base: string,
  adminKey: string,
  legalEntityCode: string,
): Promise<ApiJsonResult> {
  const q = new URLSearchParams()
  q.set('legal_entity_code', legalEntityCode)
  return financeAdminGetJson(base, `/api/admin/finance/fixed-assets?${q}`, adminKey)
}

export async function postFixedAssetCreate(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    asset_code: string
    asset_name: string
    purchase_date: string
    cost: number
    residual_value: number
    useful_life_months: number
    depreciation_account_code: string
    accumulated_depreciation_account_code: string
    note: string | null
    created_by: string
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/fixed-assets', adminKey, body)
}

export async function postFixedAssetRunDepreciation(
  base: string,
  adminKey: string,
  body: { legal_entity_code: string; month: string; posted_by: string },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/fixed-assets/run-depreciation', adminKey, body)
}

export async function fetchTaxMonthlyReport(
  base: string,
  adminKey: string,
  month: string,
  legalEntityCode: string,
): Promise<ApiJsonResult> {
  const q = new URLSearchParams()
  q.set('month', month.trim())
  q.set('legal_entity_code', legalEntityCode)
  return financeAdminGetJson(base, `/api/admin/finance/reports/tax-monthly?${q}`, adminKey)
}

export async function postTaxCalculate(
  base: string,
  adminKey: string,
  body: { base_amount: number; vat_rate: number; wht_rate: number },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/tax/calculate', adminKey, body)
}
