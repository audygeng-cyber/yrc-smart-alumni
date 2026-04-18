import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { triggerBrowserFileDownload } from '../../lib/adminFinanceDownload'
import { rowsToCsvText, type ActivityFilter } from '../../lib/adminFinanceHelpers'
import type { ActivityItem, ActivityLimit } from '../../lib/adminFinanceTypes'

type Params = {
  activityLog: ActivityItem[]
  activityFilter: ActivityFilter
  activitySearch: string
  activityLimit: ActivityLimit
  setActivityFilter: Dispatch<SetStateAction<ActivityFilter>>
  setActivitySearch: Dispatch<SetStateAction<string>>
  setActivityLimit: Dispatch<SetStateAction<ActivityLimit>>
  setMsg: Dispatch<SetStateAction<string | null>>
  addActivity: (level: ActivityItem['level'], message: string) => void
}

export function useFinanceActivityLogView({
  activityLog,
  activityFilter,
  activitySearch,
  activityLimit,
  setActivityFilter,
  setActivitySearch,
  setActivityLimit,
  setMsg,
  addActivity,
}: Params) {
  const filteredActivityLog = useMemo(() => {
    const keyword = activitySearch.trim().toLowerCase()
    return activityLog.filter((item) => {
      if (activityFilter !== 'all' && item.level !== activityFilter) return false
      if (!keyword) return true
      return `${item.at} ${item.atLabel} ${item.level} ${item.message}`.toLowerCase().includes(keyword)
    })
  }, [activityFilter, activityLog, activitySearch])

  const visibleActivityLog = useMemo(() => {
    if (activityLimit === 'all') return filteredActivityLog
    return filteredActivityLog.slice(0, activityLimit)
  }, [activityLimit, filteredActivityLog])

  const activitySnapshotAt = useMemo(
    () => visibleActivityLog[0]?.atLabel ?? '-',
    [visibleActivityLog],
  )

  const activityCounts = useMemo(
    () => ({
      all: activityLog.length,
      info: activityLog.filter((item) => item.level === 'info').length,
      warn: activityLog.filter((item) => item.level === 'warn').length,
      error: activityLog.filter((item) => item.level === 'error').length,
    }),
    [activityLog],
  )

  const activitySearchTrimmed = useMemo(() => activitySearch.trim(), [activitySearch])

  function exportActivityLogCsv() {
    if (!visibleActivityLog.length) {
      setMsg('ยังไม่มีบันทึกกิจกรรมสำหรับส่งออก')
      return
    }
    const rows = visibleActivityLog.map((it) => ({
      timestamp: it.at,
      display_time: it.atLabel,
      level: it.level,
      message: it.message,
    }))
    const csv = rowsToCsvText(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    triggerBrowserFileDownload(blob, 'finance-activity-log.csv')
    setMsg('ดาวน์โหลด finance-activity-log.csv (มุมมองปัจจุบัน) แล้ว')
    addActivity(
      'info',
      `ส่งออก Activity Log CSV (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
    )
  }

  async function copyActivityFilterSummary() {
    const summary = [
      'YRC Finance Activity Log View',
      `filter=${activityFilter}`,
      `keyword=${activitySearchTrimmed || '-'}`,
      `visible_count=${visibleActivityLog.length}`,
      `total_count=${activityLog.length}`,
      `limit=${activityLimit}`,
      `copied_at=${new Date().toLocaleString('th-TH')}`,
    ].join(' | ')

    try {
      await navigator.clipboard.writeText(summary)
      setMsg('คัดลอกสรุปตัวกรองกิจกรรมปัจจุบันแล้ว')
      addActivity(
        'info',
        `คัดลอกสรุปตัวกรองกิจกรรม (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
      )
    } catch {
      setMsg(`คัดลอกไม่สำเร็จ\n${summary}`)
      addActivity('warn', 'คัดลอกสรุปตัวกรองกิจกรรมไม่สำเร็จ')
    }
  }

  async function copyVisibleActivityRows() {
    if (!visibleActivityLog.length) {
      setMsg('ไม่มีบันทึกกิจกรรมที่แสดงอยู่สำหรับคัดลอก')
      return
    }

    const lines = [
      'YRC Finance Activity Log Rows',
      `filter=${activityFilter} | keyword=${activitySearchTrimmed || '-'} | visible=${visibleActivityLog.length} | limit=${activityLimit}`,
      ...visibleActivityLog.map((it) => `[${it.atLabel}] [${it.level}] ${it.message}`),
    ]
    const text = lines.join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกแถวกิจกรรมที่แสดงอยู่แล้ว')
      addActivity(
        'info',
        `คัดลอกแถวกิจกรรมที่แสดงอยู่ (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
      )
    } catch {
      setMsg(`คัดลอกไม่สำเร็จ\n${text}`)
      addActivity('warn', 'คัดลอกแถวกิจกรรมที่แสดงอยู่ไม่สำเร็จ')
    }
  }

  function applyIncidentPreset(nextFilter: Extract<ActivityFilter, 'warn' | 'error'>) {
    setActivityFilter(nextFilter)
    setActivitySearch('')
    setActivityLimit(10)
    addActivity('info', `พรีเซ็ตเหตุการณ์: ${nextFilter}`)
  }

  function resetActivityView() {
    setActivityFilter('all')
    setActivitySearch('')
    setActivityLimit(20)
    addActivity('info', 'รีเซ็ตมุมมองกิจกรรม')
  }

  return {
    visibleActivityLog,
    activitySnapshotAt,
    activityCounts,
    activitySearchTrimmed,
    exportActivityLogCsv,
    copyActivityFilterSummary,
    copyVisibleActivityRows,
    applyIncidentPreset,
    resetActivityView,
  }
}
