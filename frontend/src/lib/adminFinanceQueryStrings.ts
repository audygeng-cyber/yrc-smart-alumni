import type { ReportFilterEntity } from './adminFinanceHelpers'

/** `?legal_entity_code=&from=&to=` สำหรับรายงาน P/L, บริจาค, trial balance ฯลฯ */
export function financeReportQuerySuffix(
  entity: ReportFilterEntity,
  from: string,
  to: string,
): string {
  const q = new URLSearchParams()
  if (entity) q.set('legal_entity_code', entity)
  if (from.trim()) q.set('from', from.trim())
  if (to.trim()) q.set('to', to.trim())
  const s = q.toString()
  return s ? `?${s}` : ''
}

export type FinanceJournalListStatusFilter = '' | 'draft' | 'posted' | 'voided'

/** query สำหรับ `GET /api/admin/finance/journals` */
export function financeJournalsQuerySuffix(params: {
  reportEntity: ReportFilterEntity
  reportFrom: string
  reportTo: string
  journalStatusFilter: FinanceJournalListStatusFilter
}): string {
  const { reportEntity, reportFrom, reportTo, journalStatusFilter } = params
  const q = new URLSearchParams()
  if (reportEntity) q.set('legal_entity_code', reportEntity)
  if (reportFrom.trim()) q.set('from', reportFrom.trim())
  if (reportTo.trim()) q.set('to', reportTo.trim())
  if (journalStatusFilter) q.set('status', journalStatusFilter)
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** query สำหรับงบดุล `as_of` */
export function financeBalanceSheetQuerySuffix(params: {
  reportEntity: ReportFilterEntity
  bsAsOf: string
}): string {
  const { reportEntity, bsAsOf } = params
  const q = new URLSearchParams()
  if (reportEntity) q.set('legal_entity_code', reportEntity)
  if (bsAsOf.trim()) q.set('as_of', bsAsOf.trim())
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** query สำหรับบัญชีแยกประเภท (GL) */
export function financeGlQuerySuffix(params: {
  reportEntity: ReportFilterEntity
  reportFrom: string
  reportTo: string
  glAccountCode: string
}): string {
  const { reportEntity, reportFrom, reportTo, glAccountCode } = params
  const q = new URLSearchParams()
  if (reportEntity) q.set('legal_entity_code', reportEntity)
  if (reportFrom.trim()) q.set('from', reportFrom.trim())
  if (reportTo.trim()) q.set('to', reportTo.trim())
  if (glAccountCode.trim()) q.set('account_code', glAccountCode.trim())
  const s = q.toString()
  return s ? `?${s}` : ''
}

export type FinancePeriodHandoffFilter = 'all' | 'pending' | 'sent' | 'completed'

/** query สำหรับ `GET /api/admin/finance/period-closing` */
export function financePeriodClosingsQuerySuffix(params: {
  reportEntity: ReportFilterEntity
  periodHandoffFilter: FinancePeriodHandoffFilter
  limit?: number
}): string {
  const q = new URLSearchParams()
  if (params.reportEntity) q.set('legal_entity_code', params.reportEntity)
  if (params.periodHandoffFilter !== 'all') q.set('auditor_handoff_status', params.periodHandoffFilter)
  q.set('limit', String(params.limit ?? 50))
  const s = q.toString()
  return s ? `?${s}` : ''
}
