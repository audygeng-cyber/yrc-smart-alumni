import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type {
  DonationsReportPayload,
  FinancePeriodClosingItem,
  OverviewPayload,
  PlSummaryPayload,
  TrialBalancePayload,
} from '../../lib/adminFinanceTypes'

export type FinanceOverviewSummaryProps = {
  accountCount: number
  overview: OverviewPayload | null
  plSummary: PlSummaryPayload | null
  donationsReport: DonationsReportPayload | null
  trialBalance: TrialBalancePayload | null
  periodClosings: FinancePeriodClosingItem[]
  periodClosingsSentCount: number
  periodClosingsCompletedCount: number
}

export function FinanceOverviewSummary({
  accountCount,
  overview,
  plSummary,
  donationsReport,
  trialBalance,
  periodClosings,
  periodClosingsSentCount,
  periodClosingsCompletedCount,
}: FinanceOverviewSummaryProps) {
  return (
    <div
      className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p>บัญชีธนาคาร: {accountCount}</p>
      {overview ? (
        <>
          <p className="mt-1">รายการรอจ่าย: {overview.pendingPayments.length}</p>
          <p className="mt-1">
            จำนวนรุ่นที่มีเงินบริจาค: {Object.keys(overview.donationByBatch).length} | ยอดรวมเงินบริจาค:{' '}
            {Object.values(overview.donationByBatch)
              .reduce((s, n) => s + n, 0)
              .toLocaleString('th-TH')}
          </p>
        </>
      ) : null}
      {plSummary ? (
        <p className="mt-1">
          P/L: รายรับ {formatThNumber(plSummary.totals.revenue)} | รายจ่าย {formatThNumber(plSummary.totals.expense)} |
          สุทธิ {formatThNumber(plSummary.totals.netIncome)}
        </p>
      ) : null}
      {donationsReport ? (
        <p className="mt-1">
          เงินบริจาค: {formatThNumber(donationsReport.totals.donations)} รายการ | รวม{' '}
          {formatThNumber(donationsReport.totals.totalAmount)}
        </p>
      ) : null}
      {trialBalance ? (
        <p className="mt-1">
          Trial Balance: {formatThNumber(trialBalance.rows.length)} บัญชี | เดบิตรวม{' '}
          {formatThNumber(trialBalance.totals.totalDebit)} | เครดิตรวม {formatThNumber(trialBalance.totals.totalCredit)}
        </p>
      ) : null}
      {periodClosings.length > 0 ? (
        <p className="mt-1">
          ปิดงวดบัญชีแล้ว {formatThNumber(periodClosings.length)} งวด (ล่าสุด:{' '}
          {new Date(periodClosings[0].closed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}) ·
          ส่งผู้ตรวจสอบแล้ว {formatThNumber(periodClosingsSentCount)} งวด · ปิดงานแล้ว{' '}
          {formatThNumber(periodClosingsCompletedCount)} งวด
        </p>
      ) : null}
    </div>
  )
}
