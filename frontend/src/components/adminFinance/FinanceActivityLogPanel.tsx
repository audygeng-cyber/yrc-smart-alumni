import type { Dispatch, SetStateAction } from 'react'
import { ACTIVITY_SHORTCUTS } from '../../lib/adminFinanceConstants'
import { activityLevelLabel, type ActivityFilter } from '../../lib/adminFinanceHelpers'
import type { ActivityItem, ActivityLimit } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceActivityLogPanelProps = {
  activitySearch: string
  setActivitySearch: Dispatch<SetStateAction<string>>
  activityLimit: ActivityLimit
  setActivityLimit: Dispatch<SetStateAction<ActivityLimit>>
  activityFilter: ActivityFilter
  setActivityFilter: Dispatch<SetStateAction<ActivityFilter>>
  activitySearchTrimmed: string
  activityCounts: { all: number; info: number; warn: number; error: number }
  visibleActivityLog: ActivityItem[]
  activitySnapshotAt: string
  onCopyFilterSummary: () => void
  onCopyVisibleRows: () => void
  onExportCsv: () => void
  onClearLog: () => void
  onApplyIncidentPreset: (nextFilter: Extract<ActivityFilter, 'warn' | 'error'>) => void
  onResetActivityView: () => void
}

export function FinanceActivityLogPanel({
  activitySearch,
  setActivitySearch,
  activityLimit,
  setActivityLimit,
  activityFilter,
  setActivityFilter,
  activitySearchTrimmed,
  activityCounts,
  visibleActivityLog,
  activitySnapshotAt,
  onCopyFilterSummary,
  onCopyVisibleRows,
  onExportCsv,
  onClearLog,
  onApplyIncidentPreset,
  onResetActivityView,
}: FinanceActivityLogPanelProps) {
  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-200">บันทึกกิจกรรม (ล่าสุด 20)</p>
          <input
            type="text"
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            aria-label="ค้นหาบันทึกกิจกรรม"
            className={`w-48 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 ${portalFocusRing}`}
            placeholder="ค้นหากิจกรรม (ข้อความ/ระดับ)..."
          />
          <select
            value={String(activityLimit)}
            onChange={(e) => setActivityLimit(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 10 | 20))}
            aria-label="เลือกจำนวนบันทึกกิจกรรมที่แสดง"
            className={`rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 ${portalFocusRing}`}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyFilterSummary}
            aria-label="คัดลอกสรุปตัวกรองกิจกรรม"
            className={`tap-target rounded bg-cyan-700 px-2 py-1 text-[11px] text-white hover:bg-cyan-600 ${portalFocusRing}`}
          >
            คัดลอกสรุป
          </button>
          <button
            type="button"
            onClick={onCopyVisibleRows}
            aria-label="คัดลอกแถวข้อมูลกิจกรรมที่แสดง"
            className={`tap-target rounded bg-sky-700 px-2 py-1 text-[11px] text-white hover:bg-sky-600 ${portalFocusRing}`}
          >
            คัดลอกแถวข้อมูล
          </button>
          <button
            type="button"
            onClick={onExportCsv}
            aria-label="ส่งออกบันทึกกิจกรรมเป็น CSV"
            className={`tap-target rounded bg-fuchsia-700 px-2 py-1 text-[11px] text-white hover:bg-fuchsia-600 ${portalFocusRing}`}
          >
            ส่งออก CSV
          </button>
          <button
            type="button"
            onClick={onClearLog}
            aria-label="ล้างบันทึกกิจกรรมทั้งหมด"
            className={`tap-target rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
          >
            ล้างรายการ
          </button>
        </div>
      </div>
      <div
        className="mb-2 flex flex-wrap gap-2 text-[11px]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="สรุปตัวกรองกิจกรรมปัจจุบัน"
      >
        <span className="rounded bg-slate-800 px-2 py-1 text-slate-100">
          ตัวกรอง: {activityLevelLabel(activityFilter)}
        </span>
        <span className="rounded bg-slate-800 px-2 py-1 text-slate-100">
          ค้นหา: {activitySearchTrimmed || '-'}
        </span>
        <span className="rounded bg-slate-800 px-2 py-1 text-slate-100">
          จำนวน: {String(activityLimit)}
        </span>
        <span className="rounded bg-slate-800 px-2 py-1 text-slate-100">
          แสดง: {visibleActivityLog.length}
        </span>
        <span className="rounded bg-slate-800 px-2 py-1 text-slate-100">
          สแนปช็อต: {activitySnapshotAt}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="พรีเซ็ตและทางลัดตัวกรองกิจกรรม">
        <button
          type="button"
          onClick={() => onApplyIncidentPreset('error')}
          aria-pressed={activityFilter === 'error' && activitySearchTrimmed.length === 0}
          aria-label="กรองให้แสดงเฉพาะข้อผิดพลาด"
          className={`tap-target rounded bg-rose-700 px-2 py-1 text-[11px] text-white hover:bg-rose-600 ${portalFocusRing}`}
        >
          เฉพาะข้อผิดพลาด
        </button>
        <button
          type="button"
          onClick={() => onApplyIncidentPreset('warn')}
          aria-pressed={activityFilter === 'warn' && activitySearchTrimmed.length === 0}
          aria-label="กรองให้แสดงเฉพาะคำเตือน"
          className={`tap-target rounded bg-amber-700 px-2 py-1 text-[11px] text-white hover:bg-amber-600 ${portalFocusRing}`}
        >
          เฉพาะคำเตือน
        </button>
        <button
          type="button"
          onClick={onResetActivityView}
          aria-label="รีเซ็ตมุมมองกิจกรรมทั้งหมด"
          className={`tap-target rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-600 ${portalFocusRing}`}
        >
          รีเซ็ตมุมมองกิจกรรม
        </button>
        {ACTIVITY_SHORTCUTS.map((shortcut) => {
          const active = activitySearchTrimmed.toLowerCase() === shortcut.keyword.toLowerCase()
          return (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => setActivitySearch(shortcut.keyword)}
              aria-pressed={active}
              aria-label={`ใช้คำค้นด่วน: ${shortcut.label}`}
              className={`tap-target rounded px-2 py-1 text-[11px] ${portalFocusRing} ${
                active ? 'bg-cyan-900/70 text-cyan-200 ring-1 ring-white/30' : 'bg-slate-800 text-slate-200'
              }`}
            >
              {shortcut.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setActivitySearch('')}
          aria-label="ล้างคำค้นหากิจกรรม"
          className={`tap-target rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 ${portalFocusRing}`}
        >
          ล้างคำค้นหา
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="ตัวกรองระดับกิจกรรม">
        {(
          [
            ['all', activityCounts.all, 'bg-slate-800 text-slate-100'],
            ['info', activityCounts.info, 'bg-fuchsia-900/70 text-fuchsia-200'],
            ['warn', activityCounts.warn, 'bg-amber-900/70 text-amber-200'],
            ['error', activityCounts.error, 'bg-rose-900/70 text-rose-200'],
          ] as const
        ).map(([level, count, color]) => (
          <button
            key={level}
            type="button"
            onClick={() => setActivityFilter(level)}
            aria-pressed={activityFilter === level}
            aria-label={`กรองกิจกรรมระดับ ${activityLevelLabel(level)}`}
            className={`tap-target rounded px-2 py-1 text-[11px] ${portalFocusRing} ${
              activityFilter === level ? `${color} ring-1 ring-white/30` : color
            }`}
          >
            {activityLevelLabel(level)}: {count}
          </button>
        ))}
      </div>
      {visibleActivityLog.length === 0 ? (
        <p className="text-[11px] text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          ยังไม่มีเหตุการณ์
        </p>
      ) : (
        <div className="max-h-36 space-y-1 overflow-auto" role="list" aria-label="รายการบันทึกกิจกรรมที่แสดง">
          {visibleActivityLog.map((it) => (
            <div key={it.id} className="flex items-start gap-2 text-[11px]" role="listitem">
              <span
                className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                  it.level === 'error' ? 'bg-rose-400' : it.level === 'warn' ? 'bg-amber-400' : 'bg-fuchsia-400'
                }`}
              />
              <span className="w-40 shrink-0 text-slate-400">{it.atLabel}</span>
              <span className="text-slate-200">{it.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
