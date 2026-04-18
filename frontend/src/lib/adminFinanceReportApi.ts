import { financeAdminHeaders } from './adminFinanceHttp'
import { readApiJson, type ApiJsonResult } from './adminHttp'

async function getJson(
  base: string,
  pathWithQuery: string,
  adminKey: string,
): Promise<ApiJsonResult> {
  const r = await fetch(`${base}${pathWithQuery}`, { headers: financeAdminHeaders(adminKey) })
  return readApiJson(r)
}

export async function fetchFinanceOverview(base: string, adminKey: string): Promise<ApiJsonResult> {
  return getJson(base, '/api/admin/finance/overview', adminKey)
}

export async function fetchFinanceBankAccounts(base: string, adminKey: string): Promise<ApiJsonResult> {
  return getJson(base, '/api/admin/finance/bank-accounts', adminKey)
}

export async function fetchPlSummaryReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/pl-summary${querySuffix}`, adminKey)
}

export async function fetchDonationsReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/donations${querySuffix}`, adminKey)
}

export async function fetchTrialBalanceReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/trial-balance${querySuffix}`, adminKey)
}

export async function fetchIncomeStatementReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/income-statement${querySuffix}`, adminKey)
}

/** `querySuffix` จาก `financeBalanceSheetQuerySuffix` */
export async function fetchBalanceSheetReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/balance-sheet${querySuffix}`, adminKey)
}

/** `querySuffix` จาก `financeGlQuerySuffix` */
export async function fetchGeneralLedgerReport(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/reports/general-ledger${querySuffix}`, adminKey)
}

/** โหลด P/L + บริจาค + Trial Balance พร้อมกัน (ตัวกรองช่วงวันที่เดียวกัน) */
export async function fetchPlDonationsTrialParallel(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<[ApiJsonResult, ApiJsonResult, ApiJsonResult]> {
  const [plResp, donationsResp, trialResp] = await Promise.all([
    fetch(`${base}/api/admin/finance/reports/pl-summary${querySuffix}`, {
      headers: financeAdminHeaders(adminKey),
    }),
    fetch(`${base}/api/admin/finance/reports/donations${querySuffix}`, {
      headers: financeAdminHeaders(adminKey),
    }),
    fetch(`${base}/api/admin/finance/reports/trial-balance${querySuffix}`, {
      headers: financeAdminHeaders(adminKey),
    }),
  ])
  return Promise.all([readApiJson(plResp), readApiJson(donationsResp), readApiJson(trialResp)])
}

/** โหลด P/L + บริจาค พร้อมกัน (เช่น หลังเลือกพรีเซ็ต) */
export async function fetchPlAndDonationsParallel(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<[ApiJsonResult, ApiJsonResult]> {
  const [plResp, donationsResp] = await Promise.all([
    fetch(`${base}/api/admin/finance/reports/pl-summary${querySuffix}`, {
      headers: financeAdminHeaders(adminKey),
    }),
    fetch(`${base}/api/admin/finance/reports/donations${querySuffix}`, {
      headers: financeAdminHeaders(adminKey),
    }),
  ])
  return Promise.all([readApiJson(plResp), readApiJson(donationsResp)])
}
