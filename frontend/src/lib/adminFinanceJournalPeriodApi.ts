import { financeAdminGetJson } from './adminFinanceJsonFetch'
import type { ApiJsonResult } from './adminHttp'

/** `querySuffix` จาก `financeJournalsQuerySuffix` */
export async function fetchJournalsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return financeAdminGetJson(base, `/api/admin/finance/journals${querySuffix}`, adminKey)
}

export async function fetchJournalDetail(
  base: string,
  adminKey: string,
  journalId: string,
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(journalId.trim())
  return financeAdminGetJson(base, `/api/admin/finance/journals/${safeId}`, adminKey)
}

/** `querySuffix` จาก `financePeriodClosingsQuerySuffix` */
export async function fetchPeriodClosingsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return financeAdminGetJson(base, `/api/admin/finance/period-closing${querySuffix}`, adminKey)
}

export async function fetchPeriodClosingDetail(
  base: string,
  adminKey: string,
  periodClosingId: string,
): Promise<ApiJsonResult> {
  const safeId = encodeURIComponent(periodClosingId.trim())
  return financeAdminGetJson(base, `/api/admin/finance/period-closing/${safeId}`, adminKey)
}
