import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'yrc_admin_upload_key'
const PAGE_SIZE = 20
const REPORT_PRESETS_KEY = 'yrc_finance_report_presets_v1'
const ACTIVITY_LOG_KEY = 'yrc_finance_activity_log_v1'
const AUTO_REFRESH_SETTINGS_KEY = 'yrc_finance_auto_refresh_settings_v1'
const ACTIVITY_FILTER_KEY = 'yrc_finance_activity_filter_v1'
const ACTIVITY_SEARCH_KEY = 'yrc_finance_activity_search_v1'
const ACTIVITY_LIMIT_KEY = 'yrc_finance_activity_limit_v1'
const AUTO_REFRESH_MAX_FAILURES = 3

type Props = { apiBase: string }

type BankSigner = {
  id: string
  signer_name: string
  kbiz_name: string
  in_kbiz: boolean
  active: boolean
}

type BankAccount = {
  id: string
  legal_entity_id: string
  bank_name: string
  account_name: string
  account_no_masked: string
  signer_pool_size: number
  required_signers: number
  kbiz_enabled: boolean
  signers: BankSigner[]
}

type PendingPayment = {
  id: string
  legal_entity_id: string
  amount: number
  status: string
}

type OverviewPayload = {
  entities: { id: string; code: string; name_th: string }[]
  pendingPayments: PendingPayment[]
  donationByBatch: Record<string, number>
  donationByEntity: Record<string, number>
}

type PlSummaryPayload = {
  totals: { revenue: number; expense: number; netIncome: number }
  accountSummaries: {
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    net: number
  }[]
}

type DonationsReportPayload = {
  totals: { donations: number; totalAmount: number }
  byBatch: { batch: string; totalAmount: number }[]
  byEntity: { legalEntityCode: string; totalAmount: number }[]
  byDonor: { donorLabel: string; totalAmount: number; count: number }[]
}

type ReportFilterEntity = '' | 'association' | 'cram_school'
type SortDirection = 'asc' | 'desc'
type PlSortKey = 'absNet' | 'accountCode' | 'accountName' | 'accountType' | 'net'
type DonorSortKey = 'donorLabel' | 'count' | 'totalAmount'
type BatchSortKey = 'batch' | 'totalAmount'
type EntitySortKey = 'legalEntityCode' | 'totalAmount'
type ReportPreset = {
  id: string
  name: string
  legalEntityCode: ReportFilterEntity
  from: string
  to: string
  keyword: string
}
type ActivityItem = {
  id: string
  at: string
  atLabel: string
  level: 'info' | 'warn' | 'error'
  message: string
}
type ActivityFilter = 'all' | 'info' | 'warn' | 'error'
type ActivityLimit = 10 | 20 | 'all'
type AutoRefreshSettings = {
  enabled: boolean
  seconds: 30 | 60
  alertOnPause: boolean
  soundOnPause: boolean
}
const ACTIVITY_SHORTCUTS = [
  { label: 'Auto refresh', keyword: 'Auto refresh' },
  { label: 'Preset', keyword: 'preset' },
  { label: 'Reports', keyword: 'โหลดรายงาน' },
  { label: 'Export', keyword: 'Export' },
  { label: 'Meeting', keyword: 'ประชุม' },
  { label: 'Payment', keyword: 'คำขอจ่ายเงิน' },
] as const

function normalizeApiBase(base: string): string {
  return base.trim().replace(/\/+$/, '')
}

async function readApiJson(r: Response): Promise<{
  status: number
  ok: boolean
  payload: unknown
  rawText: string
}> {
  const rawText = await r.text()
  let payload: unknown = null
  const trimmed = rawText.trim()
  if (trimmed) {
    try {
      payload = JSON.parse(trimmed) as unknown
    } catch {
      payload = null
    }
  }
  return { status: r.status, ok: r.ok, payload, rawText }
}

function formatFetchError(label: string, status: number, payload: unknown, rawText: string): string {
  const jsonPart =
    payload !== null && payload !== undefined ? JSON.stringify(payload, null, 2) : '(ไม่ใช่ JSON หรือ body ว่าง)'
  return `${label} ไม่สำเร็จ — HTTP ${status}\n${jsonPart}\n\nดิบจากเซิร์ฟเวอร์:\n${rawText || '(ไม่มี body)'}`
}

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const activePage = Math.min(safePage, totalPages)
  const start = (activePage - 1) * pageSize
  return {
    pageRows: rows.slice(start, start + pageSize),
    page: activePage,
    totalPages,
  }
}

function csvEscapeCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsvText(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscapeCell(row[h])).join(','))
  }
  return `\uFEFF${lines.join('\n')}\n`
}

function formatDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatActivityTimestamp(d: Date): { at: string; atLabel: string } {
  return {
    at: d.toISOString(),
    atLabel: d.toLocaleString(),
  }
}

function buildBuiltinReportPresets(): ReportPreset[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = formatDateInputValue(now)
  const monthStart = formatDateInputValue(new Date(year, month, 1))
  const yearStart = formatDateInputValue(new Date(year, 0, 1))
  return [
    {
      id: 'builtin:association_month',
      name: 'สมาคม เดือนนี้',
      legalEntityCode: 'association',
      from: monthStart,
      to: today,
      keyword: '',
    },
    {
      id: 'builtin:cram_month',
      name: 'กวดวิชา เดือนนี้',
      legalEntityCode: 'cram_school',
      from: monthStart,
      to: today,
      keyword: '',
    },
    {
      id: 'builtin:all_year',
      name: 'ทั้งหมด ปีนี้',
      legalEntityCode: '',
      from: yearStart,
      to: today,
      keyword: '',
    },
  ]
}

