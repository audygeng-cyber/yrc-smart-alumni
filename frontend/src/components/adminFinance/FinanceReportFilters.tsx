import type { Dispatch, SetStateAction } from 'react'
import type { ReportFilterEntity } from '../../lib/adminFinanceHelpers'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceReportFiltersProps = {
  loading: boolean
  reportEntity: ReportFilterEntity
  setReportEntity: Dispatch<SetStateAction<ReportFilterEntity>>
  reportFrom: string
  setReportFrom: Dispatch<SetStateAction<string>>
  reportTo: string
  setReportTo: Dispatch<SetStateAction<string>>
  reportKeyword: string
  setReportKeyword: Dispatch<SetStateAction<string>>
  onClearFilters: () => void
}

export function FinanceReportFilters({
  loading,
  reportEntity,
  setReportEntity,
  reportFrom,
  setReportFrom,
  reportTo,
  setReportTo,
  reportKeyword,
  setReportKeyword,
  onClearFilters,
}: FinanceReportFiltersProps) {
  return (
    <div
      className="mt-3 grid gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs md:grid-cols-5"
      role="group"
      aria-label="ตัวกรองรายงานการเงิน"
    >
      <select
        value={reportEntity}
        onChange={(e) => setReportEntity(e.target.value as ReportFilterEntity)}
        aria-label="กรองรายงานตามหน่วยงาน"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        <option value="">ทุกหน่วยงาน (ทั้งหมด)</option>
        <option value="association">สมาคมศิษย์เก่า (association)</option>
        <option value="cram_school">โรงเรียนกวดวิชา (cram_school)</option>
      </select>
      <input
        type="date"
        value={reportFrom}
        onChange={(e) => setReportFrom(e.target.value)}
        aria-label="เลือกวันที่เริ่มรายงาน"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="วันที่เริ่ม (from)"
      />
      <input
        type="date"
        value={reportTo}
        onChange={(e) => setReportTo(e.target.value)}
        aria-label="เลือกวันที่สิ้นสุดรายงาน"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="วันที่สิ้นสุด (to)"
      />
      <input
        type="text"
        value={reportKeyword}
        onChange={(e) => setReportKeyword(e.target.value)}
        aria-label="ค้นหาคำสำคัญในรายงานการเงิน"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="ค้นหาผู้บริจาค (donor) / รุ่น (batch) / บัญชี (account)"
      />
      <button
        type="button"
        disabled={loading}
        onClick={onClearFilters}
        aria-label="ล้างตัวกรองรายงานทั้งหมด"
        className={`rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
      >
        ล้างตัวกรองรายงาน
      </button>
    </div>
  )
}
