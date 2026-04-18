import { useEffect, useRef, useLayoutEffect } from 'react'
import { AUTO_REFRESH_MAX_FAILURES } from '../../lib/adminFinanceConstants'
import { formatFetchError, readApiJson } from '../../lib/adminHttp'
import type {
  ActivityItem,
  DonationsReportPayload,
  PlSummaryPayload,
} from '../../lib/adminFinanceTypes'
import type { Dispatch, SetStateAction } from 'react'

export type UseFinanceAutoRefreshParams = {
  base: string
  adminKey: string
  autoRefreshEnabled: boolean
  autoRefreshPausedByError: boolean
  autoRefreshSeconds: 30 | 60
  alertOnPause: boolean
  soundOnPause: boolean
  autoRefreshFailureCount: number
  getReportQueryString: () => string
  setPlSummary: Dispatch<SetStateAction<PlSummaryPayload | null>>
  setDonationsReport: Dispatch<SetStateAction<DonationsReportPayload | null>>
  setIsAutoRefreshing: Dispatch<SetStateAction<boolean>>
  setLastAutoRefreshAt: Dispatch<SetStateAction<string | null>>
  setLastAutoRefreshError: Dispatch<SetStateAction<string | null>>
  setAutoRefreshFailureCount: Dispatch<SetStateAction<number>>
  setAutoRefreshPausedByError: Dispatch<SetStateAction<boolean>>
  setAutoRefreshEnabled: Dispatch<SetStateAction<boolean>>
  addActivity: (level: ActivityItem['level'], message: string) => void
}

