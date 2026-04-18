import { FinanceAdminMeetingColumn, type FinanceAdminMeetingColumnProps } from './FinanceAdminMeetingColumn'
import { FinanceMeetingPaymentRow } from './FinanceMeetingPaymentRow'
import { PaymentRequestTools, type PaymentRequestToolsProps } from './PaymentRequestTools'

export type FinanceAdminMeetingPaymentSectionProps = {
  meeting: FinanceAdminMeetingColumnProps
  payment: PaymentRequestToolsProps
}

/** แถวประชุม + คำขอจ่ายเงิน — state อยู่ที่ parent (`AdminFinancePanel`) */
export function FinanceAdminMeetingPaymentSection({ meeting, payment }: FinanceAdminMeetingPaymentSectionProps) {
  return (
    <FinanceMeetingPaymentRow
      meetingColumn={<FinanceAdminMeetingColumn {...meeting} />}
      paymentColumn={<PaymentRequestTools {...payment} />}
    />
  )
}
