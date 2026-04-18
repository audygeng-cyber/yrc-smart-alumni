import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceReportPagerProps = {
  page: number
  totalPages: number
  onPage: (next: number) => void
  ariaLabel: string
}

export function FinanceReportPager({ page, totalPages, onPage, ariaLabel }: FinanceReportPagerProps) {
  return (
    <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-slate-400" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(Math.max(1, page - 1))}
        aria-label="ไปหน้าก่อนหน้า"
        className={`rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40 ${portalFocusRing}`}
      >
        ก่อนหน้า
      </button>
      <span role="status" aria-live="polite" aria-atomic="true">
        หน้า {page}/{totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        aria-label="ไปหน้าถัดไป"
        className={`rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40 ${portalFocusRing}`}
      >
        ถัดไป
      </button>
    </div>
  )
}