/** รีเฟรช P/L + รายงานบริจาคตามช่วงเวลา, แจ้งเตือนเมื่อหยุดเพราะ error ต่อเนื่อง */
export function useFinanceAutoRefresh(
  p: UseFinanceAutoRefreshParams,
): {
  toggleAutoRefresh: (enabled: boolean) => void
  resumeAutoRefresh: () => void
} {
  const {
    base,
    adminKey,
    autoRefreshEnabled,
    autoRefreshPausedByError,
    autoRefreshSeconds,
    alertOnPause,
    soundOnPause,
    autoRefreshFailureCount,
    getReportQueryString,
    setPlSummary,
    setDonationsReport,
    setIsAutoRefreshing,
    setLastAutoRefreshAt,
    setLastAutoRefreshError,
    setAutoRefreshFailureCount,
    setAutoRefreshPausedByError,
    setAutoRefreshEnabled,
    addActivity,
  } = p

  const pauseAlertSentRef = useRef(false)
  const addActivityRef = useRef(addActivity)
  useLayoutEffect(() => {
    addActivityRef.current = addActivity
  }, [addActivity])

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setIsAutoRefreshing(false)
      return
    }
    if (autoRefreshPausedByError) {
      setIsAutoRefreshing(false)
      return
    }
    if (!adminKey.trim()) return

    let cancelled = false
    const run = async () => {
      setIsAutoRefreshing(true)
      try {
        const q = getReportQueryString()
        const [plResp, donationsResp] = await Promise.all([
          fetch(`${base}/api/admin/finance/reports/pl-summary${q}`, {
            headers: { 'x-admin-key': adminKey.trim() },
          }),
          fetch(`${base}/api/admin/finance/reports/donations${q}`, {
            headers: { 'x-admin-key': adminKey.trim() },
          }),
        ])
        const [pl, donations] = await Promise.all([readApiJson(plResp), readApiJson(donationsResp)])
        if (cancelled) return
        if (!pl.ok || !donations.ok) {
          const errors: string[] = []
          if (!pl.ok) errors.push(formatFetchError('รีเฟรชอัตโนมัติ P/L', pl.status, pl.payload, pl.rawText))
          if (!donations.ok) {
            errors.push(
              formatFetchError(
                'รีเฟรชอัตโนมัติรายงานเงินบริจาค',
                donations.status,
                donations.payload,
                donations.rawText,
              ),
            )
          }
          setAutoRefreshFailureCount((prev) => {
            const next = prev + 1
            if (next >= AUTO_REFRESH_MAX_FAILURES) {
              setAutoRefreshPausedByError(true)
              setLastAutoRefreshError(
                `${errors.join('\n\n------------------------------\n\n')}\n\nรีเฟรชอัตโนมัติหยุดชั่วคราว (ผิดพลาดต่อเนื่อง ${next} ครั้ง)`,
              )
              addActivityRef.current('warn', `รีเฟรชอัตโนมัติหยุดชั่วคราว (ผิดพลาดต่อเนื่อง ${next} ครั้ง)`)
            } else {
              setLastAutoRefreshError(
                `${errors.join('\n\n------------------------------\n\n')}\n\nรีเฟรชอัตโนมัติผิดพลาดต่อเนื่อง ${next}/${AUTO_REFRESH_MAX_FAILURES}`,
              )
              addActivityRef.current('warn', `รีเฟรชอัตโนมัติผิดพลาด ${next}/${AUTO_REFRESH_MAX_FAILURES}`)
            }
            return next
          })
          return
        }
        setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
        setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
        setLastAutoRefreshAt(new Date().toLocaleTimeString('th-TH'))
        setLastAutoRefreshError(null)
        setAutoRefreshFailureCount(0)
        addActivityRef.current('info', 'รีเฟรชอัตโนมัติสำเร็จ')
      } catch {
        if (!cancelled) {
          setAutoRefreshFailureCount((prev) => {
            const next = prev + 1
            if (next >= AUTO_REFRESH_MAX_FAILURES) {
              setAutoRefreshPausedByError(true)
              setLastAutoRefreshError(
                `รีเฟรชอัตโนมัติเรียก API ไม่สำเร็จ\n\nรีเฟรชอัตโนมัติหยุดชั่วคราว (ผิดพลาดต่อเนื่อง ${next} ครั้ง)`,
              )
              addActivityRef.current('warn', `รีเฟรชอัตโนมัติหยุดชั่วคราว (เรียก API ล้มเหลว ${next} ครั้ง)`)
            } else {
              setLastAutoRefreshError(
                `รีเฟรชอัตโนมัติเรียก API ไม่สำเร็จ\n\nรีเฟรชอัตโนมัติผิดพลาดต่อเนื่อง ${next}/${AUTO_REFRESH_MAX_FAILURES}`,
              )
              addActivityRef.current('warn', `รีเฟรชอัตโนมัติเรียก API ไม่สำเร็จ ${next}/${AUTO_REFRESH_MAX_FAILURES}`)
            }
            return next
          })
        }
      } finally {
        if (!cancelled) setIsAutoRefreshing(false)
      }
    }

    void run()
    const timer = window.setInterval(() => {
      void run()
    }, autoRefreshSeconds * 1000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [
    adminKey,
    autoRefreshEnabled,
    autoRefreshPausedByError,
    autoRefreshSeconds,
    base,
    getReportQueryString,
    setAutoRefreshFailureCount,
    setAutoRefreshPausedByError,
    setDonationsReport,
    setIsAutoRefreshing,
    setLastAutoRefreshAt,
    setLastAutoRefreshError,
    setPlSummary,
  ])

  useEffect(() => {
    if (!autoRefreshPausedByError || pauseAlertSentRef.current) return

    if (alertOnPause && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('YRC Finance Auto Refresh Paused', {
          body: `รีเฟรชอัตโนมัติหยุดชั่วคราวหลังผิดพลาดต่อเนื่อง ${autoRefreshFailureCount} ครั้ง`,
        })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('YRC Finance Auto Refresh Paused', {
              body: `รีเฟรชอัตโนมัติหยุดชั่วคราวหลังผิดพลาดต่อเนื่อง ${autoRefreshFailureCount} ครั้ง`,
            })
          }
        })
      }
    }

    if (soundOnPause && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
        window.setTimeout(() => {
          void ctx.close()
        }, 400)
      }
    }

    pauseAlertSentRef.current = true
  }, [alertOnPause, autoRefreshFailureCount, autoRefreshPausedByError, soundOnPause])

  useEffect(() => {
    if (!autoRefreshPausedByError) pauseAlertSentRef.current = false
  }, [autoRefreshPausedByError])

  function toggleAutoRefresh(enabled: boolean) {
    setAutoRefreshEnabled(enabled)
    if (!enabled) {
      setAutoRefreshPausedByError(false)
      setAutoRefreshFailureCount(0)
      setLastAutoRefreshError(null)
      setIsAutoRefreshing(false)
      addActivity('info', 'ปิดรีเฟรชอัตโนมัติ')
      return
    }
    setAutoRefreshPausedByError(false)
    setAutoRefreshFailureCount(0)
    setLastAutoRefreshError(null)
    addActivity('info', 'เปิดรีเฟรชอัตโนมัติ')
  }

  function resumeAutoRefresh() {
    setAutoRefreshPausedByError(false)
    setAutoRefreshFailureCount(0)
    setLastAutoRefreshError(null)
    addActivity('info', 'เริ่มรีเฟรชอัตโนมัติอีกครั้ง')
  }

  return { toggleAutoRefresh, resumeAutoRefresh }
}
