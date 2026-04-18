import type { Dispatch, SetStateAction } from 'react'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { BatchSortKey, DonorSortKey, EntitySortKey, SortDirection } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'
import { FinanceReportPager } from './FinanceReportPager'

type Paged<T> = {
  pageRows: T[]
  page: number
  totalPages: number
}

type DonorRow = { donorLabel: string; count: number; totalAmount: number }
type BatchRow = { batch: string; totalAmount: number }
type EntityRow = { legalEntityCode: string; totalAmount: number }

export type FinanceDonationsReportGridProps = {
  loading: boolean
  donorPaged: Paged<DonorRow>
  batchPaged: Paged<BatchRow>
  entityPaged: Paged<EntityRow>
  donorSortKey: DonorSortKey
  donorSortDir: SortDirection
  onToggleDonorSort: (key: DonorSortKey) => void
  batchSortKey: BatchSortKey
  batchSortDir: SortDirection
  onToggleBatchSort: (key: BatchSortKey) => void
  entitySortKey: EntitySortKey
  entitySortDir: SortDirection
  onToggleEntitySort: (key: EntitySortKey) => void
  sortArrow: (active: boolean, dir: SortDirection) => string
  setDonorPage: Dispatch<SetStateAction<number>>
  setBatchPage: Dispatch<SetStateAction<number>>
  setEntityPage: Dispatch<SetStateAction<number>>
  onExportDonorsCsv: () => void
  onExportBatchCsv: () => void
  onExportEntityCsv: () => void
}

