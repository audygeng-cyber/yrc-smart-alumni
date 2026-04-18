import type { Dispatch, SetStateAction } from 'react'
import type { ReportPreset } from '../../lib/adminFinanceHelpers'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceReportPresetsProps = {
  loading: boolean
  allPresets: ReportPreset[]
  selectedPresetId: string
  setSelectedPresetId: Dispatch<SetStateAction<string>>
  presetName: string
  setPresetName: Dispatch<SetStateAction<string>>
  onApplyPreset: () => void
  onApplyPresetAndLoad: () => void
  onSaveCurrentPreset: () => void
  onDeleteSelectedPreset: () => void
}

export function FinanceReportPresets({
  loading,
  allPresets,
  selectedPresetId,
  setSelectedPresetId,
  presetName,
  setPresetName,
  onApplyPreset,
  onApplyPresetAndLoad,
  onSaveCurrentPreset,
  onDeleteSelectedPreset,
}: FinanceReportPresetsProps) {
  return (
    <div
      className="mt-2 grid gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs md:grid-cols-5"
      role="group"
      aria-label="เครื่องมือพรีเซ็ตรายงานการเงิน"
    >
      <select
        value={selectedPresetId}
        onChange={(e) => setSelectedPresetId(e.target.value)}
        aria-label="เลือกพรีเซ็ตรายงาน"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
      >
        {allPresets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id.startsWith('custom:') ? `[กำหนดเอง] ${p.name}` : `[ระบบ] ${p.name}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={loading}
        onClick={onApplyPreset}
        aria-label="ใช้พรีเซ็ตรายงานที่เลือก"
        className={`rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
      >
        ใช้พรีเซ็ต
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onApplyPresetAndLoad}
        aria-label="ใช้พรีเซ็ตรายงานและโหลดข้อมูลทันที"
        className={`rounded bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50 ${portalFocusRing}`}
      >
        ใช้พรีเซ็ต + โหลดทันที
      </button>
      <input
        type="text"
        value={presetName}
        onChange={(e) => setPresetName(e.target.value)}
        aria-label="กรอกชื่อพรีเซ็ตรายงานใหม่"
        className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        placeholder="ชื่อพรีเซ็ตใหม่"
      />
      <button
        type="button"
        disabled={loading}
        onClick={onSaveCurrentPreset}
        aria-label="บันทึกค่าตัวกรองปัจจุบันเป็นพรีเซ็ต"
        className={`rounded bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50 ${portalFocusRing}`}
      >
        บันทึกพรีเซ็ตปัจจุบัน
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onDeleteSelectedPreset}
        aria-label="ลบพรีเซ็ตรายงานที่เลือก"
        className={`rounded bg-rose-700 px-3 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-50 ${portalFocusRing}`}
      >
        ลบพรีเซ็ตที่เลือก
      </button>
    </div>
  )
}
