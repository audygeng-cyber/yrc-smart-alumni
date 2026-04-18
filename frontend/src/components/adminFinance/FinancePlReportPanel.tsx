import type { Dispatch, SetStateAction } from 'react'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { PlSortKey, SortDirection } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'
import { FinanceReportPager } from './FinanceReportPager'

export type PlReportRow = {
  accountCode: string
  accountName: string
  accountType: string
  net: number
}

export type FinancePlReportPanelProps = {
  plPaged: {
    pageRows: PlReportRow[]
    page: number
    totalPages: number
  }
  plSortKey: PlSortKey
  plSortDir: SortDirection
  sortArrow: (active: boolean, dir: SortDirection) => string
  onToggleSort: (key: PlSortKey) => void
  onExportViewCsv: () => void
  setPlPage: Dispatch<SetStateAction<number>>
}

export function FinancePlReportPanel({
  plPaged,
  plSortKey,
  plSortDir,
  sortArrow,
  onToggleSort,
  onExportViewCsv,
  setPlPage,
}: FinancePlReportPanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="รายงานบัญชี P/L">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium">บัญชี P/L (ทั้งหมด)</p>
        <button
          type="button"
          onClick={onExportViewCsv}
          aria-label="ส่งออกข้อมูล P/L ของมุมมองปัจจุบัน"
          className={`rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
        >
          ส่งออก CSV ของมุมมองนี้
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 font-semibold text-slate-400">
        <button
          type="button"
          onClick={() => onToggleSort('accountCode')}
          aria-pressed={plSortKey === 'accountCode'}
          aria-label="เรียงลำดับตามรหัสบัญชี"
          className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
        >
          รหัส{sortArrow(plSortKey === 'accountCode', plSortDir)}
        </button>
        <button
          type="button"
          onClick={() => onToggleSort('accountName')}
          aria-pressed={plSortKey === 'accountName'}
          aria-label="เรียงลำดับตามชื่อบัญชี"
          className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
        >
          ชื่อ{sortArrow(plSortKey === 'accountName', plSortDir)}
        </button>
        <button
          type="button"
          onClick={() => onToggleSort('accountType')}
          aria-pressed={plSortKey === 'accountType'}
          aria-label="เรียงลำดับตามประเภทบัญชี"
          className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
        >
          ประเภท{sortArrow(plSortKey === 'accountType', plSortDir)}
        </button>
        <button
          type="button"
          onClick={() => onToggleSort('net')}
          aria-pressed={plSortKey === 'net'}
          aria-label="เรียงลำดับตามยอดสุทธิ"
          className={`rounded-sm text-right hover:text-slate-200 ${portalFocusRing}`}
        >
          สุทธิ{sortArrow(plSortKey === 'net', plSortDir)}
        </button>
      </div>
      <div role="list" aria-label="รายการบัญชี P/L ที่แสดง">
        {plPaged.pageRows.map((r) => (
          <div key={`${r.accountCode}:${r.accountName}`} className="grid grid-cols-4 gap-2 py-1" role="listitem">
            <span>{r.accountCode}</span>
            <span>{r.accountName}</span>
            <span>{r.accountType}</span>
            <span className="text-right">{formatThNumber(r.net)}</span>
          </div>
        ))}
        {plPaged.pageRows.length === 0 ? (
          <p className="py-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            ไม่พบข้อมูลบัญชี P/L ตามตัวกรองปัจจุบัน
          </p>
        ) : null}
      </div>
      <FinanceReportPager page={plPaged.page} totalPages={plPaged.totalPages} onPage={setPlPage} ariaLabel="ตัวแบ่งหน้า รายงานบัญชี P/L" />
    </div>
  )
}
