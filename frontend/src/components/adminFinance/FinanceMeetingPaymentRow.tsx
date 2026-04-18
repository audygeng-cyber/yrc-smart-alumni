import type { ReactNode } from 'react'

type Props = {
  meetingColumn: ReactNode
  paymentColumn: ReactNode
}

/** แถวสองคอลัมน์: เครื่องมือประชุม (ซ้าย) + คำขอจ่าย (ขวา) */
export function FinanceMeetingPaymentRow({ meetingColumn, paymentColumn }: Props) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div
        className="rounded-lg border border-slate-700 bg-slate-950/60 p-4"
        role="group"
        aria-label="เครื่องมือสร้างและติดตามรอบประชุม"
      >
        {meetingColumn}
      </div>
      {paymentColumn}
    </div>
  )
}
