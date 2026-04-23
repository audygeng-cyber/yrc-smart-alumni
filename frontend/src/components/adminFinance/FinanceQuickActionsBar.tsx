import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceQuickActionsBarProps = {
  loading: boolean
  onLoadOverviewAndAccounts: () => void
  onLoadPlSummary: () => void
  onLoadDonationsReport: () => void
  onLoadTrialBalanceReport: () => void
  onLoadAllReports: () => void
  onExportDonationsCsv: () => void
  onExportPaymentRequestsCsv: () => void
  onExportMeetingSessionsCsv: () => void
  onExportAuditorPackageCsv: () => void
  onLoadPeriodClosings: () => void
}

export function FinanceQuickActionsBar({
  loading,
  onLoadOverviewAndAccounts,
  onLoadPlSummary,
  onLoadDonationsReport,
  onLoadTrialBalanceReport,
  onLoadAllReports,
  onExportDonationsCsv,
  onExportPaymentRequestsCsv,
  onExportMeetingSessionsCsv,
  onExportAuditorPackageCsv,
  onLoadPeriodClosings,
}: FinanceQuickActionsBarProps) {
  const btnBase = `rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${portalFocusRing}`

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] leading-snug text-slate-500">
        ปุ่มส่งออกเป็น CSV (UTF-8) — เปิดด้วย Excel ได้ · ชุดข้อมูลสำหรับผู้ตรวจ — การปิดงบการเงินตามวิชาชีพทำนอกระบบ
      </p>
      <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={loading}
        onClick={onLoadOverviewAndAccounts}
        aria-label="โหลดภาพรวมและบัญชีธนาคาร"
        className={`${btnBase} bg-emerald-700 hover:bg-emerald-600`}
      >
        โหลดภาพรวม + บัญชีธนาคาร
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLoadPlSummary}
        aria-label="โหลดรายงานสรุป P/L"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        โหลดสรุป P/L
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLoadDonationsReport}
        aria-label="โหลดแดชบอร์ดเงินบริจาค"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        โหลดแดชบอร์ดเงินบริจาค
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLoadTrialBalanceReport}
        aria-label="โหลดรายงาน Trial Balance"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        โหลด Trial Balance
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLoadAllReports}
        aria-label="โหลดรายงานทั้งหมด"
        className={`${btnBase} bg-emerald-700 hover:bg-emerald-600`}
      >
        โหลดรายงานทั้งหมด
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onExportDonationsCsv}
        aria-label="ส่งออกไฟล์ Donations CSV สำหรับเปิดใน Excel"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        ส่งออก Donations CSV (Excel)
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onExportPaymentRequestsCsv}
        aria-label="ส่งออกไฟล์ Payment Requests CSV สำหรับเปิดใน Excel"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        ส่งออก Payment Requests CSV (Excel)
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onExportMeetingSessionsCsv}
        aria-label="ส่งออกไฟล์ Meeting Sessions CSV สำหรับเปิดใน Excel"
        className={`${btnBase} bg-slate-700 hover:bg-slate-600`}
      >
        ส่งออก Meeting Sessions CSV (Excel)
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onExportAuditorPackageCsv}
        aria-label="ส่งออกชุดข้อมูลผู้ตรวจ (CSV เปิดใน Excel)"
        className={`${btnBase} bg-cyan-700 hover:bg-cyan-600`}
      >
        ส่งออกชุดผู้ตรวจ (CSV / Excel)
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLoadPeriodClosings}
        aria-label="โหลดประวัติปิดงวดบัญชีภายในระบบ"
        className={`${btnBase} bg-indigo-700 hover:bg-indigo-600`}
      >
        โหลดประวัติปิดงวด
      </button>
      </div>
    </div>
  )
}
