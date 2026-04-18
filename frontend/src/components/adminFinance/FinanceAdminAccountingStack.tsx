import { FinanceDonationsReportGrid, type FinanceDonationsReportGridProps } from './FinanceDonationsReportGrid'
import { FinanceFiscalToolsPanel, type FinanceFiscalToolsPanelProps } from './FinanceFiscalToolsPanel'
import { FinanceJournalsGlPanel, type FinanceJournalsGlPanelProps } from './FinanceJournalsGlPanel'
import { FinancePeriodClosingPanel, type FinancePeriodClosingPanelProps } from './FinancePeriodClosingPanel'
import { FinancePlReportPanel, type FinancePlReportPanelProps } from './FinancePlReportPanel'
import { FinanceTrialBalancePanel, type FinanceTrialBalancePanelProps } from './FinanceTrialBalancePanel'

export type FinanceAdminAccountingStackProps = {
  pl: FinancePlReportPanelProps | null
  periodClosing: FinancePeriodClosingPanelProps
  trialBalance: FinanceTrialBalancePanelProps | null
  journalsGl: FinanceJournalsGlPanelProps
  fiscal: FinanceFiscalToolsPanelProps
  donations: FinanceDonationsReportGridProps | null
}

/** บล็อกรายงานบัญชีหลัก — state อยู่ที่ parent (`AdminFinancePanel`) */
export function FinanceAdminAccountingStack({
  pl,
  periodClosing,
  trialBalance,
  journalsGl,
  fiscal,
  donations,
}: FinanceAdminAccountingStackProps) {
  return (
    <>
      {pl ? <FinancePlReportPanel {...pl} /> : null}
      <FinancePeriodClosingPanel {...periodClosing} />
      {trialBalance ? <FinanceTrialBalancePanel {...trialBalance} /> : null}
      <FinanceJournalsGlPanel {...journalsGl} />
      <FinanceFiscalToolsPanel {...fiscal} />
      {donations ? <FinanceDonationsReportGrid {...donations} /> : null}
    </>
  )
}