export function AdminFinancePanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [plSummary, setPlSummary] = useState<PlSummaryPayload | null>(null)
  const [donationsReport, setDonationsReport] = useState<DonationsReportPayload | null>(null)
  const [reportEntity, setReportEntity] = useState<ReportFilterEntity>('')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [reportKeyword, setReportKeyword] = useState('')
  const [customPresets, setCustomPresets] = useState<ReportPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState('builtin:association_month')
  const [presetName, setPresetName] = useState('')
  const [plSortKey, setPlSortKey] = useState<PlSortKey>('absNet')
  const [plSortDir, setPlSortDir] = useState<SortDirection>('desc')
  const [donorSortKey, setDonorSortKey] = useState<DonorSortKey>('totalAmount')
  const [donorSortDir, setDonorSortDir] = useState<SortDirection>('desc')
  const [batchSortKey, setBatchSortKey] = useState<BatchSortKey>('totalAmount')
  const [batchSortDir, setBatchSortDir] = useState<SortDirection>('desc')
  const [entitySortKey, setEntitySortKey] = useState<EntitySortKey>('totalAmount')
  const [entitySortDir, setEntitySortDir] = useState<SortDirection>('desc')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<30 | 60>(30)
  const [lastAutoRefreshAt, setLastAutoRefreshAt] = useState<string | null>(null)
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)
  const [lastAutoRefreshError, setLastAutoRefreshError] = useState<string | null>(null)
  const [autoRefreshFailureCount, setAutoRefreshFailureCount] = useState(0)
  const [autoRefreshPausedByError, setAutoRefreshPausedByError] = useState(false)
  const [alertOnPause, setAlertOnPause] = useState(true)
  const [soundOnPause, setSoundOnPause] = useState(true)
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([])
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityLimit, setActivityLimit] = useState<ActivityLimit>(20)
  const [plPage, setPlPage] = useState(1)
  const [donorPage, setDonorPage] = useState(1)
  const [batchPage, setBatchPage] = useState(1)
  const [entityPage, setEntityPage] = useState(1)

  const [meetingEntity, setMeetingEntity] = useState<'association' | 'cram_school'>('association')
  const [meetingTitle, setMeetingTitle] = useState('ประชุมพิจารณารายการจ่ายเงิน')
  const [meetingExpected, setMeetingExpected] = useState('35')
  const [meetingId, setMeetingId] = useState('')
  const [meetingSummary, setMeetingSummary] = useState<string>('')
  const [attendanceName, setAttendanceName] = useState('')
  const [attendanceRole, setAttendanceRole] = useState<'committee' | 'cram_executive'>('committee')
  const [attendanceLineUid, setAttendanceLineUid] = useState('')

  const [paymentEntity, setPaymentEntity] = useState<'association' | 'cram_school'>('association')
  const [paymentPurpose, setPaymentPurpose] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('')
  const [paymentMeetingId, setPaymentMeetingId] = useState('')
  const [paymentRequestId, setPaymentRequestId] = useState('')

  const [approveSignerId, setApproveSignerId] = useState('')
  const [approveRoleCode, setApproveRoleCode] = useState<'bank_signer_3of5' | 'committee'>('bank_signer_3of5')
  const [approveDecision, setApproveDecision] = useState<'approve' | 'reject'>('approve')
  const builtinPresets = useMemo(() => buildBuiltinReportPresets(), [])
  const allPresets = useMemo(() => [...builtinPresets, ...customPresets], [builtinPresets, customPresets])
  const pauseAlertSentRef = useRef(false)

  function addActivity(level: ActivityItem['level'], message: string) {
    const stamp = formatActivityTimestamp(new Date())
    const next: ActivityItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: stamp.at,
      atLabel: stamp.atLabel,
      level,
      message,
    }
    setActivityLog((prev) => [next, ...prev].slice(0, 20))
  }

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_KEY) ?? '')
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
      if (!rawActivity) return
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
    } catch {
      // ignore broken session storage payload
    }
    try {
      if (!rawAutoRefresh) return
      const parsed = JSON.parse(rawAutoRefresh) as Partial<AutoRefreshSettings>
      if (typeof parsed.enabled === 'boolean') setAutoRefreshEnabled(parsed.enabled)
      if (parsed.seconds === 30 || parsed.seconds === 60) setAutoRefreshSeconds(parsed.seconds)
      if (typeof parsed.alertOnPause === 'boolean') setAlertOnPause(parsed.alertOnPause)
      if (typeof parsed.soundOnPause === 'boolean') setSoundOnPause(parsed.soundOnPause)
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
      setActivityLimit(rawActivityLimit === 'all' ? 'all' : Number(rawActivityLimit) as 10 | 20)
    }
  }, [])

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

  useEffect(() => {
    if (!allPresets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId(builtinPresets[0]?.id ?? '')
    }
  }, [allPresets, builtinPresets, selectedPresetId])

  const filteredAccounts = useMemo(() => {
    const ent = overview?.entities.find((e) => e.code === paymentEntity)
    if (!ent) return accounts
    return accounts.filter((a) => a.legal_entity_id === ent.id)
  }, [accounts, overview?.entities, paymentEntity])

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === paymentBankAccountId) ?? null,
    [accounts, paymentBankAccountId],
  )
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
  const reportKeywordNorm = useMemo(() => reportKeyword.trim().toLowerCase(), [reportKeyword])
  const sortArrow = (active: boolean, dir: SortDirection) => (active ? (dir === 'asc' ? ' ↑' : ' ↓') : '')

  const plRows = useMemo(() => {
    const rows = (plSummary?.accountSummaries ?? [])
      .slice()
      .sort((a, b) => {
        if (plSortKey === 'accountCode') return plSortDir === 'asc' ? a.accountCode.localeCompare(b.accountCode) : b.accountCode.localeCompare(a.accountCode)
        if (plSortKey === 'accountName') return plSortDir === 'asc' ? a.accountName.localeCompare(b.accountName) : b.accountName.localeCompare(a.accountName)
        if (plSortKey === 'accountType') return plSortDir === 'asc' ? a.accountType.localeCompare(b.accountType) : b.accountType.localeCompare(a.accountType)
        if (plSortKey === 'net') return plSortDir === 'asc' ? a.net - b.net : b.net - a.net
        const diff = Math.abs(a.net) - Math.abs(b.net)
        return plSortDir === 'asc' ? diff : -diff
      })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) =>
      `${r.accountCode} ${r.accountName} ${r.accountType}`.toLowerCase().includes(reportKeywordNorm),
    )
  }, [plSummary?.accountSummaries, reportKeywordNorm, plSortDir, plSortKey])
  const plPaged = useMemo(() => paginateRows(plRows, plPage, PAGE_SIZE), [plRows, plPage])

  const donorRows = useMemo(() => {
    const rows = (donationsReport?.byDonor ?? []).slice()
    rows.sort((a, b) => {
      if (donorSortKey === 'donorLabel') {
        return donorSortDir === 'asc'
          ? a.donorLabel.localeCompare(b.donorLabel)
          : b.donorLabel.localeCompare(a.donorLabel)
      }
      if (donorSortKey === 'count') return donorSortDir === 'asc' ? a.count - b.count : b.count - a.count
      return donorSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.donorLabel.toLowerCase().includes(reportKeywordNorm))
  }, [donationsReport?.byDonor, donorSortDir, donorSortKey, reportKeywordNorm])
  const donorPaged = useMemo(() => paginateRows(donorRows, donorPage, PAGE_SIZE), [donorRows, donorPage])

  const batchRows = useMemo(() => {
    const rows = (donationsReport?.byBatch ?? []).slice()
    rows.sort((a, b) => {
      if (batchSortKey === 'batch') return batchSortDir === 'asc' ? a.batch.localeCompare(b.batch) : b.batch.localeCompare(a.batch)
      return batchSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.batch.toLowerCase().includes(reportKeywordNorm))
  }, [batchSortDir, batchSortKey, donationsReport?.byBatch, reportKeywordNorm])
  const batchPaged = useMemo(() => paginateRows(batchRows, batchPage, PAGE_SIZE), [batchRows, batchPage])

  const entityRows = useMemo(() => {
    const rows = (donationsReport?.byEntity ?? []).slice()
    rows.sort((a, b) => {
      if (entitySortKey === 'legalEntityCode') {
        return entitySortDir === 'asc'
          ? a.legalEntityCode.localeCompare(b.legalEntityCode)
          : b.legalEntityCode.localeCompare(a.legalEntityCode)
      }
      return entitySortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.legalEntityCode.toLowerCase().includes(reportKeywordNorm))
  }, [donationsReport?.byEntity, entitySortDir, entitySortKey, reportKeywordNorm])
  const entityPaged = useMemo(() => paginateRows(entityRows, entityPage, PAGE_SIZE), [entityRows, entityPage])

  const plExportRows = useMemo(
    () =>
      plRows.map((r) => ({
        account_code: r.accountCode,
        account_name: r.accountName,
        account_type: r.accountType,
        debit: r.debit,
        credit: r.credit,
        net: r.net,
      })),
    [plRows],
  )

  const donorExportRows = useMemo(
    () =>
      donorRows.map((r) => ({
        donor: r.donorLabel,
        donation_count: r.count,
        total_amount: r.totalAmount,
      })),
    [donorRows],
  )

  const batchExportRows = useMemo(
    () =>
      batchRows.map((r) => ({
        batch: r.batch,
        total_amount: r.totalAmount,
      })),
    [batchRows],
  )

  const entityExportRows = useMemo(
    () =>
      entityRows.map((r) => ({
        legal_entity_code: r.legalEntityCode,
        total_amount: r.totalAmount,
      })),
    [entityRows],
  )

  useEffect(() => {
    setPlPage(1)
    setDonorPage(1)
    setBatchPage(1)
    setEntityPage(1)
  }, [reportKeywordNorm])

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
        const q = buildReportQueryStringFromValues(reportEntity, reportFrom, reportTo)
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
          if (!pl.ok) errors.push(formatFetchError('Auto refresh P/L', pl.status, pl.payload, pl.rawText))
          if (!donations.ok) {
            errors.push(
              formatFetchError(
                'Auto refresh donations',
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
                `${errors.join('\n\n------------------------------\n\n')}\n\nAuto refresh หยุดชั่วคราว (error ต่อเนื่อง ${next} ครั้ง)`,
              )
              addActivity('warn', `Auto refresh pause (error ต่อเนื่อง ${next} ครั้ง)`)
            } else {
              setLastAutoRefreshError(
                `${errors.join('\n\n------------------------------\n\n')}\n\nAuto refresh ผิดพลาดต่อเนื่อง ${next}/${AUTO_REFRESH_MAX_FAILURES}`,
              )
              addActivity('warn', `Auto refresh ผิดพลาด ${next}/${AUTO_REFRESH_MAX_FAILURES}`)
            }
            return next
          })
          return
        }
        setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
        setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
        setLastAutoRefreshAt(new Date().toLocaleTimeString())
        setLastAutoRefreshError(null)
        setAutoRefreshFailureCount(0)
        addActivity('info', 'Auto refresh สำเร็จ')
      } catch {
        if (!cancelled) {
          setAutoRefreshFailureCount((prev) => {
            const next = prev + 1
            if (next >= AUTO_REFRESH_MAX_FAILURES) {
              setAutoRefreshPausedByError(true)
              setLastAutoRefreshError(
                `Auto refresh เรียก API ไม่สำเร็จ\n\nAuto refresh หยุดชั่วคราว (error ต่อเนื่อง ${next} ครั้ง)`,
              )
              addActivity('warn', `Auto refresh pause (เรียก API ล้มเหลว ${next} ครั้ง)`)
            } else {
              setLastAutoRefreshError(
                `Auto refresh เรียก API ไม่สำเร็จ\n\nAuto refresh ผิดพลาดต่อเนื่อง ${next}/${AUTO_REFRESH_MAX_FAILURES}`,
              )
              addActivity('warn', `Auto refresh เรียก API ไม่สำเร็จ ${next}/${AUTO_REFRESH_MAX_FAILURES}`)
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
    reportEntity,
    reportFrom,
    reportTo,
  ])

  useEffect(() => {
    if (!autoRefreshPausedByError || pauseAlertSentRef.current) return

    if (alertOnPause && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('YRC Finance Auto Refresh Paused', {
          body: `Auto refresh หยุดชั่วคราวหลัง error ต่อเนื่อง ${autoRefreshFailureCount} ครั้ง`,
        })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('YRC Finance Auto Refresh Paused', {
              body: `Auto refresh หยุดชั่วคราวหลัง error ต่อเนื่อง ${autoRefreshFailureCount} ครั้ง`,
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
      addActivity('info', 'ปิด Auto refresh')
      return
    }
    setAutoRefreshPausedByError(false)
    setAutoRefreshFailureCount(0)
    setLastAutoRefreshError(null)
    addActivity('info', 'เปิด Auto refresh')
  }

  function resumeAutoRefresh() {
    setAutoRefreshPausedByError(false)
    setAutoRefreshFailureCount(0)
    setLastAutoRefreshError(null)
    addActivity('info', 'Resume Auto refresh')
  }

  function togglePlSort(nextKey: PlSortKey) {
    if (plSortKey === nextKey) {
      setPlSortDir((cur) => (cur === 'asc' ? 'desc' : 'asc'))
      return
    }
    setPlSortKey(nextKey)
    setPlSortDir(nextKey === 'absNet' || nextKey === 'net' ? 'desc' : 'asc')
  }

  function toggleDonorSort(nextKey: DonorSortKey) {
    if (donorSortKey === nextKey) {
      setDonorSortDir((cur) => (cur === 'asc' ? 'desc' : 'asc'))
      return
    }
    setDonorSortKey(nextKey)
    setDonorSortDir(nextKey === 'donorLabel' ? 'asc' : 'desc')
  }

  function toggleBatchSort(nextKey: BatchSortKey) {
    if (batchSortKey === nextKey) {
      setBatchSortDir((cur) => (cur === 'asc' ? 'desc' : 'asc'))
      return
    }
    setBatchSortKey(nextKey)
    setBatchSortDir(nextKey === 'batch' ? 'asc' : 'desc')
  }

  function toggleEntitySort(nextKey: EntitySortKey) {
    if (entitySortKey === nextKey) {
      setEntitySortDir((cur) => (cur === 'asc' ? 'desc' : 'asc'))
      return
    }
    setEntitySortKey(nextKey)
    setEntitySortDir(nextKey === 'legalEntityCode' ? 'asc' : 'desc')
  }

  function buildReportQueryString() {
    return buildReportQueryStringFromValues(reportEntity, reportFrom, reportTo)
  }

  function buildReportQueryStringFromValues(entity: ReportFilterEntity, from: string, to: string) {
    const q = new URLSearchParams()
    if (entity) q.set('legal_entity_code', entity)
    if (from.trim()) q.set('from', from.trim())
    if (to.trim()) q.set('to', to.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  function renderPager(page: number, totalPages: number, onPage: (next: number) => void) {
    return (
      <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-slate-400">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40"
        >
          Prev
        </button>
        <span>
          Page {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    )
  }

  function applyPreset(preset: ReportPreset) {
    setReportEntity(preset.legalEntityCode)
    setReportFrom(preset.from)
    setReportTo(preset.to)
    setReportKeyword(preset.keyword)
    setPlPage(1)
    setDonorPage(1)
    setBatchPage(1)
    setEntityPage(1)
    setMsg(`ใช้ preset แล้ว: ${preset.name}`)
    addActivity('info', `ใช้ preset: ${preset.name}`)
  }

  function applySelectedPreset() {
    const preset = allPresets.find((p) => p.id === selectedPresetId)
    if (!preset) {
      setMsg('ไม่พบ preset ที่เลือก')
      return
    }
    applyPreset(preset)
  }

  async function applySelectedPresetAndLoad() {
    const preset = allPresets.find((p) => p.id === selectedPresetId)
    if (!preset) {
      setMsg('ไม่พบ preset ที่เลือก')
      return
    }
    applyPreset(preset)
    if (!adminKey.trim()) return setMsg('ใช้ preset แล้ว — ใส่ x-admin-key ก่อนโหลดรายงาน')

    setLoading(true)
    setMsg(null)
    try {
      const q = buildReportQueryStringFromValues(preset.legalEntityCode, preset.from, preset.to)
      const [plResp, donationsResp] = await Promise.all([
        fetch(`${base}/api/admin/finance/reports/pl-summary${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
        fetch(`${base}/api/admin/finance/reports/donations${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
      ])
      const [pl, donations] = await Promise.all([readApiJson(plResp), readApiJson(donationsResp)])
      if (!pl.ok || !donations.ok) {
        const errors: string[] = []
        if (!pl.ok) errors.push(formatFetchError('โหลด P/L summary', pl.status, pl.payload, pl.rawText))
        if (!donations.ok) {
          errors.push(
            formatFetchError('โหลด donations dashboard', donations.status, donations.payload, donations.rawText),
          )
        }
        setMsg(errors.join('\n\n------------------------------\n\n'))
        addActivity('warn', `ใช้ preset + โหลดทันทีล้มเหลวบางส่วน: ${preset.name}`)
        return
      }
      setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
      setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
      setPlPage(1)
      setDonorPage(1)
      setBatchPage(1)
      setEntityPage(1)
      setMsg(`ใช้ preset และโหลดรายงานแล้ว: ${preset.name}`)
      addActivity('info', `ใช้ preset + โหลดทันทีสำเร็จ: ${preset.name}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ใช้ preset + โหลดทันทีไม่สำเร็จ: ${preset.name}`)
    } finally {
      setLoading(false)
    }
  }

  function saveCurrentPreset() {
    const name = presetName.trim()
    if (!name) {
      setMsg('กรอกชื่อ preset ก่อนบันทึก')
      return
    }
    const id = `custom:${Date.now()}`
    const nextPreset: ReportPreset = {
      id,
      name,
      legalEntityCode: reportEntity,
      from: reportFrom,
      to: reportTo,
      keyword: reportKeyword,
    }
    setCustomPresets((cur) => [nextPreset, ...cur])
    setSelectedPresetId(id)
    setPresetName('')
    setMsg(`บันทึก preset แล้ว: ${name}`)
    addActivity('info', `บันทึก preset: ${name}`)
  }

  function deleteSelectedPreset() {
    if (!selectedPresetId.startsWith('custom:')) {
      setMsg('ลบได้เฉพาะ preset ที่บันทึกเอง')
      return
    }
    const target = customPresets.find((p) => p.id === selectedPresetId)
    if (!target) {
      setMsg('ไม่พบ preset ที่เลือก')
      return
    }
    setCustomPresets((cur) => cur.filter((p) => p.id !== selectedPresetId))
    setSelectedPresetId(builtinPresets[0]?.id ?? '')
    setMsg(`ลบ preset แล้ว: ${target.name}`)
    addActivity('warn', `ลบ preset: ${target.name}`)
  }

  function downloadCurrentViewCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) {
      setMsg(`ไม่มีข้อมูลสำหรับ export: ${filename}`)
      return
    }
    const csv = rowsToCsvText(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg(`ดาวน์โหลด ${filename} (current view) แล้ว`)
  }

  function exportActivityLogCsv() {
    if (!visibleActivityLog.length) {
      setMsg('ยังไม่มี activity log สำหรับ export')
      return
    }
    const rows = visibleActivityLog.map((it) => ({
      timestamp: it.at,
      display_time: it.atLabel,
      level: it.level,
      message: it.message,
    }))
    downloadCurrentViewCsv('finance-activity-log.csv', rows)
    addActivity(
      'info',
      `Export Activity Log CSV (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
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
      `copied_at=${new Date().toLocaleString()}`,
    ].join(' | ')

    try {
      await navigator.clipboard.writeText(summary)
      setMsg('คัดลอกสรุป current activity filter แล้ว')
      addActivity(
        'info',
        `Copy Activity Filter Summary (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
      )
    } catch {
      setMsg(`คัดลอกไม่สำเร็จ\n${summary}`)
      addActivity('warn', 'Copy Activity Filter Summary ไม่สำเร็จ')
    }
  }

  async function copyVisibleActivityRows() {
    if (!visibleActivityLog.length) {
      setMsg('ไม่มี activity log ที่มองเห็นอยู่สำหรับคัดลอก')
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
      setMsg('คัดลอก visible activity rows แล้ว')
      addActivity(
        'info',
        `Copy Visible Activity Rows (${activityFilter}${activitySearchTrimmed ? `, q=${activitySearchTrimmed}` : ''}, limit=${activityLimit})`,
      )
    } catch {
      setMsg(`คัดลอกไม่สำเร็จ\n${text}`)
      addActivity('warn', 'Copy Visible Activity Rows ไม่สำเร็จ')
    }
  }

  function applyIncidentPreset(nextFilter: Extract<ActivityFilter, 'warn' | 'error'>) {
    setActivityFilter(nextFilter)
    setActivitySearch('')
    setActivityLimit(10)
    addActivity('info', `Incident preset: ${nextFilter}`)
  }

  async function loadOverviewAndAccounts() {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r1 = await fetch(`${base}/api/admin/finance/overview`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p1 = await readApiJson(r1)
      if (!p1.ok) {
        setMsg(formatFetchError('โหลดภาพรวม Finance', p1.status, p1.payload, p1.rawText))
        return
      }
      setOverview((p1.payload ?? null) as OverviewPayload | null)

      const r2 = await fetch(`${base}/api/admin/finance/bank-accounts`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p2 = await readApiJson(r2)
      if (!p2.ok) {
        setMsg(formatFetchError('โหลดบัญชีธนาคาร', p2.status, p2.payload, p2.rawText))
        return
      }
      const data = (p2.payload ?? {}) as { accounts?: BankAccount[] }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setMsg('โหลดภาพรวมและบัญชีธนาคารแล้ว')
      addActivity('info', 'โหลด Overview + Bank Accounts สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลด Overview + Bank Accounts ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadPlSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/reports/pl-summary${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลด P/L summary', p.status, p.payload, p.rawText))
      setPlSummary((p.payload ?? null) as PlSummaryPayload | null)
      setPlPage(1)
      setMsg('โหลดรายงาน P/L แล้ว')
      addActivity('info', 'โหลดรายงาน P/L สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายงาน P/L ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadDonationsReport() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/reports/donations${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลด donations dashboard', p.status, p.payload, p.rawText))
      setDonationsReport((p.payload ?? null) as DonationsReportPayload | null)
      setDonorPage(1)
      setBatchPage(1)
      setEntityPage(1)
      setMsg('โหลด donations dashboard แล้ว')
      addActivity('info', 'โหลด Donations dashboard สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลด Donations dashboard ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllReports() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const q = buildReportQueryString()
      const [plResp, donationsResp] = await Promise.all([
        fetch(`${base}/api/admin/finance/reports/pl-summary${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
        fetch(`${base}/api/admin/finance/reports/donations${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
      ])
      const [pl, donations] = await Promise.all([readApiJson(plResp), readApiJson(donationsResp)])

      const errors: string[] = []
      if (pl.ok) {
        setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
        setPlPage(1)
      } else {
        errors.push(formatFetchError('โหลด P/L summary', pl.status, pl.payload, pl.rawText))
      }

      if (donations.ok) {
        setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
        setDonorPage(1)
        setBatchPage(1)
        setEntityPage(1)
      } else {
        errors.push(
          formatFetchError('โหลด donations dashboard', donations.status, donations.payload, donations.rawText),
        )
      }

      if (errors.length > 0) {
        setMsg(errors.join('\n\n------------------------------\n\n'))
        addActivity('warn', 'โหลดรายงานทั้งหมดบางส่วนไม่สำเร็จ')
        return
      }

      setMsg('โหลดรายงานทั้งหมดแล้ว (P/L + Donations)')
      addActivity('info', 'โหลดรายงานทั้งหมดสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายงานทั้งหมดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function downloadCsv(path: string, filename: string) {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}${path}${buildReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const blob = await r.blob()
      if (!r.ok) {
        const txt = await blob.text().catch(() => '')
        setMsg(`ดาวน์โหลด ${filename} ไม่สำเร็จ — HTTP ${r.status}\n${txt}`)
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg(`ดาวน์โหลด ${filename} แล้ว`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeeting() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    const expected = Number(meetingExpected)
    if (!meetingTitle.trim() || !Number.isFinite(expected) || expected <= 0) {
      return setMsg('กรอกชื่อประชุม และ expected participants > 0')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: meetingEntity,
          title: meetingTitle.trim(),
          expected_participants: expected,
          created_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) {
        addActivity('error', `สร้างประชุมไม่สำเร็จ: ${meetingTitle.trim()}`)
        return setMsg(formatFetchError('สร้างประชุม', p.status, p.payload, p.rawText))
      }
      const j = (p.payload ?? {}) as { meetingSession?: { id?: string }; quorumRequired?: number }
      if (j.meetingSession?.id) {
        setMeetingId(j.meetingSession.id)
        setPaymentMeetingId(j.meetingSession.id)
      }
      setMsg(`สร้างประชุมแล้ว quorum required=${String(j.quorumRequired ?? '')}`)
      addActivity('info', `สร้างประชุมสำเร็จ: ${meetingTitle.trim()} (${meetingEntity})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างประชุมไม่สำเร็จ: ${meetingTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function signAttendance() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!meetingId.trim() || !attendanceName.trim()) return setMsg('กรอก Meeting ID และชื่อผู้เข้าประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/sign-attendance`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendee_name: attendanceName.trim(),
          attendee_role_code: attendanceRole,
          line_uid: attendanceLineUid.trim() || undefined,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) {
        addActivity('error', `ลงชื่อเข้าประชุมไม่สำเร็จ: ${attendanceName.trim()}`)
        return setMsg(formatFetchError('ลงชื่อเข้าประชุม', p.status, p.payload, p.rawText))
      }
      setMsg('ลงชื่อเข้าประชุมแล้ว')
      addActivity('info', `ลงชื่อเข้าประชุมสำเร็จ: ${attendanceName.trim()} (${attendanceRole})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลงชื่อเข้าประชุมไม่สำเร็จ: ${attendanceName.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอก Meeting ID')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/summary`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สรุปประชุม', p.status, p.payload, p.rawText))
      setMeetingSummary(JSON.stringify(p.payload, null, 2))
      setMsg('โหลดสรุปประชุมแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createPaymentRequest() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    const amount = Number(paymentAmount)
    if (!paymentPurpose.trim() || !Number.isFinite(amount) || amount <= 0) {
      return setMsg('กรอก purpose และ amount > 0')
    }
    if (amount <= 20000 && !paymentBankAccountId) {
      return setMsg('ยอด <= 20,000 ต้องเลือก bank account')
    }
    if (amount > 20000 && !paymentMeetingId.trim()) {
      return setMsg('ยอด > 20,000 ต้องกรอก Meeting ID')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/payment-requests`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: paymentEntity,
          purpose: paymentPurpose.trim(),
          amount,
          bank_account_id: amount <= 20000 ? paymentBankAccountId : undefined,
          meeting_session_id: amount > 20000 ? paymentMeetingId.trim() : undefined,
          requested_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) {
        addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()} (${amount.toLocaleString()})`)
        return setMsg(formatFetchError('สร้างคำขอจ่ายเงิน', p.status, p.payload, p.rawText))
      }
      const j = (p.payload ?? {}) as { paymentRequest?: { id?: string } }
      if (j.paymentRequest?.id) setPaymentRequestId(j.paymentRequest.id)
      setMsg('สร้างคำขอจ่ายเงินแล้ว')
      addActivity('info', `สร้างคำขอจ่ายเงินสำเร็จ: ${paymentPurpose.trim()} (${amount.toLocaleString()})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function approvePayment() {
    if (!adminKey.trim()) return setMsg('ใส่ x-admin-key ก่อน')
    if (!paymentRequestId.trim()) return setMsg('กรอก Payment Request ID')
    if (approveRoleCode === 'bank_signer_3of5' && !approveSignerId.trim()) {
      return setMsg('เลือก signer สำหรับ 3 ใน 5')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/payment-requests/${paymentRequestId.trim()}/approve`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_role_code: approveRoleCode,
          approver_signer_id: approveRoleCode === 'bank_signer_3of5' ? approveSignerId.trim() : undefined,
          approver_name: approveRoleCode === 'committee' ? 'committee-voter' : undefined,
          decision: approveDecision,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) {
        addActivity(
          'error',
          `อนุมัติรายการไม่สำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
        )
        return setMsg(formatFetchError('อนุมัติรายการ', p.status, p.payload, p.rawText))
      }
      setMsg(JSON.stringify(p.payload, null, 2))
      addActivity(
        approveDecision === 'approve' ? 'info' : 'warn',
        `บันทึกการตัดสินคำขอสำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
      )
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity(
        'error',
        `อนุมัติรายการไม่สำเร็จ: ${paymentRequestId.trim()} (${approveRoleCode}/${approveDecision})`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-emerald-200/90">
        Admin Finance — บัญชี/ประชุม/อนุมัติจ่ายเงิน
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ใช้คีย์เดียวกับ Admin panel ด้านบน (อ่านจาก session เดียวกัน)
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={loadOverviewAndAccounts}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          โหลด Overview + Bank Accounts
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={loadPlSummary}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          โหลด P/L Summary
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={loadDonationsReport}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          โหลด Donations Dashboard
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={loadAllReports}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          โหลดรายงานทั้งหมด
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => downloadCsv('/api/admin/finance/exports/donations.csv', 'finance-donations.csv')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Donations CSV
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            downloadCsv('/api/admin/finance/exports/payment-requests.csv', 'finance-payment-requests.csv')
          }
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Payment Requests CSV
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => downloadCsv('/api/admin/finance/exports/meeting-sessions.csv', 'finance-meeting-sessions.csv')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Export Meeting Sessions CSV
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRefreshEnabled}
            onChange={(e) => toggleAutoRefresh(e.target.checked)}
          />
          Auto refresh รายงาน
        </label>
        <select
          value={autoRefreshSeconds}
          onChange={(e) => setAutoRefreshSeconds(Number(e.target.value) as 30 | 60)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
          disabled={!autoRefreshEnabled}
        >
          <option value={30}>ทุก 30 วินาที</option>
          <option value={60}>ทุก 60 วินาที</option>
        </select>
        <span>
          ล่าสุด: {lastAutoRefreshAt ? lastAutoRefreshAt : '-'}
        </span>
        <span
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
          <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
            fail {autoRefreshFailureCount}/{AUTO_REFRESH_MAX_FAILURES}
          </span>
        ) : null}
        {autoRefreshPausedByError ? (
          <button
            type="button"
            onClick={resumeAutoRefresh}
            className="rounded bg-emerald-700 px-2 py-1 text-[11px] text-white hover:bg-emerald-600"
          >
            Resume Auto Refresh
          </button>
        ) : null}
        {lastAutoRefreshError ? (
          <span className="w-full text-[11px] text-rose-300">{lastAutoRefreshError}</span>
        ) : null}
        <label className="flex items-center gap-1 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={alertOnPause}
            onChange={(e) => setAlertOnPause(e.target.checked)}
          />
          desktop alert
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={soundOnPause}
            onChange={(e) => setSoundOnPause(e.target.checked)}
          />
          sound alert
        </label>
      </div>

      <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-200">Activity Log (ล่าสุด 20)</p>
            <input
              type="text"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              className="w-48 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
              placeholder="ค้นหา log..."
            />
            <select
              value={String(activityLimit)}
              onChange={(e) => setActivityLimit(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 10 | 20))}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="all">all</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyActivityFilterSummary}
              className="rounded bg-cyan-700 px-2 py-1 text-[11px] text-white hover:bg-cyan-600"
            >
              Copy Summary
            </button>
            <button
              type="button"
              onClick={copyVisibleActivityRows}
              className="rounded bg-sky-700 px-2 py-1 text-[11px] text-white hover:bg-sky-600"
            >
              Copy Rows
            </button>
            <button
              type="button"
              onClick={exportActivityLogCsv}
              className="rounded bg-emerald-700 px-2 py-1 text-[11px] text-white hover:bg-emerald-600"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setActivityLog([])}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyIncidentPreset('error')}
            className="rounded bg-rose-700 px-2 py-1 text-[11px] text-white hover:bg-rose-600"
          >
            Only Errors
          </button>
          <button
            type="button"
            onClick={() => applyIncidentPreset('warn')}
            className="rounded bg-amber-700 px-2 py-1 text-[11px] text-white hover:bg-amber-600"
          >
            Only Warnings
          </button>
          {ACTIVITY_SHORTCUTS.map((shortcut) => {
            const active = activitySearchTrimmed.toLowerCase() === shortcut.keyword.toLowerCase()
            return (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setActivitySearch(shortcut.keyword)}
                className={`rounded px-2 py-1 text-[11px] ${
                  active
                    ? 'bg-cyan-900/70 text-cyan-200 ring-1 ring-white/30'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {shortcut.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setActivitySearch('')}
            className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
          >
            Clear Search
          </button>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {([
            ['all', activityCounts.all, 'bg-slate-800 text-slate-100'],
            ['info', activityCounts.info, 'bg-emerald-900/70 text-emerald-200'],
            ['warn', activityCounts.warn, 'bg-amber-900/70 text-amber-200'],
            ['error', activityCounts.error, 'bg-rose-900/70 text-rose-200'],
          ] as const).map(([level, count, color]) => (
            <button
              key={level}
              type="button"
              onClick={() => setActivityFilter(level)}
              className={`rounded px-2 py-1 text-[11px] ${
                activityFilter === level ? `${color} ring-1 ring-white/30` : color
              }`}
            >
              {level}: {count}
            </button>
          ))}
        </div>
        {visibleActivityLog.length === 0 ? (
          <p className="text-[11px] text-slate-500">ยังไม่มีเหตุการณ์</p>
        ) : (
          <div className="max-h-36 space-y-1 overflow-auto">
            {visibleActivityLog.map((it) => (
              <div key={it.id} className="flex items-start gap-2 text-[11px]">
                <span
                  className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                    it.level === 'error'
                      ? 'bg-rose-400'
                      : it.level === 'warn'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                />
                <span className="w-40 shrink-0 text-slate-500">{it.atLabel}</span>
                <span className="text-slate-200">{it.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs md:grid-cols-5">
        <select
          value={reportEntity}
          onChange={(e) => setReportEntity(e.target.value as ReportFilterEntity)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="">ทุกหน่วยงาน (ทั้งหมด)</option>
          <option value="association">association</option>
          <option value="cram_school">cram_school</option>
        </select>
        <input
          type="date"
          value={reportFrom}
          onChange={(e) => setReportFrom(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="from"
        />
        <input
          type="date"
          value={reportTo}
          onChange={(e) => setReportTo(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="to"
        />
        <input
          type="text"
          value={reportKeyword}
          onChange={(e) => setReportKeyword(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="ค้นหา donor / batch / account"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setReportEntity('')
            setReportFrom('')
            setReportTo('')
            setReportKeyword('')
          }}
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
        >
          ล้างตัวกรองรายงาน
        </button>
      </div>

      <div className="mt-2 grid gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs md:grid-cols-5">
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        >
          {allPresets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id.startsWith('custom:') ? `[custom] ${p.name}` : `[builtin] ${p.name}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={applySelectedPreset}
          className="rounded bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
        >
          ใช้ preset
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={applySelectedPresetAndLoad}
          className="rounded bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          ใช้ preset + โหลดทันที
        </button>
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          placeholder="ชื่อ preset ใหม่"
        />
        <button
          type="button"
          disabled={loading}
          onClick={saveCurrentPreset}
          className="rounded bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          บันทึก preset ปัจจุบัน
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={deleteSelectedPreset}
          className="rounded bg-rose-700 px-3 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-50"
        >
          ลบ preset ที่เลือก
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">
        <p>Bank Accounts: {accounts.length}</p>
        {overview ? (
          <>
            <p className="mt-1">Pending payments: {overview.pendingPayments.length}</p>
            <p className="mt-1">
              Donation batches: {Object.keys(overview.donationByBatch).length} | Donation total:{' '}
              {Object.values(overview.donationByBatch)
                .reduce((s, n) => s + n, 0)
                .toLocaleString()}
            </p>
          </>
        ) : null}
        {plSummary ? (
          <p className="mt-1">
            P/L: Revenue {plSummary.totals.revenue.toLocaleString()} | Expense{' '}
            {plSummary.totals.expense.toLocaleString()} | Net {plSummary.totals.netIncome.toLocaleString()}
          </p>
        ) : null}
        {donationsReport ? (
          <p className="mt-1">
            Donations: {donationsReport.totals.donations} รายการ | Total{' '}
            {donationsReport.totals.totalAmount.toLocaleString()}
          </p>
        ) : null}
      </div>

      {plSummary ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium">P/L Accounts (ทั้งหมด)</p>
            <button
              type="button"
              onClick={() => downloadCurrentViewCsv('finance-current-pl.csv', plExportRows)}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              Export Current View CSV
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 font-semibold text-slate-400">
            <button type="button" onClick={() => togglePlSort('accountCode')} className="text-left hover:text-slate-200">
              Code{sortArrow(plSortKey === 'accountCode', plSortDir)}
            </button>
            <button type="button" onClick={() => togglePlSort('accountName')} className="text-left hover:text-slate-200">
              Name{sortArrow(plSortKey === 'accountName', plSortDir)}
            </button>
            <button type="button" onClick={() => togglePlSort('accountType')} className="text-left hover:text-slate-200">
              Type{sortArrow(plSortKey === 'accountType', plSortDir)}
            </button>
            <button
              type="button"
              onClick={() => togglePlSort('net')}
              className="text-right hover:text-slate-200"
            >
              Net{sortArrow(plSortKey === 'net', plSortDir)}
            </button>
          </div>
          {plPaged.pageRows.map((r) => (
            <div key={`${r.accountCode}:${r.accountName}`} className="grid grid-cols-4 gap-2 py-1">
              <span>{r.accountCode}</span>
              <span>{r.accountName}</span>
              <span>{r.accountType}</span>
              <span className="text-right">{r.net.toLocaleString()}</span>
            </div>
          ))}
          {renderPager(plPaged.page, plPaged.totalPages, setPlPage)}
        </div>
      ) : null}

      {donationsReport ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium">Donors (ทั้งหมด)</p>
              <button
                type="button"
                onClick={() => downloadCurrentViewCsv('finance-current-donors.csv', donorExportRows)}
                className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                Export Current View CSV
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 font-semibold text-slate-400">
              <button
                type="button"
                onClick={() => toggleDonorSort('donorLabel')}
                className="text-left hover:text-slate-200"
              >
                Donor{sortArrow(donorSortKey === 'donorLabel', donorSortDir)}
              </button>
              <button
                type="button"
                onClick={() => toggleDonorSort('count')}
                className="text-right hover:text-slate-200"
              >
                Count{sortArrow(donorSortKey === 'count', donorSortDir)}
              </button>
              <button
                type="button"
                onClick={() => toggleDonorSort('totalAmount')}
                className="text-right hover:text-slate-200"
              >
                Amount{sortArrow(donorSortKey === 'totalAmount', donorSortDir)}
              </button>
            </div>
            {donorPaged.pageRows.map((r) => (
              <div key={r.donorLabel} className="grid grid-cols-3 gap-2 py-1">
                <span>{r.donorLabel}</span>
                <span className="text-right">{r.count.toLocaleString()}</span>
                <span className="text-right">{r.totalAmount.toLocaleString()}</span>
              </div>
            ))}
            {renderPager(donorPaged.page, donorPaged.totalPages, setDonorPage)}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium">Donations by Batch</p>
              <button
                type="button"
                onClick={() => downloadCurrentViewCsv('finance-current-batch.csv', batchExportRows)}
                className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                Export Current View CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold text-slate-400">
              <button type="button" onClick={() => toggleBatchSort('batch')} className="text-left hover:text-slate-200">
                Batch{sortArrow(batchSortKey === 'batch', batchSortDir)}
              </button>
              <button
                type="button"
                onClick={() => toggleBatchSort('totalAmount')}
                className="text-right hover:text-slate-200"
              >
                Amount{sortArrow(batchSortKey === 'totalAmount', batchSortDir)}
              </button>
            </div>
            {batchPaged.pageRows.map((r) => (
              <div key={r.batch} className="grid grid-cols-2 gap-2 py-1">
                <span>{r.batch}</span>
                <span className="text-right">{r.totalAmount.toLocaleString()}</span>
              </div>
            ))}
            {renderPager(batchPaged.page, batchPaged.totalPages, setBatchPage)}
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200 md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium">Donations by Legal Entity</p>
              <button
                type="button"
                onClick={() => downloadCurrentViewCsv('finance-current-entity.csv', entityExportRows)}
                className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
              >
                Export Current View CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-semibold text-slate-400">
              <button
                type="button"
                onClick={() => toggleEntitySort('legalEntityCode')}
                className="text-left hover:text-slate-200"
              >
                Entity{sortArrow(entitySortKey === 'legalEntityCode', entitySortDir)}
              </button>
              <button
                type="button"
                onClick={() => toggleEntitySort('totalAmount')}
                className="text-right hover:text-slate-200"
              >
                Amount{sortArrow(entitySortKey === 'totalAmount', entitySortDir)}
              </button>
            </div>
            {entityPaged.pageRows.map((r) => (
              <div key={r.legalEntityCode} className="grid grid-cols-2 gap-2 py-1">
                <span>{r.legalEntityCode}</span>
                <span className="text-right">{r.totalAmount.toLocaleString()}</span>
              </div>
            ))}
            {renderPager(entityPaged.page, entityPaged.totalPages, setEntityPage)}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-medium text-slate-200">1) สร้างประชุม</h3>
          <select
            value={meetingEntity}
            onChange={(e) => setMeetingEntity(e.target.value as 'association' | 'cram_school')}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="association">association</option>
            <option value="cram_school">cram_school</option>
          </select>
          <input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Meeting title"
          />
          <input
            value={meetingExpected}
            onChange={(e) => setMeetingExpected(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Expected participants"
          />
          <button
            type="button"
            disabled={loading}
            onClick={createMeeting}
            className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            สร้างประชุม
          </button>

          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Meeting ID"
          />
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              value={attendanceName}
              onChange={(e) => setAttendanceName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="ชื่อผู้เข้าประชุม"
            />
            <select
              value={attendanceRole}
              onChange={(e) => setAttendanceRole(e.target.value as 'committee' | 'cram_executive')}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="committee">committee</option>
              <option value="cram_executive">cram_executive</option>
            </select>
            <input
              value={attendanceLineUid}
              onChange={(e) => setAttendanceLineUid(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              placeholder="line_uid (optional)"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={signAttendance}
              className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              ลงชื่อเข้าประชุม
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={loadMeetingSummary}
              className="rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              สรุปประชุม
            </button>
          </div>
          {meetingSummary ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">
              {meetingSummary}
            </pre>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
          <h3 className="text-sm font-medium text-slate-200">2) สร้าง/อนุมัติคำขอจ่ายเงิน</h3>
          <select
            value={paymentEntity}
            onChange={(e) => setPaymentEntity(e.target.value as 'association' | 'cram_school')}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="association">association</option>
            <option value="cram_school">cram_school</option>
          </select>
          <input
            value={paymentPurpose}
            onChange={(e) => setPaymentPurpose(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="purpose"
          />
          <input
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="amount"
          />
          <select
            value={paymentBankAccountId}
            onChange={(e) => setPaymentBankAccountId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">{'bank_account_id (ใช้เมื่อ amount <= 20000)'}</option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} ({a.account_no_masked})
              </option>
            ))}
          </select>
          <input
            value={paymentMeetingId}
            onChange={(e) => setPaymentMeetingId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="meeting_session_id (ใช้เมื่อ amount > 20000)"
          />
          <button
            type="button"
            disabled={loading}
            onClick={createPaymentRequest}
            className="mt-3 rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            สร้าง Payment Request
          </button>

          <input
            value={paymentRequestId}
            onChange={(e) => setPaymentRequestId(e.target.value)}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Payment Request ID"
          />
          <select
            value={approveRoleCode}
            onChange={(e) => setApproveRoleCode(e.target.value as 'bank_signer_3of5' | 'committee')}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="bank_signer_3of5">bank_signer_3of5</option>
            <option value="committee">committee</option>
          </select>
          <select
            value={approveSignerId}
            onChange={(e) => setApproveSignerId(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            disabled={approveRoleCode !== 'bank_signer_3of5'}
          >
            <option value="">approver_signer_id</option>
            {(selectedAccount?.signers ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.signer_name}
              </option>
            ))}
          </select>
          <select
            value={approveDecision}
            onChange={(e) => setApproveDecision(e.target.value as 'approve' | 'reject')}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="approve">approve</option>
            <option value="reject">reject</option>
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={approvePayment}
            className="mt-3 rounded bg-slate-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            อนุมัติ/ปฏิเสธ
          </button>
        </div>
      </div>

      {msg ? (
        <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      ) : null}
    </section>
  )
}
