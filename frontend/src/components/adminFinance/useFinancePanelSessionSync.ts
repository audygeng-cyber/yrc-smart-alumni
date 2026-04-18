import { useEffect } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY } from '../../lib/adminApi'
import {
  ACTIVITY_FILTER_KEY,
  ACTIVITY_LIMIT_KEY,
  ACTIVITY_LOG_KEY,
  ACTIVITY_SEARCH_KEY,
  AUTO_REFRESH_SETTINGS_KEY,
  REPORT_PRESETS_KEY,
} from '../../lib/adminFinanceConstants'
import type { ActivityFilter, ReportPreset } from '../../lib/adminFinanceHelpers'
import type { ActivityItem, ActivityLimit, AutoRefreshSettings } from '../../lib/adminFinanceTypes'
import type { Dispatch, SetStateAction } from 'react'

export type FinancePanelSessionSyncParams = {
  customPresets: ReportPreset[]
  activityLog: ActivityItem[]
  activityFilter: ActivityFilter
  activitySearch: string
  activityLimit: ActivityLimit
  autoRefreshEnabled: boolean
  autoRefreshSeconds: 30 | 60
  alertOnPause: boolean
  soundOnPause: boolean
  setAdminKey: Dispatch<SetStateAction<string>>
  setCustomPresets: Dispatch<SetStateAction<ReportPreset[]>>
  setActivityLog: Dispatch<SetStateAction<ActivityItem[]>>
  setActivityFilter: Dispatch<SetStateAction<ActivityFilter>>
  setActivitySearch: Dispatch<SetStateAction<string>>
  setActivityLimit: Dispatch<SetStateAction<ActivityLimit>>
  setAutoRefreshEnabled: Dispatch<SetStateAction<boolean>>
  setAutoRefreshSeconds: Dispatch<SetStateAction<30 | 60>>
  setAlertOnPause: Dispatch<SetStateAction<boolean>>
  setSoundOnPause: Dispatch<SetStateAction<boolean>>
}

/** โหลด/บันทึก presets, activity log, ตัวกรองกิจกรรม, และการตั้งค่ารีเฟรชอัตโนมัติลง sessionStorage */
export function useFinancePanelSessionSync(p: FinancePanelSessionSyncParams): void {
  const {
    customPresets,
    activityLog,
    activityFilter,
    activitySearch,
    activityLimit,
    autoRefreshEnabled,
    autoRefreshSeconds,
    alertOnPause,
    soundOnPause,
    setAdminKey,
    setCustomPresets,
    setActivityLog,
    setActivityFilter,
    setActivitySearch,
    setActivityLimit,
    setAutoRefreshEnabled,
    setAutoRefreshSeconds,
    setAlertOnPause,
    setSoundOnPause,
  } = p

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(ADMIN_UPLOAD_STORAGE_KEY) ?? '')
    const rawPresets = sessionStorage.getItem(REPORT_PRESETS_KEY)
    const rawActivity = sessionStorage.getItem(ACTIVITY_LOG_KEY)
    const rawAutoRefresh = sessionStorage.getItem(AUTO_REFRESH_SETTINGS_KEY)
    const rawActivityFilter = sessionStorage.getItem(ACTIVITY_FILTER_KEY)
    const rawActivitySearch = sessionStorage.getItem(ACTIVITY_SEARCH_KEY)
    const rawActivityLimit = sessionStorage.getItem(ACTIVITY_LIMIT_KEY)
    if (rawPresets) {
      try {
        const parsed = JSON.parse(rawPresets) as ReportPreset[]
        if (Array.isArray(parsed)) setCustomPresets(parsed)
      } catch {
        // ignore broken session storage payload
      }
    }
    try {
      if (rawActivity) {
        const parsed = JSON.parse(rawActivity) as Partial<ActivityItem>[]
        if (Array.isArray(parsed)) {
          setActivityLog(
            parsed
              .flatMap((item) => {
                if (
                  !item ||
                  typeof item.id !== 'string' ||
                  typeof item.at !== 'string' ||
                  (item.level !== 'info' && item.level !== 'warn' && item.level !== 'error') ||
                  typeof item.message !== 'string'
                ) {
                  return []
                }
                return [
                  {
                    id: item.id,
                    at: item.at,
                    atLabel: typeof item.atLabel === 'string' ? item.atLabel : item.at,
                    level: item.level,
                    message: item.message,
                  } satisfies ActivityItem,
                ]
              })
              .slice(0, 20),
          )
        }
      }
    } catch {
      // ignore broken session storage payload
    }
    try {
      if (rawAutoRefresh) {
        const parsed = JSON.parse(rawAutoRefresh) as Partial<AutoRefreshSettings>
        if (typeof parsed.enabled === 'boolean') setAutoRefreshEnabled(parsed.enabled)
        if (parsed.seconds === 30 || parsed.seconds === 60) setAutoRefreshSeconds(parsed.seconds)
        if (typeof parsed.alertOnPause === 'boolean') setAlertOnPause(parsed.alertOnPause)
        if (typeof parsed.soundOnPause === 'boolean') setSoundOnPause(parsed.soundOnPause)
      }
    } catch {
      // ignore broken session storage payload
    }
    if (
      rawActivityFilter === 'all' ||
      rawActivityFilter === 'info' ||
      rawActivityFilter === 'warn' ||
      rawActivityFilter === 'error'
    ) {
      setActivityFilter(rawActivityFilter)
    }
    if (typeof rawActivitySearch === 'string') {
      setActivitySearch(rawActivitySearch)
    }
    if (rawActivityLimit === '10' || rawActivityLimit === '20' || rawActivityLimit === 'all') {
      setActivityLimit(rawActivityLimit === 'all' ? 'all' : (Number(rawActivityLimit) as 10 | 20))
    }
  }, [
    setActivityFilter,
    setActivityLimit,
    setActivityLog,
    setActivitySearch,
    setAdminKey,
    setAlertOnPause,
    setAutoRefreshEnabled,
    setAutoRefreshSeconds,
    setCustomPresets,
    setSoundOnPause,
  ])

  useEffect(() => {
    sessionStorage.setItem(REPORT_PRESETS_KEY, JSON.stringify(customPresets))
  }, [customPresets])

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(activityLog))
  }, [activityLog])

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_FILTER_KEY, activityFilter)
  }, [activityFilter])

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_SEARCH_KEY, activitySearch)
  }, [activitySearch])

  useEffect(() => {
    sessionStorage.setItem(ACTIVITY_LIMIT_KEY, String(activityLimit))
  }, [activityLimit])

  useEffect(() => {
    const value: AutoRefreshSettings = {
      enabled: autoRefreshEnabled,
      seconds: autoRefreshSeconds,
      alertOnPause,
      soundOnPause,
    }
    sessionStorage.setItem(AUTO_REFRESH_SETTINGS_KEY, JSON.stringify(value))
  }, [alertOnPause, autoRefreshEnabled, autoRefreshSeconds, soundOnPause])
}
