import type { Dispatch, SetStateAction } from 'react'
import { AUTO_REFRESH_MAX_FAILURES } from '../../lib/adminFinanceConstants'
import { themeAccent } from '../../lib/themeTokens'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceAutoRefreshBarProps = {
  autoRefreshEnabled: boolean
  onToggleAutoRefresh: (enabled: boolean) => void
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
          aria-describedby="finance-auto-refresh-schedule-hint"
          aria-label="เปิดหรือปิดรีเฟรชรายงานอัตโนมัติ"
          className={portalFocusRing}
        />
        รีเฟรชรายงานอัตโนมัติ
      </label>
      <span
        id="finance-auto-refresh-schedule-hint"
        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
        title="รีเฟรชตามเวลาเครื่องของคุณ — ครั้งแรกทันทีเมื่อเปิด แล้วทุกต้นชั่วโมงถัดไป"
      >
        ทุกต้นชั่วโมง (เช่น 10:00, 11:00)
      </span>
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
          className={`tap-target rounded ${themeAccent.buttonPrimaryStrong} px-2 py-1 text-[11px] ${portalFocusRing}`}
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
