import type { Dispatch, SetStateAction } from 'react'
import { AUTO_REFRESH_MAX_FAILURES } from '../../lib/adminFinanceConstants'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceAutoRefreshBarProps = {
  autoRefreshEnabled: boolean
  onToggleAutoRefresh: (enabled: boolean) => void
  autoRefreshSeconds: 30 | 60
  setAutoRefreshSeconds: Dispatch<SetStateAction<30 | 60>>
  lastAutoRefreshAt: string | null
  autoRefreshPausedByError: boolean
  isAutoRefreshing: boolean
  autoRefreshFailureCount: number
  lastAutoRefreshError: string | null
  onResumeAutoRefresh: () => void
  alertOnPause: boolean
  setAlertOnPause: Dispatch<SetStateAction<boolean>>
  soundOnPause: boolean
  setSoundOnPause: Dispatch<SetStateAction<boolean>>
}

export function FinanceAutoRefreshBar({
  autoRefreshEnabled,
  onToggleAutoRefresh,
  autoRefreshSeconds,
  setAutoRefreshSeconds,
  lastAutoRefreshAt,
  autoRefreshPausedByError,
  isAutoRefreshing,
  autoRefreshFailureCount,
  lastAutoRefreshError,
  onResumeAutoRefresh,
  alertOnPause,
  setAlertOnPause,
  soundOnPause,
  setSoundOnPause,
}: FinanceAutoRefreshBarProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoRefreshEnabled}
          onChange={(e) => onToggleAutoRefresh(e.target.checked)}
          aria-label="เปิดหรือปิดรีเฟรชรายงานอัตโนมัติ"
          className={portalFocusRing}
        />
        รีเฟรชรายงานอัตโนมัติ
      </label>
      <select
        value={autoRefreshSeconds}
        onChange={(e) => setAutoRefreshSeconds(Number(e.target.value) as 30 | 60)}
        aria-label="เลือกรอบเวลารีเฟรชอัตโนมัติ"
        className={`rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs ${portalFocusRing}`}
        disabled={!autoRefreshEnabled}
      >
        <option value={30}>ทุก 30 วินาที</option>
        <option value={60}>ทุก 60 วินาที</option>
      </select>
      <span role="status" aria-live="polite" aria-atomic="true">
        ล่าสุด: {lastAutoRefreshAt ? lastAutoRefreshAt : '-'}
      </span>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`rounded px-2 py-1 text-[11px] ${
          !autoRefreshEnabled
            ? 'bg-slate-800 text-slate-300'
            : autoRefreshPausedByError
              ? 'bg-rose-900/70 text-rose-200'
              : isAutoRefreshing
                ? 'bg-amber-900/70 text-amber-200'
                : 'bg-emerald-900/70 text-emerald-200'
        }`}
      >
        {!autoRefreshEnabled
          ? 'ปิด'
          : autoRefreshPausedByError
            ? 'หยุดชั่วคราว'
            : isAutoRefreshing
              ? 'กำลังรีเฟรช...'
              : 'เปิด'}
      </span>
      {autoRefreshFailureCount > 0 ? (
        <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200" role="status" aria-live="polite" aria-atomic="true">
          ผิดพลาด {autoRefreshFailureCount}/{AUTO_REFRESH_MAX_FAILURES} ครั้ง
        </span>
      ) : null}
      {autoRefreshPausedByError ? (
        <button
          type="button"
          onClick={onResumeAutoRefresh}
          aria-label="ทำงานรีเฟรชอัตโนมัติต่อ"
          className={`rounded bg-emerald-700 px-2 py-1 text-[11px] text-white hover:bg-emerald-600 ${portalFocusRing}`}
        >
          ทำงานรีเฟรชอัตโนมัติต่อ
        </button>
      ) : null}
      {lastAutoRefreshError ? (
        <span className="w-full text-[11px] text-rose-300" role="alert">
          {lastAutoRefreshError}
        </span>
      ) : null}
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={alertOnPause}
          onChange={(e) => setAlertOnPause(e.target.checked)}
          aria-label="เปิดหรือปิดการแจ้งเตือนเดสก์ท็อปเมื่อรีเฟรชหยุดชั่วคราว"
          className={portalFocusRing}
        />
        แจ้งเตือนเดสก์ท็อป
      </label>
      <label className="flex items-center gap-1 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={soundOnPause}
          onChange={(e) => setSoundOnPause(e.target.checked)}
          aria-label="เปิดหรือปิดเสียงแจ้งเตือนเมื่อรีเฟรชหยุดชั่วคราว"
          className={portalFocusRing}
        />
        เสียงแจ้งเตือน
      </label>
    </div>
  )
}
