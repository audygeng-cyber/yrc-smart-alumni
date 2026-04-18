import { FinanceMeetingAgendaPanel, type FinanceMeetingAgendaPanelProps } from './FinanceMeetingAgendaPanel'
import { FinanceMeetingDocumentsPanel, type FinanceMeetingDocumentsPanelProps } from './FinanceMeetingDocumentsPanel'
import { FinanceMeetingSessionPanel, type FinanceMeetingSessionPanelProps } from './FinanceMeetingSessionPanel'

export type FinanceAdminMeetingColumnProps = FinanceMeetingSessionPanelProps &
  FinanceMeetingAgendaPanelProps &
  FinanceMeetingDocumentsPanelProps

/** คอลัมน์ซ้ายของแถวประชุม/คำขอจ่าย — state อยู่ที่ parent (`AdminFinancePanel`) */
export function FinanceAdminMeetingColumn(props: FinanceAdminMeetingColumnProps) {
  return (
    <>
      <FinanceMeetingSessionPanel {...props} />
      <FinanceMeetingAgendaPanel {...props} />
      <FinanceMeetingDocumentsPanel {...props} />
    </>
  )
}