export function FinanceDonationsReportGrid({
  loading,
  donorPaged,
  batchPaged,
  entityPaged,
  donorSortKey,
  donorSortDir,
  onToggleDonorSort,
  batchSortKey,
  batchSortDir,
  onToggleBatchSort,
  entitySortKey,
  entitySortDir,
  onToggleEntitySort,
  sortArrow,
  setDonorPage,
  setBatchPage,
  setEntityPage,
  onExportDonorsCsv,
  onExportBatchCsv,
  onExportEntityCsv,
}: FinanceDonationsReportGridProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy={loading}>
      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="รายงานผู้บริจาคทั้งหมด">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-medium">ผู้บริจาค (ทั้งหมด)</p>
          <button
            type="button"
            onClick={onExportDonorsCsv}
            aria-label="ส่งออกข้อมูลผู้บริจาคของมุมมองปัจจุบัน"
            className={`rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
          >
            ส่งออก CSV ของมุมมองนี้
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => onToggleDonorSort('donorLabel')}
            aria-pressed={donorSortKey === 'donorLabel'}
            aria-label="เรียงลำดับตามชื่อผู้บริจาค"
            className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
          >
            ผู้บริจาค{sortArrow(donorSortKey === 'donorLabel', donorSortDir)}
          </button>
          <button
            type="button"
            onClick={() => onToggleDonorSort('count')}
            aria-pressed={donorSortKey === 'count'}
            aria-label="เรียงลำดับตามจำนวนครั้งบริจาค"
            className={`rounded-sm text-right hover:text-slate-200 ${portalFocusRing}`}
          >
            จำนวนครั้ง{sortArrow(donorSortKey === 'count', donorSortDir)}
          </button>
          <button
            type="button"
            onClick={() => onToggleDonorSort('totalAmount')}
            aria-pressed={donorSortKey === 'totalAmount'}
            aria-label="เรียงลำดับตามยอดเงินบริจาครวม"
            className={`rounded-sm text-right hover:text-slate-200 ${portalFocusRing}`}
          >
            ยอดเงิน{sortArrow(donorSortKey === 'totalAmount', donorSortDir)}
          </button>
        </div>
        <div role="list" aria-label="รายการผู้บริจาคที่แสดง">
          {donorPaged.pageRows.map((r) => (
            <div key={r.donorLabel} className="grid grid-cols-3 gap-2 py-1" role="listitem">
              <span>{r.donorLabel}</span>
              <span className="text-right">{formatThNumber(r.count)}</span>
              <span className="text-right">{formatThNumber(r.totalAmount)}</span>
            </div>
          ))}
          {donorPaged.pageRows.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
              ไม่พบข้อมูลผู้บริจาคตามตัวกรองปัจจุบัน
            </p>
          ) : null}
        </div>
        <FinanceReportPager page={donorPaged.page} totalPages={donorPaged.totalPages} onPage={setDonorPage} ariaLabel="ตัวแบ่งหน้า รายงานผู้บริจาค" />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="รายงานเงินบริจาคแยกรุ่น">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-medium">เงินบริจาคแยกรุ่น</p>
          <button
            type="button"
            onClick={onExportBatchCsv}
            aria-label="ส่งออกข้อมูลเงินบริจาคแยกรุ่นของมุมมองปัจจุบัน"
            className={`rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
          >
            ส่งออก CSV ของมุมมองนี้
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => onToggleBatchSort('batch')}
            aria-pressed={batchSortKey === 'batch'}
            aria-label="เรียงลำดับตามรุ่น"
            className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
          >
            รุ่น{sortArrow(batchSortKey === 'batch', batchSortDir)}
          </button>
          <button
            type="button"
            onClick={() => onToggleBatchSort('totalAmount')}
            aria-pressed={batchSortKey === 'totalAmount'}
            aria-label="เรียงลำดับตามยอดเงินบริจาคต่อรุ่น"
            className={`rounded-sm text-right hover:text-slate-200 ${portalFocusRing}`}
          >
            ยอดเงิน{sortArrow(batchSortKey === 'totalAmount', batchSortDir)}
          </button>
        </div>
        <div role="list" aria-label="รายการยอดบริจาคแยกรุ่นที่แสดง">
          {batchPaged.pageRows.map((r) => (
            <div key={r.batch} className="grid grid-cols-2 gap-2 py-1" role="listitem">
              <span>{r.batch}</span>
              <span className="text-right">{formatThNumber(r.totalAmount)}</span>
            </div>
          ))}
          {batchPaged.pageRows.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
              ไม่พบข้อมูลเงินบริจาคแยกรุ่นตามตัวกรองปัจจุบัน
            </p>
          ) : null}
        </div>
        <FinanceReportPager page={batchPaged.page} totalPages={batchPaged.totalPages} onPage={setBatchPage} ariaLabel="ตัวแบ่งหน้า รายงานเงินบริจาคแยกรุ่น" />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200 md:col-span-2" aria-label="รายงานเงินบริจาคแยกนิติบุคคล">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-medium">เงินบริจาคแยกนิติบุคคล</p>
          <button
            type="button"
            onClick={onExportEntityCsv}
            aria-label="ส่งออกข้อมูลเงินบริจาคแยกนิติบุคคลของมุมมองปัจจุบัน"
            className={`rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
          >
            ส่งออก CSV ของมุมมองนี้
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => onToggleEntitySort('legalEntityCode')}
            aria-pressed={entitySortKey === 'legalEntityCode'}
            aria-label="เรียงลำดับตามรหัสนิติบุคคล"
            className={`rounded-sm text-left hover:text-slate-200 ${portalFocusRing}`}
          >
            นิติบุคคล{sortArrow(entitySortKey === 'legalEntityCode', entitySortDir)}
          </button>
          <button
            type="button"
            onClick={() => onToggleEntitySort('totalAmount')}
            aria-pressed={entitySortKey === 'totalAmount'}
            aria-label="เรียงลำดับตามยอดเงินรวมต่อหน่วยงาน"
            className={`rounded-sm text-right hover:text-slate-200 ${portalFocusRing}`}
          >
            ยอดเงิน{sortArrow(entitySortKey === 'totalAmount', entitySortDir)}
          </button>
        </div>
        <div role="list" aria-label="รายการยอดบริจาคแยกนิติบุคคลที่แสดง">
          {entityPaged.pageRows.map((r) => (
            <div key={r.legalEntityCode} className="grid grid-cols-2 gap-2 py-1" role="listitem">
              <span>{r.legalEntityCode}</span>
              <span className="text-right">{formatThNumber(r.totalAmount)}</span>
            </div>
          ))}
          {entityPaged.pageRows.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
              ไม่พบข้อมูลเงินบริจาคแยกนิติบุคคลตามตัวกรองปัจจุบัน
            </p>
          ) : null}
        </div>
        <FinanceReportPager page={entityPaged.page} totalPages={entityPaged.totalPages} onPage={setEntityPage} ariaLabel="ตัวแบ่งหน้า รายงานเงินบริจาคแยกนิติบุคคล" />
      </div>
    </div>
  )
}
