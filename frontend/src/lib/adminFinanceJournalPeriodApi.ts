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

/** `querySuffix` จาก `financeJournalsQuerySuffix` */
export async function fetchJournalsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/journals${querySuffix}`, adminKey)
}

export async function fetchJournalDetail(
  base: string,
  adminKey: string,
  journalId: string,
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(journalId.trim())
  return getJson(base, `/api/admin/finance/journals/${safeId}`, adminKey)
}

/** `querySuffix` จาก `financePeriodClosingsQuerySuffix` */
export async function fetchPeriodClosingsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/period-closing${querySuffix}`, adminKey)
}

export async function fetchPeriodClosingDetail(
  base: string,
  adminKey: string,
  periodClosingId: string,
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(periodClosingId.trim())
  return getJson(base, `/api/admin/finance/period-closing/${safeId}`, adminKey)
}
