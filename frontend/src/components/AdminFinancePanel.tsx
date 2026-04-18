import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { normalizeApiBase } from '../lib/adminApi'
import { downloadBlobFromAdminGet, triggerBrowserFileDownload } from '../lib/adminFinanceDownload'
import {
  fetchBalanceSheetReport,
  fetchDonationsReport,
  fetchFinanceBankAccounts,
  fetchFinanceOverview,
  fetchGeneralLedgerReport,
  fetchIncomeStatementReport,
  fetchPlAndDonationsParallel,
  fetchPlDonationsTrialParallel,
  fetchPlSummaryReport,
  fetchTrialBalanceReport,
} from '../lib/adminFinanceReportApi'
import {
  postJournalDraft,
  postJournalLine,
  postJournalPost,
  postJournalVoid,
} from '../lib/adminFinanceJournalPaymentApi'
import {
  fetchJournalDetail,
  fetchJournalsList,
  fetchPeriodClosingDetail,
  fetchPeriodClosingsList,
} from '../lib/adminFinanceJournalPeriodApi'
import {
  fetchFixedAssetsList,
  fetchFiscalYearsList,
  fetchTaxMonthlyReport,
  postFixedAssetCreate,
  postFixedAssetRunDepreciation,
  postFiscalYearClose,
  postFiscalYearCreate,
  postPeriodClosingClose,
  postPeriodClosingMarkAuditorCompleted,
  postPeriodClosingMarkAuditorSent,
  postTaxCalculate,
} from '../lib/adminFinanceOpsApi'
import {
  financeBalanceSheetQuerySuffix,
  financeGlQuerySuffix,
  financeJournalsQuerySuffix,
  financePeriodClosingsQuerySuffix,
  financeReportQuerySuffix,
} from '../lib/adminFinanceQueryStrings'
import {
  buildBuiltinReportPresets,
  formatActivityTimestamp,
  formatDateInputValue,
  rowsToCsvText,
  type ActivityFilter,
  type ReportFilterEntity,
  type ReportPreset,
} from '../lib/adminFinanceHelpers'
import { formatFetchError } from '../lib/adminHttp'
import type {
  ActivityItem,
  ActivityLimit,
  BalanceSheetPayload,
  BankAccount,
  DonationsReportPayload,
  FinancePeriodClosingDetail,
  FinancePeriodClosingItem,
  FiscalYearRow,
  FixedAssetRow,
  GeneralLedgerPayload,
  IncomeStatementPayload,
  JournalListItem,
  OverviewPayload,
  PlSummaryPayload,
  Props,
  TaxMonthlyRow,
  TrialBalancePayload,
} from '../lib/adminFinanceTypes'
import { FinanceActivityLogPanel } from './adminFinance/FinanceActivityLogPanel'
import { FinanceAdminAccountingRegion } from './adminFinance/FinanceAdminAccountingRegion'
import { FinanceAdminAccountingStack } from './adminFinance/FinanceAdminAccountingStack'
import { FinanceAdminFeedbackFooter } from './adminFinance/FinanceAdminFeedbackFooter'
import { FinanceAdminPanelHeader } from './adminFinance/FinanceAdminPanelHeader'
import { FinanceAdminPanelSection } from './adminFinance/FinanceAdminPanelSection'
import { FinanceAdminToolbarRegion } from './adminFinance/FinanceAdminToolbarRegion'
import { FinanceAutoRefreshBar } from './adminFinance/FinanceAutoRefreshBar'
import { FinanceAccountingRoadmapNote } from './adminFinance/FinanceAccountingRoadmapNote'
import { FinanceAdminKeyField } from './adminFinance/FinanceAdminKeyField'
import { FinanceAdminMeetingColumn } from './adminFinance/FinanceAdminMeetingColumn'
import type { FinanceAdminTab } from './adminFinance/FinanceAdminSubNav'
import { FinanceAdminSubNav } from './adminFinance/FinanceAdminSubNav'
import { PaymentRequestTools } from './adminFinance/PaymentRequestTools'
import { useFinanceAutoRefresh } from './adminFinance/useFinanceAutoRefresh'
import { useFinanceActivityLogView } from './adminFinance/useFinanceActivityLogView'
import { useFinanceMeetingColumn } from './adminFinance/useFinanceMeetingColumn'
import { useFinancePaymentRequestTools } from './adminFinance/useFinancePaymentRequestTools'
import { useFinanceReportTables } from './adminFinance/useFinanceReportTables'
import { useFinancePanelSessionSync } from './adminFinance/useFinancePanelSessionSync'
import { FinanceOverviewSummary } from './adminFinance/FinanceOverviewSummary'
import { FinanceQuickActionsBar } from './adminFinance/FinanceQuickActionsBar'
import { FinanceReportFilters } from './adminFinance/FinanceReportFilters'
import { FinanceReportPresets } from './adminFinance/FinanceReportPresets'
export function AdminFinancePanel({ apiBase }: Props) {
  const { tab } = useParams<{ tab: string }>()
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [plSummary, setPlSummary] = useState<PlSummaryPayload | null>(null)
  const [donationsReport, setDonationsReport] = useState<DonationsReportPayload | null>(null)
  const [trialBalance, setTrialBalance] = useState<TrialBalancePayload | null>(null)
  const [periodClosings, setPeriodClosings] = useState<FinancePeriodClosingItem[]>([])
  const [periodClosingDetail, setPeriodClosingDetail] = useState<FinancePeriodClosingDetail | null>(null)
  const [reportEntity, setReportEntity] = useState<ReportFilterEntity>('')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')
  const [reportKeyword, setReportKeyword] = useState('')
  const [closePeriodFrom, setClosePeriodFrom] = useState(() => {
    const now = new Date()
    return formatDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [closePeriodTo, setClosePeriodTo] = useState(() => formatDateInputValue(new Date()))
  const [closeBy, setCloseBy] = useState('finance-admin')
  const [closeNote, setCloseNote] = useState('')
  const [auditorSentBy, setAuditorSentBy] = useState('finance-admin')
  const [auditorHandoffNote, setAuditorHandoffNote] = useState('')
  const [auditorCompletedBy, setAuditorCompletedBy] = useState('finance-admin')
  const [auditorCompletedNote, setAuditorCompletedNote] = useState('')
  const [periodHandoffFilter, setPeriodHandoffFilter] = useState<'all' | 'pending' | 'sent' | 'completed'>('all')
  const [customPresets, setCustomPresets] = useState<ReportPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState('builtin:association_month')
  const [presetName, setPresetName] = useState('')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
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
  const isErrorMsg = msg !== null && (msg.includes('ไม่สำเร็จ') || msg.includes('HTTP'))

  const [toolsEntity, setToolsEntity] = useState<'association' | 'cram_school'>('association')
  const [fiscalYears, setFiscalYears] = useState<FiscalYearRow[]>([])
  const [fiscalPeriodFrom, setFiscalPeriodFrom] = useState(() => {
    const y = new Date().getFullYear()
    return `${y}-01-01`
  })
  const [fiscalPeriodTo, setFiscalPeriodTo] = useState(() => {
    const y = new Date().getFullYear()
    return `${y}-12-31`
  })
  const [fiscalLabel, setFiscalLabel] = useState('')
  const [fiscalCloseSurplusCode, setFiscalCloseSurplusCode] = useState('3110')
  const [fiscalCloseBy, setFiscalCloseBy] = useState('finance-admin')
  const [fiscalCloseNote, setFiscalCloseNote] = useState('')

  const [fixedAssets, setFixedAssets] = useState<FixedAssetRow[]>([])
  const [faCode, setFaCode] = useState('')
  const [faName, setFaName] = useState('')
  const [faPurchaseDate, setFaPurchaseDate] = useState(() => formatDateInputValue(new Date()))
  const [faCost, setFaCost] = useState('')
  const [faResidual, setFaResidual] = useState('0')
  const [faLifeMonths, setFaLifeMonths] = useState('60')
  const [faDepAccCode, setFaDepAccCode] = useState('')
  const [faAccumAccCode, setFaAccumAccCode] = useState('')
  const [faNote, setFaNote] = useState('')
  const [faCreatedBy, setFaCreatedBy] = useState('finance-admin')
  const [depMonth, setDepMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const [taxMonth, setTaxMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [taxMonthly, setTaxMonthly] = useState<{
    totals: { base_amount: number; vat_amount: number; wht_amount: number }
    rows: TaxMonthlyRow[]
  } | null>(null)
  const [taxCalcBase, setTaxCalcBase] = useState('')
  const [taxCalcVat, setTaxCalcVat] = useState('0.07')
  const [taxCalcWht, setTaxCalcWht] = useState('0')
  const [taxCalcResult, setTaxCalcResult] = useState<{
    baseAmount: number
    vatRate: number
    whtRate: number
    vatAmount: number
    whtAmount: number
    grossAmount: number
    netPayable: number
  } | null>(null)

  const [journalList, setJournalList] = useState<JournalListItem[]>([])
  const [journalStatusFilter, setJournalStatusFilter] = useState<'' | 'draft' | 'posted' | 'voided'>('')
  const [journalDetail, setJournalDetail] = useState<{
    journal: Record<string, unknown>
    lines: Array<Record<string, unknown> & { account_code?: string; account_name?: string }>
    totals: { debit: number; credit: number; isBalanced: boolean }
  } | null>(null)
  const [journalDraftEntity, setJournalDraftEntity] = useState<'association' | 'cram_school'>('association')
  const [journalDraftDate, setJournalDraftDate] = useState(() => formatDateInputValue(new Date()))
  const [journalDraftRef, setJournalDraftRef] = useState('')
  const [journalDraftMemo, setJournalDraftMemo] = useState('')
  const [journalDraftBy, setJournalDraftBy] = useState('finance-admin')
  const [journalLineAccount, setJournalLineAccount] = useState('')
  const [journalLineDebit, setJournalLineDebit] = useState('')
  const [journalLineCredit, setJournalLineCredit] = useState('')
  const [journalLineDesc, setJournalLineDesc] = useState('')
  const [journalLineBy, setJournalLineBy] = useState('finance-admin')
  const [journalPostBy, setJournalPostBy] = useState('finance-admin')
  const [journalVoidBy, setJournalVoidBy] = useState('finance-admin')
  const [journalVoidReason, setJournalVoidReason] = useState('')
  const [journalActiveId, setJournalActiveId] = useState('')

  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementPayload | null>(null)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetPayload | null>(null)
  const [generalLedger, setGeneralLedger] = useState<GeneralLedgerPayload | null>(null)
  const [glAccountCode, setGlAccountCode] = useState('')
  const [bsAsOf, setBsAsOf] = useState(() => formatDateInputValue(new Date()))

  const builtinPresets = useMemo(() => buildBuiltinReportPresets(), [])
  const allPresets = useMemo(() => [...builtinPresets, ...customPresets], [builtinPresets, customPresets])

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

  useFinancePanelSessionSync({
    customPresets,
    activityLog,
    activityFilter,
    activitySearch,
    activityLimit,
    autoRefreshEnabled,
    alertOnPause,
    soundOnPause,
    setAdminKey,
    setCustomPresets,
    setActivityLog,
    setActivityFilter,
    setActivitySearch,
    setActivityLimit,
    setAutoRefreshEnabled,
    setAlertOnPause,
    setSoundOnPause,
  })

  useEffect(() => {
    if (!allPresets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId(builtinPresets[0]?.id ?? '')
    }
  }, [allPresets, builtinPresets, selectedPresetId])

  const getReportQueryString = useCallback(
    () => financeReportQuerySuffix(reportEntity, reportFrom, reportTo),
    [reportEntity, reportFrom, reportTo],
  )

  const { toggleAutoRefresh, resumeAutoRefresh } = useFinanceAutoRefresh({
    base,
    adminKey,
    autoRefreshEnabled,
    autoRefreshPausedByError,
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
  })

  const { payment, setPaymentMeetingId, prefillPaymentFromJournal } = useFinancePaymentRequestTools({
    base,
    adminKey,
    accounts,
    overview,
    loading,
    setLoading,
    setMsg,
    addActivity,
  })

  function linkPaymentFromActiveJournal() {
    if (!journalActiveId.trim() || !journalDetail?.journal) {
      setMsg('โหลดรายละเอียดสมุดรายวันก่อน (เลือกรายการแล้วกดโหลดรายละเอียด)')
      return
    }
    const leId = String(journalDetail.journal.legal_entity_id ?? '')
    const ent = overview?.entities.find((e) => e.id === leId)
    if (!ent || (ent.code !== 'association' && ent.code !== 'cram_school')) {
      setMsg('ไม่พบหน่วยงานของเอกสารสมุดรายวัน — ลองโหลดภาพรวม/บัญชีธนาคารอีกครั้ง')
      return
    }
    if (String(journalDetail.journal.status ?? '') === 'voided') {
      setMsg('ไม่ผูกคำขอจ่ายกับเอกสารที่ void แล้ว')
      return
    }
    const memo = typeof journalDetail.journal.memo === 'string' ? journalDetail.journal.memo.trim() : ''
    const ref = typeof journalDetail.journal.reference_no === 'string' ? journalDetail.journal.reference_no.trim() : ''
    const purpose = memo || ref || `สมุดรายวัน ${journalActiveId.slice(0, 8)}…`
    prefillPaymentFromJournal({
      journalId: journalActiveId.trim(),
      legalEntityCode: ent.code,
      purpose,
    })
    setMsg('ผูกกับสมุดรายวันแล้ว — กรอกจำนวนเงินและเลือกบัญชี/ประชุมตามนโยบาย แล้วสร้างคำขอ')
    addActivity('info', `เตรียมคำขอจ่ายผูก journal ${journalActiveId.trim()}`)
  }

  const { meeting } = useFinanceMeetingColumn({
    base,
    adminKey,
    loading,
    setLoading,
    setMsg,
    addActivity,
    setPaymentMeetingId,
  })

  const {
    plPaged,
    plSortKey,
    plSortDir,
    donorPaged,
    donorSortKey,
    donorSortDir,
    batchPaged,
    batchSortKey,
    batchSortDir,
    entityPaged,
    entitySortKey,
    entitySortDir,
    setPlPage,
    setDonorPage,
    setBatchPage,
    setEntityPage,
    plExportRows,
    donorExportRows,
    batchExportRows,
    entityExportRows,
    trialBalanceExportRows,
    sortArrow,
    togglePlSort,
    toggleDonorSort,
    toggleBatchSort,
    toggleEntitySort,
  } = useFinanceReportTables(plSummary, donationsReport, trialBalance, reportKeyword)

  const {
    visibleActivityLog,
    activitySearchTrimmed,
    activityCounts,
    activitySnapshotAt,
    exportActivityLogCsv,
    copyActivityFilterSummary,
    copyVisibleActivityRows,
    applyIncidentPreset,
    resetActivityView,
  } = useFinanceActivityLogView({
    activityLog,
    activityFilter,
    activitySearch,
    activityLimit,
    setActivityFilter,
    setActivitySearch,
    setActivityLimit,
    setMsg,
    addActivity,
  })

  const periodClosingsSentCount = useMemo(
    () => periodClosings.filter((row) => row.auditor_handoff_status === 'sent').length,
    [periodClosings],
  )
  const periodClosingsCompletedCount = useMemo(
    () => periodClosings.filter((row) => row.auditor_handoff_status === 'completed').length,
    [periodClosings],
  )

  function applyPreset(preset: ReportPreset) {
    setReportEntity(preset.legalEntityCode)
    setReportFrom(preset.from)
    setReportTo(preset.to)
    setReportKeyword(preset.keyword)
    setPlPage(1)
    setDonorPage(1)
    setBatchPage(1)
    setEntityPage(1)
    setMsg(`ใช้พรีเซ็ตแล้ว: ${preset.name}`)
    addActivity('info', `ใช้พรีเซ็ต: ${preset.name}`)
  }

  function applySelectedPreset() {
    const preset = allPresets.find((p) => p.id === selectedPresetId)
    if (!preset) {
      setMsg('ไม่พบพรีเซ็ตที่เลือก')
      return
    }
    applyPreset(preset)
  }

  async function applySelectedPresetAndLoad() {
    const preset = allPresets.find((p) => p.id === selectedPresetId)
    if (!preset) {
      setMsg('ไม่พบพรีเซ็ตที่เลือก')
      return
    }
    applyPreset(preset)
    if (!adminKey.trim()) return setMsg('ใช้พรีเซ็ตแล้ว — ใส่ Admin key ก่อนโหลดรายงาน')

    setLoading(true)
    setMsg(null)
    try {
      const q = financeReportQuerySuffix(preset.legalEntityCode, preset.from, preset.to)
      const [pl, donations] = await fetchPlAndDonationsParallel(base, adminKey, q)
      if (!pl.ok || !donations.ok) {
        const errors: string[] = []
        if (!pl.ok) errors.push(formatFetchError('โหลดสรุป P/L', pl.status, pl.payload, pl.rawText))
        if (!donations.ok) {
          errors.push(
            formatFetchError('โหลดแดชบอร์ดเงินบริจาค', donations.status, donations.payload, donations.rawText),
          )
        }
        setMsg(errors.join('\n\n------------------------------\n\n'))
        addActivity('warn', `ใช้พรีเซ็ต + โหลดทันทีล้มเหลวบางส่วน: ${preset.name}`)
        return
      }
      setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
      setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
      setPlPage(1)
      setDonorPage(1)
      setBatchPage(1)
      setEntityPage(1)
      setMsg(`ใช้พรีเซ็ตและโหลดรายงานแล้ว: ${preset.name}`)
      addActivity('info', `ใช้พรีเซ็ต + โหลดทันทีสำเร็จ: ${preset.name}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ใช้พรีเซ็ต + โหลดทันทีไม่สำเร็จ: ${preset.name}`)
    } finally {
      setLoading(false)
    }
  }

  function saveCurrentPreset() {
    const name = presetName.trim()
    if (!name) {
      setMsg('กรอกชื่อพรีเซ็ตก่อนบันทึก')
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
    setMsg(`บันทึกพรีเซ็ตแล้ว: ${name}`)
    addActivity('info', `บันทึกพรีเซ็ต: ${name}`)
  }

  function deleteSelectedPreset() {
    if (!selectedPresetId.startsWith('custom:')) {
      setMsg('ลบได้เฉพาะพรีเซ็ตที่บันทึกเอง')
      return
    }
    const target = customPresets.find((p) => p.id === selectedPresetId)
    if (!target) {
      setMsg('ไม่พบพรีเซ็ตที่เลือก')
      return
    }
    setCustomPresets((cur) => cur.filter((p) => p.id !== selectedPresetId))
    setSelectedPresetId(builtinPresets[0]?.id ?? '')
    setMsg(`ลบพรีเซ็ตแล้ว: ${target.name}`)
    addActivity('warn', `ลบพรีเซ็ต: ${target.name}`)
  }

  function downloadCurrentViewCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) {
      setMsg(`ไม่มีข้อมูลสำหรับส่งออก: ${filename}`)
      return
    }
    const csv = rowsToCsvText(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    triggerBrowserFileDownload(blob, filename)
    setMsg(`ดาวน์โหลด ${filename} (มุมมองปัจจุบัน) แล้ว`)
  }

  async function loadOverviewAndAccounts() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const p1 = await fetchFinanceOverview(base, adminKey)
      if (!p1.ok) {
        setMsg(formatFetchError('โหลดภาพรวม Finance', p1.status, p1.payload, p1.rawText))
        return
      }
      setOverview((p1.payload ?? null) as OverviewPayload | null)

      const p2 = await fetchFinanceBankAccounts(base, adminKey)
      if (!p2.ok) {
        setMsg(formatFetchError('โหลดบัญชีธนาคาร', p2.status, p2.payload, p2.rawText))
        return
      }
      const data = (p2.payload ?? {}) as { accounts?: BankAccount[] }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setMsg('โหลดภาพรวมและบัญชีธนาคารแล้ว')
      addActivity('info', 'โหลดภาพรวม + บัญชีธนาคารสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดภาพรวม + บัญชีธนาคารไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadPlSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchPlSummaryReport(base, adminKey, getReportQueryString())
      if (!p.ok) return setMsg(formatFetchError('โหลดสรุป P/L', p.status, p.payload, p.rawText))
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
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchDonationsReport(base, adminKey, getReportQueryString())
      if (!p.ok) return setMsg(formatFetchError('โหลดแดชบอร์ดเงินบริจาค', p.status, p.payload, p.rawText))
      setDonationsReport((p.payload ?? null) as DonationsReportPayload | null)
      setDonorPage(1)
      setBatchPage(1)
      setEntityPage(1)
      setMsg('โหลดแดชบอร์ดเงินบริจาคแล้ว')
      addActivity('info', 'โหลดแดชบอร์ดเงินบริจาคสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดแดชบอร์ดเงินบริจาคไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadTrialBalanceReport() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchTrialBalanceReport(base, adminKey, getReportQueryString())
      if (!p.ok) return setMsg(formatFetchError('โหลด Trial Balance', p.status, p.payload, p.rawText))
      setTrialBalance((p.payload ?? null) as TrialBalancePayload | null)
      setMsg('โหลด Trial Balance แล้ว')
      addActivity('info', 'โหลดรายงาน Trial Balance สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายงาน Trial Balance ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllReports() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const q = getReportQueryString()
      const [pl, donations, trial] = await fetchPlDonationsTrialParallel(base, adminKey, q)

      const errors: string[] = []
      if (pl.ok) {
        setPlSummary((pl.payload ?? null) as PlSummaryPayload | null)
        setPlPage(1)
      } else {
        errors.push(formatFetchError('โหลดสรุป P/L', pl.status, pl.payload, pl.rawText))
      }

      if (donations.ok) {
        setDonationsReport((donations.payload ?? null) as DonationsReportPayload | null)
        setDonorPage(1)
        setBatchPage(1)
        setEntityPage(1)
      } else {
        errors.push(
          formatFetchError('โหลดแดชบอร์ดเงินบริจาค', donations.status, donations.payload, donations.rawText),
        )
      }
      if (trial.ok) {
        setTrialBalance((trial.payload ?? null) as TrialBalancePayload | null)
      } else {
        errors.push(formatFetchError('โหลด Trial Balance', trial.status, trial.payload, trial.rawText))
      }

      if (errors.length > 0) {
        setMsg(errors.join('\n\n------------------------------\n\n'))
        addActivity('warn', 'โหลดรายงานทั้งหมดบางส่วนไม่สำเร็จ')
        return
      }

      setMsg('โหลดรายงานทั้งหมดแล้ว (P/L + Donations + Trial Balance)')
      addActivity('info', 'โหลดรายงานทั้งหมดสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายงานทั้งหมดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadPeriodClosings() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchPeriodClosingsList(
        base,
        adminKey,
        financePeriodClosingsQuerySuffix({
          reportEntity,
          periodHandoffFilter,
          limit: 50,
        }),
      )
      if (!p.ok) return setMsg(formatFetchError('โหลดประวัติปิดงวดบัญชี', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { rows?: FinancePeriodClosingItem[] }
      const rows = Array.isArray(payload.rows) ? payload.rows : []
      setPeriodClosings(rows)
      setPeriodClosingDetail((prev) =>
        prev && rows.some((row) => row.id === prev.periodClosing.id) ? prev : null,
      )
      setMsg('โหลดประวัติปิดงวดบัญชีแล้ว')
      addActivity(
        'info',
        `โหลดประวัติปิดงวดบัญชีสำเร็จ${periodHandoffFilter === 'all' ? '' : ` (สถานะ ${periodHandoffFilter})`}`,
      )
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดประวัติปิดงวดบัญชีไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function closeAccountingPeriod() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!reportEntity) return setMsg('เลือกหน่วยงานก่อนปิดงวดบัญชี')
    if (!closePeriodFrom || !closePeriodTo || closePeriodFrom > closePeriodTo) {
      return setMsg('ระบุช่วงงวดบัญชีให้ถูกต้อง')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postPeriodClosingClose(base, adminKey, {
        legal_entity_code: reportEntity,
        period_from: closePeriodFrom,
        period_to: closePeriodTo,
        closed_by: closeBy.trim() || 'finance-admin',
        note: closeNote.trim() || null,
      })
      if (!p.ok) return setMsg(formatFetchError('ปิดงวดบัญชี', p.status, p.payload, p.rawText))
      setMsg('ปิดงวดบัญชีสำเร็จ และบันทึกสำหรับผู้ตรวจสอบแล้ว')
      addActivity('info', `ปิดงวดบัญชีสำเร็จ: ${reportEntity} ${closePeriodFrom} ถึง ${closePeriodTo}`)
      await Promise.all([loadPeriodClosings(), loadTrialBalanceReport()])
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ปิดงวดบัญชีไม่สำเร็จ: ${reportEntity} ${closePeriodFrom} ถึง ${closePeriodTo}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadPeriodClosingDetail(id: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchPeriodClosingDetail(base, adminKey, id)
      if (!p.ok) return setMsg(formatFetchError('โหลดรายละเอียดงวดบัญชี', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? null) as FinancePeriodClosingDetail | null
      setPeriodClosingDetail(payload)
      const periodLabel = payload
        ? `${payload.periodClosing.period_from} ถึง ${payload.periodClosing.period_to}`
        : id
      setMsg(`โหลดรายละเอียดงวด ${periodLabel} แล้ว`)
      addActivity('info', `โหลดรายละเอียดงวดบัญชีสำเร็จ: ${periodLabel}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `โหลดรายละเอียดงวดบัญชีไม่สำเร็จ: ${id}`)
    } finally {
      setLoading(false)
    }
  }

  async function downloadPeriodClosingAuditorPackage(id: string, label: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const safeId = encodeURIComponent(id)
      const result = await downloadBlobFromAdminGet(
        base,
        `/api/admin/finance/period-closing/${safeId}/auditor-package.csv`,
        adminKey,
        `period-closing-${id}-auditor-package.csv`,
      )
      if (result.ok === false) {
        setMsg(`ดาวน์โหลดแพ็กผู้ตรวจสอบงวด ${label} ไม่สำเร็จ — HTTP ${result.status}\n${result.errorText}`)
        addActivity('error', `ดาวน์โหลดแพ็กผู้ตรวจสอบงวดไม่สำเร็จ: ${label}`)
        return
      }
      setMsg(`ดาวน์โหลดแพ็กผู้ตรวจสอบงวด ${label} แล้ว`)
      addActivity('info', `ดาวน์โหลดแพ็กผู้ตรวจสอบงวดสำเร็จ: ${label}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ดาวน์โหลดแพ็กผู้ตรวจสอบงวดไม่สำเร็จ: ${label}`)
    } finally {
      setLoading(false)
    }
  }

  async function markPeriodClosingAuditorSent(id: string, label: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postPeriodClosingMarkAuditorSent(base, adminKey, id, {
        auditor_sent_by: auditorSentBy.trim() || 'finance-admin',
        auditor_handoff_note: auditorHandoffNote.trim() || null,
      })
      if (!p.ok) return setMsg(formatFetchError('ยืนยันการส่งผู้ตรวจสอบ', p.status, p.payload, p.rawText))
      setMsg(`ยืนยันการส่งผู้ตรวจสอบงวด ${label} แล้ว`)
      addActivity('info', `ยืนยันส่งผู้ตรวจสอบสำเร็จ: ${label}`)
      await Promise.all([loadPeriodClosings(), loadPeriodClosingDetail(id)])
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ยืนยันส่งผู้ตรวจสอบไม่สำเร็จ: ${label}`)
    } finally {
      setLoading(false)
    }
  }

  async function markPeriodClosingAuditorCompleted(id: string, label: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postPeriodClosingMarkAuditorCompleted(base, adminKey, id, {
        auditor_completed_by: auditorCompletedBy.trim() || 'finance-admin',
        auditor_completed_note: auditorCompletedNote.trim() || null,
      })
      if (!p.ok) return setMsg(formatFetchError('ยืนยันปิดงานผู้ตรวจสอบ', p.status, p.payload, p.rawText))
      setMsg(`ยืนยันปิดงานผู้ตรวจสอบงวด ${label} แล้ว`)
      addActivity('info', `ยืนยันปิดงานผู้ตรวจสอบสำเร็จ: ${label}`)
      await Promise.all([loadPeriodClosings(), loadPeriodClosingDetail(id)])
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ยืนยันปิดงานผู้ตรวจสอบไม่สำเร็จ: ${label}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadFiscalYears() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchFiscalYearsList(base, adminKey, toolsEntity)
      if (!p.ok) return setMsg(formatFetchError('โหลดรอบปีบัญชี', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { rows?: FiscalYearRow[] }
      setFiscalYears(Array.isArray(payload.rows) ? payload.rows : [])
      setMsg('โหลดรอบปีบัญชีแล้ว')
      addActivity('info', 'โหลดรอบปีบัญชีสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรอบปีบัญชีไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createFiscalYear() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!fiscalPeriodFrom || !fiscalPeriodTo || fiscalPeriodFrom > fiscalPeriodTo) {
      return setMsg('ระบุช่วงรอบปีบัญชี (period_from / period_to) ให้ถูกต้อง')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postFiscalYearCreate(base, adminKey, {
        legal_entity_code: toolsEntity,
        period_from: fiscalPeriodFrom,
        period_to: fiscalPeriodTo,
        fiscal_label: fiscalLabel.trim() || null,
      })
      if (!p.ok) return setMsg(formatFetchError('สร้างรอบปีบัญชี', p.status, p.payload, p.rawText))
      setMsg('สร้างรอบปีบัญชีแล้ว')
      addActivity('info', `สร้างรอบปีบัญชีสำเร็จ: ${toolsEntity} ${fiscalPeriodFrom}–${fiscalPeriodTo}`)
      await loadFiscalYears()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'สร้างรอบปีบัญชีไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function closeFiscalYear(id: string, label: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postFiscalYearClose(base, adminKey, id, {
        closed_by: fiscalCloseBy.trim() || 'finance-admin',
        close_note: fiscalCloseNote.trim() || null,
        accumulated_surplus_account_code: fiscalCloseSurplusCode.trim() || '3110',
      })
      if (!p.ok) return setMsg(formatFetchError('ปิดรอบปีบัญชี', p.status, p.payload, p.rawText))
      setMsg(`ปิดรอบปีบัญชี ${label} แล้ว`)
      addActivity('info', `ปิดรอบปีบัญชีสำเร็จ: ${label}`)
      await loadFiscalYears()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ปิดรอบปีบัญชีไม่สำเร็จ: ${label}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadFixedAssets() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchFixedAssetsList(base, adminKey, toolsEntity)
      if (!p.ok) return setMsg(formatFetchError('โหลดทะเบียนสินทรัพย์', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { rows?: FixedAssetRow[] }
      setFixedAssets(Array.isArray(payload.rows) ? payload.rows : [])
      setMsg('โหลดทะเบียนสินทรัพย์แล้ว')
      addActivity('info', 'โหลดทะเบียนสินทรัพย์ถาวรสำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดทะเบียนสินทรัพย์ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createFixedAsset() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const cost = Number(faCost)
    const residual = Number(faResidual)
    const life = Number(faLifeMonths)
    if (!faCode.trim() || !faName.trim() || !Number.isFinite(cost) || cost <= 0) {
      return setMsg('กรอกรหัส ชื่อ และต้นทุนให้ครบ')
    }
    if (!Number.isFinite(life) || life <= 0) return setMsg('อายุการใช้งาน (เดือน) ต้องเป็นตัวเลขบวก')
    if (!faDepAccCode.trim() || !faAccumAccCode.trim()) {
      return setMsg('ระบุรหัสบัญชีค่าเสื่อมและค่าเสื่อมสะสม')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postFixedAssetCreate(base, adminKey, {
        legal_entity_code: toolsEntity,
        asset_code: faCode.trim(),
        asset_name: faName.trim(),
        purchase_date: faPurchaseDate,
        cost,
        residual_value: Number.isFinite(residual) && residual >= 0 ? residual : 0,
        useful_life_months: Math.floor(life),
        depreciation_account_code: faDepAccCode.trim(),
        accumulated_depreciation_account_code: faAccumAccCode.trim(),
        note: faNote.trim() || null,
        created_by: faCreatedBy.trim() || 'finance-admin',
      })
      if (!p.ok) return setMsg(formatFetchError('สร้างสินทรัพย์ถาวร', p.status, p.payload, p.rawText))
      setMsg('บันทึกสินทรัพย์ถาวรแล้ว')
      addActivity('info', `สร้างสินทรัพย์ถาวรสำเร็จ: ${faCode.trim()}`)
      setFaCode('')
      setFaName('')
      await loadFixedAssets()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'สร้างสินทรัพย์ถาวรไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function runFixedAssetDepreciation() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!/^\d{4}-\d{2}$/.test(depMonth.trim())) return setMsg('เดือนค่าเสื่อมต้องเป็น YYYY-MM')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postFixedAssetRunDepreciation(base, adminKey, {
        legal_entity_code: toolsEntity,
        month: depMonth.trim(),
        posted_by: faCreatedBy.trim() || 'finance-admin',
      })
      if (!p.ok) return setMsg(formatFetchError('รันค่าเสื่อม', p.status, p.payload, p.rawText))
      const body = p.payload as { posted?: boolean; reason?: string; journal_entry_id?: string; asset_count?: number }
      if (body.posted) {
        setMsg(
          `โพสต์ค่าเสื่อมแล้ว — รายการ ${body.asset_count ?? 0} รายการ · journal ${body.journal_entry_id ?? '-'}`,
        )
        addActivity('info', `รันค่าเสื่อมสำเร็จ ${toolsEntity} ${depMonth}`)
      } else {
        setMsg(body.reason ?? 'ไม่มีรายการค่าเสื่อมใหม่')
        addActivity('info', `รันค่าเสื่อม: ${body.reason ?? 'ไม่มีรายการ'}`)
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'รันค่าเสื่อมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadTaxMonthly() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!/^\d{4}-\d{2}$/.test(taxMonth.trim())) return setMsg('เดือนภาษีต้องเป็น YYYY-MM')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchTaxMonthlyReport(base, adminKey, taxMonth.trim(), toolsEntity)
      if (!p.ok) return setMsg(formatFetchError('โหลดรายงานภาษีรายเดือน', p.status, p.payload, p.rawText))
      const payload = p.payload as {
        totals?: { base_amount: number; vat_amount: number; wht_amount: number }
        rows?: TaxMonthlyRow[]
      }
      setTaxMonthly({
        totals: payload.totals ?? { base_amount: 0, vat_amount: 0, wht_amount: 0 },
        rows: Array.isArray(payload.rows) ? payload.rows : [],
      })
      setMsg('โหลดรายงานภาษีรายเดือนแล้ว')
      addActivity('info', `โหลดภาษีรายเดือน ${taxMonth} สำเร็จ`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายงานภาษีรายเดือนไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function calculateTaxPreview() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const baseAmount = Number(taxCalcBase)
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return setMsg('ยอดฐาน (ก่อน VAT) ต้องเป็นตัวเลขบวก')
    const vatRate = Number(taxCalcVat)
    const whtRate = Number(taxCalcWht)
    setLoading(true)
    setMsg(null)
    try {
      const p = await postTaxCalculate(base, adminKey, {
        base_amount: baseAmount,
        vat_rate: vatRate,
        wht_rate: whtRate,
      })
      if (!p.ok) return setMsg(formatFetchError('คำนวณภาษี', p.status, p.payload, p.rawText))
      const body = p.payload as {
        baseAmount?: number
        vatRate?: number
        whtRate?: number
        vatAmount?: number
        whtAmount?: number
        grossAmount?: number
        netPayable?: number
      }
      setTaxCalcResult({
        baseAmount: Number(body.baseAmount ?? 0),
        vatRate: Number(body.vatRate ?? 0),
        whtRate: Number(body.whtRate ?? 0),
        vatAmount: Number(body.vatAmount ?? 0),
        whtAmount: Number(body.whtAmount ?? 0),
        grossAmount: Number(body.grossAmount ?? 0),
        netPayable: Number(body.netPayable ?? 0),
      })
      setMsg('คำนวณภาษีแล้ว')
      addActivity('info', 'คำนวณภาษี (preview) สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'คำนวณภาษีไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadJournals() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchJournalsList(
        base,
        adminKey,
        financeJournalsQuerySuffix({
          reportEntity,
          reportFrom,
          reportTo,
          journalStatusFilter,
        }),
      )
      if (!p.ok) return setMsg(formatFetchError('โหลดสมุดรายวัน', p.status, p.payload, p.rawText))
      const payload = p.payload as { journals?: JournalListItem[] }
      setJournalList(Array.isArray(payload.journals) ? payload.journals : [])
      setMsg('โหลดรายการสมุดรายวันแล้ว')
      addActivity('info', 'โหลดรายการ journal สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดสมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadJournalDetail(id: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!id.trim()) return setMsg('ระบุรหัสเอกสารสมุดรายวัน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchJournalDetail(base, adminKey, id)
      if (!p.ok) return setMsg(formatFetchError('โหลดรายละเอียดสมุดรายวัน', p.status, p.payload, p.rawText))
      const payload = p.payload as {
        journal?: Record<string, unknown>
        lines?: Array<Record<string, unknown> & { account_code?: string }>
        totals?: { debit: number; credit: number; isBalanced: boolean }
      }
      setJournalDetail({
        journal: payload.journal ?? {},
        lines: Array.isArray(payload.lines) ? payload.lines : [],
        totals: payload.totals ?? { debit: 0, credit: 0, isBalanced: true },
      })
      setJournalActiveId(id.trim())
      setMsg('โหลดรายละเอียดสมุดรายวันแล้ว')
      addActivity('info', `โหลด journal ${id.trim()} สำเร็จ`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดรายละเอียดสมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createJournalDraft() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!journalDraftDate || !/^\d{4}-\d{2}-\d{2}$/.test(journalDraftDate)) {
      return setMsg('วันที่เอกสารต้องเป็น YYYY-MM-DD')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postJournalDraft(base, adminKey, {
        legal_entity_code: journalDraftEntity,
        entry_date: journalDraftDate,
        reference_no: journalDraftRef.trim() || null,
        memo: journalDraftMemo.trim() || null,
        created_by: journalDraftBy.trim() || 'finance-admin',
      })
      if (!p.ok) return setMsg(formatFetchError('สร้างร่างสมุดรายวัน', p.status, p.payload, p.rawText))
      const j = (p.payload as { journal?: { id?: string } }).journal
      if (j?.id) setJournalActiveId(String(j.id))
      setMsg('สร้างร่างสมุดรายวันแล้ว — กดรายการเพื่อโหลดรายละเอียดหรือเพิ่มบรรทัด')
      addActivity('info', 'สร้างร่าง journal สำเร็จ')
      await loadJournals()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'สร้างร่างสมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function addJournalLine() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!journalActiveId.trim()) return setMsg('เลือกหรือสร้างเอกสารสมุดรายวันก่อน')
    const debit = Number(journalLineDebit)
    const credit = Number(journalLineCredit)
    if (!journalLineAccount.trim() || (!Number.isFinite(debit) && !Number.isFinite(credit))) {
      return setMsg('ระบุรหัสบัญชีและเดบิตหรือเครดิต')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postJournalLine(base, adminKey, journalActiveId.trim(), {
        account_code: journalLineAccount.trim(),
        debit_amount: Number.isFinite(debit) && debit > 0 ? debit : 0,
        credit_amount: Number.isFinite(credit) && credit > 0 ? credit : 0,
        description: journalLineDesc.trim() || null,
        actor: journalLineBy.trim() || 'finance-admin',
      })
      if (!p.ok) return setMsg(formatFetchError('เพิ่มบรรทัดสมุดรายวัน', p.status, p.payload, p.rawText))
      setMsg('เพิ่มบรรทัดแล้ว')
      setJournalLineDebit('')
      setJournalLineCredit('')
      setJournalLineDesc('')
      addActivity('info', `เพิ่มบรรทัด journal ${journalActiveId}`)
      await loadJournalDetail(journalActiveId.trim())
      await loadJournals()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'เพิ่มบรรทัดสมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function postJournal() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!journalActiveId.trim()) return setMsg('ระบุรหัสเอกสารสมุดรายวัน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postJournalPost(base, adminKey, journalActiveId.trim(), {
        posted_by: journalPostBy.trim() || 'finance-admin',
      })
      if (!p.ok) return setMsg(formatFetchError('โพสต์สมุดรายวัน', p.status, p.payload, p.rawText))
      setMsg('โพสต์สมุดรายวันแล้ว')
      addActivity('info', `โพสต์ journal ${journalActiveId}`)
      await loadJournalDetail(journalActiveId.trim())
      await loadJournals()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โพสต์สมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function voidJournal() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!journalActiveId.trim()) return setMsg('ระบุรหัสเอกสารสมุดรายวัน')
    if (!journalVoidReason.trim()) return setMsg('ระบุเหตุผลการ void')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postJournalVoid(base, adminKey, journalActiveId.trim(), {
        voided_by: journalVoidBy.trim() || 'finance-admin',
        reason: journalVoidReason.trim(),
      })
      if (!p.ok) return setMsg(formatFetchError('ยกเลิกสมุดรายวัน', p.status, p.payload, p.rawText))
      setMsg('บันทึก void สมุดรายวันแล้ว')
      addActivity('warn', `void journal ${journalActiveId}`)
      await loadJournalDetail(journalActiveId.trim())
      await loadJournals()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'void สมุดรายวันไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadIncomeStatementReport() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchIncomeStatementReport(base, adminKey, getReportQueryString())
      if (!p.ok) return setMsg(formatFetchError('โหลดงบกำไรขาดทุน', p.status, p.payload, p.rawText))
      const payload = p.payload as IncomeStatementPayload & { ok?: boolean }
      setIncomeStatement({
        revenueRows: payload.revenueRows ?? [],
        expenseRows: payload.expenseRows ?? [],
        totals: payload.totals ?? { revenue: 0, expense: 0, netIncome: 0 },
        journalEntryCount: payload.journalEntryCount ?? 0,
      })
      setMsg('โหลดงบกำไรขาดทุนแล้ว')
      addActivity('info', 'โหลด income statement สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดงบกำไรขาดทุนไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadBalanceSheetReport() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchBalanceSheetReport(
        base,
        adminKey,
        financeBalanceSheetQuerySuffix({
          reportEntity,
          bsAsOf,
        }),
      )
      if (!p.ok) return setMsg(formatFetchError('โหลดงบดุล', p.status, p.payload, p.rawText))
      const payload = p.payload as BalanceSheetPayload & { ok?: boolean; filters?: unknown }
      setBalanceSheet({
        assets: payload.assets ?? [],
        liabilities: payload.liabilities ?? [],
        equity: payload.equity ?? [],
        totals: payload.totals ?? { assets: 0, liabilities: 0, equity: 0 },
        accountingEquation: payload.accountingEquation ?? {
          left: 0,
          right: 0,
          diff: 0,
          isBalanced: true,
        },
        journalEntryCount: payload.journalEntryCount ?? 0,
      })
      setMsg('โหลดงบดุลแล้ว')
      addActivity('info', 'โหลด balance sheet สำเร็จ')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดงบดุลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadGeneralLedgerReport() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!glAccountCode.trim()) return setMsg('ระบุรหัสบัญชี (account_code) สำหรับสมุดบัญชีแยกประเภท')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchGeneralLedgerReport(
        base,
        adminKey,
        financeGlQuerySuffix({
          reportEntity,
          reportFrom,
          reportTo,
          glAccountCode,
        }),
      )
      if (!p.ok) return setMsg(formatFetchError('โหลดสมุดบัญชีแยกประเภท', p.status, p.payload, p.rawText))
      const payload = p.payload as GeneralLedgerPayload & { ok?: boolean }
      setGeneralLedger({
        account: payload.account ?? { account_code: '', account_name: '', account_type: '' },
        rows: payload.rows ?? [],
        totals: payload.totals ?? { debit: 0, credit: 0, netMovement: 0, endingBalance: 0 },
      })
      setMsg('โหลดสมุดบัญชีแยกประเภทแล้ว')
      addActivity('info', `โหลด GL ${glAccountCode.trim()} สำเร็จ`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลด GL ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function downloadCsv(path: string, filename: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const result = await downloadBlobFromAdminGet(base, `${path}${getReportQueryString()}`, adminKey, filename)
      if (result.ok === false) {
        setMsg(`ดาวน์โหลด ${filename} ไม่สำเร็จ — HTTP ${result.status}\n${result.errorText}`)
        return
      }
      setMsg(`ดาวน์โหลด ${filename} แล้ว`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const financeTabs: FinanceAdminTab[] = ['accounting', 'meetings', 'payments']
  if (!tab || !financeTabs.includes(tab as FinanceAdminTab)) {
    return <Navigate to="/admin/finance/accounting" replace />
  }
  const section = tab as FinanceAdminTab

  return (
    <FinanceAdminPanelSection loading={loading}>
      <FinanceAdminPanelHeader />

      <FinanceAdminKeyField adminKey={adminKey} setAdminKey={setAdminKey} />
      <FinanceAdminSubNav />

      {section === 'accounting' ? (
        <>
          <FinanceAccountingRoadmapNote />

      <FinanceAdminToolbarRegion>
        <FinanceQuickActionsBar
          loading={loading}
          onLoadOverviewAndAccounts={() => void loadOverviewAndAccounts()}
          onLoadPlSummary={() => void loadPlSummary()}
          onLoadDonationsReport={() => void loadDonationsReport()}
          onLoadTrialBalanceReport={() => void loadTrialBalanceReport()}
          onLoadAllReports={() => void loadAllReports()}
          onExportDonationsCsv={() => void downloadCsv('/api/admin/finance/exports/donations.csv', 'finance-donations.csv')}
          onExportPaymentRequestsCsv={() =>
            void downloadCsv('/api/admin/finance/exports/payment-requests.csv', 'finance-payment-requests.csv')
          }
          onExportMeetingSessionsCsv={() =>
            void downloadCsv('/api/admin/finance/exports/meeting-sessions.csv', 'finance-meeting-sessions.csv')
          }
          onExportAuditorPackageCsv={() =>
            void downloadCsv('/api/admin/finance/exports/auditor-package.csv', 'finance-auditor-package.csv')
          }
          onLoadPeriodClosings={() => void loadPeriodClosings()}
        />

        <FinanceAutoRefreshBar
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={toggleAutoRefresh}
          lastAutoRefreshAt={lastAutoRefreshAt}
          autoRefreshPausedByError={autoRefreshPausedByError}
          isAutoRefreshing={isAutoRefreshing}
          autoRefreshFailureCount={autoRefreshFailureCount}
          lastAutoRefreshError={lastAutoRefreshError}
          onResumeAutoRefresh={resumeAutoRefresh}
          alertOnPause={alertOnPause}
          setAlertOnPause={setAlertOnPause}
          soundOnPause={soundOnPause}
          setSoundOnPause={setSoundOnPause}
        />

        <FinanceActivityLogPanel
          activitySearch={activitySearch}
          setActivitySearch={setActivitySearch}
          activityLimit={activityLimit}
          setActivityLimit={setActivityLimit}
          activityFilter={activityFilter}
          setActivityFilter={setActivityFilter}
          activitySearchTrimmed={activitySearchTrimmed}
          activityCounts={activityCounts}
          visibleActivityLog={visibleActivityLog}
          activitySnapshotAt={activitySnapshotAt}
          onCopyFilterSummary={copyActivityFilterSummary}
          onCopyVisibleRows={copyVisibleActivityRows}
          onExportCsv={exportActivityLogCsv}
          onClearLog={() => setActivityLog([])}
          onApplyIncidentPreset={applyIncidentPreset}
          onResetActivityView={resetActivityView}
        />

        <FinanceReportFilters
          loading={loading}
          reportEntity={reportEntity}
          setReportEntity={setReportEntity}
          reportFrom={reportFrom}
          setReportFrom={setReportFrom}
          reportTo={reportTo}
          setReportTo={setReportTo}
          reportKeyword={reportKeyword}
          setReportKeyword={setReportKeyword}
          onClearFilters={() => {
            setReportEntity('')
            setReportFrom('')
            setReportTo('')
            setReportKeyword('')
          }}
        />

        <FinanceReportPresets
          loading={loading}
          allPresets={allPresets}
          selectedPresetId={selectedPresetId}
          setSelectedPresetId={setSelectedPresetId}
          presetName={presetName}
          setPresetName={setPresetName}
          onApplyPreset={applySelectedPreset}
          onApplyPresetAndLoad={() => void applySelectedPresetAndLoad()}
          onSaveCurrentPreset={saveCurrentPreset}
          onDeleteSelectedPreset={deleteSelectedPreset}
        />

        <FinanceOverviewSummary
          accountCount={accounts.length}
          overview={overview}
          plSummary={plSummary}
          donationsReport={donationsReport}
          trialBalance={trialBalance}
          periodClosings={periodClosings}
          periodClosingsSentCount={periodClosingsSentCount}
          periodClosingsCompletedCount={periodClosingsCompletedCount}
        />
      </FinanceAdminToolbarRegion>

      <FinanceAdminAccountingRegion>
        <FinanceAdminAccountingStack
          pl={
            plSummary
              ? {
                  plPaged,
                  plSortKey,
                  plSortDir,
                  sortArrow,
                  onToggleSort: togglePlSort,
                  onExportViewCsv: () => downloadCurrentViewCsv('finance-current-pl.csv', plExportRows),
                  setPlPage,
                }
              : null
          }
          periodClosing={{
            loading,
            closePeriodFrom,
            setClosePeriodFrom,
            closePeriodTo,
            setClosePeriodTo,
            closeBy,
            setCloseBy,
            closeNote,
            setCloseNote,
            onCloseAccountingPeriod: closeAccountingPeriod,
            periodHandoffFilter,
            setPeriodHandoffFilter,
            auditorSentBy,
            setAuditorSentBy,
            auditorHandoffNote,
            setAuditorHandoffNote,
            auditorCompletedBy,
            setAuditorCompletedBy,
            auditorCompletedNote,
            setAuditorCompletedNote,
            periodClosings,
            onLoadPeriodClosingDetail: loadPeriodClosingDetail,
            onMarkAuditorSent: markPeriodClosingAuditorSent,
            onMarkAuditorCompleted: markPeriodClosingAuditorCompleted,
            onDownloadAuditorPackage: downloadPeriodClosingAuditorPackage,
            periodClosingDetail,
            setPeriodClosingDetail,
          }}
          trialBalance={
            trialBalance
              ? {
                  trialBalance,
                  onExportViewCsv: () =>
                    downloadCurrentViewCsv('finance-current-trial-balance.csv', trialBalanceExportRows),
                }
              : null
          }
          journalsGl={{
            loading,
            journalStatusFilter,
            setJournalStatusFilter,
            onLoadJournals: loadJournals,
            journalList,
            onLoadJournalDetail: loadJournalDetail,
            journalDraftEntity,
            setJournalDraftEntity,
            journalDraftDate,
            setJournalDraftDate,
            journalDraftRef,
            setJournalDraftRef,
            journalDraftBy,
            setJournalDraftBy,
            journalDraftMemo,
            setJournalDraftMemo,
            onCreateJournalDraft: createJournalDraft,
            journalActiveId,
            journalLineAccount,
            setJournalLineAccount,
            journalLineDebit,
            setJournalLineDebit,
            journalLineCredit,
            setJournalLineCredit,
            journalLineDesc,
            setJournalLineDesc,
            journalLineBy,
            setJournalLineBy,
            onAddJournalLine: addJournalLine,
            journalPostBy,
            setJournalPostBy,
            onPostJournal: postJournal,
            journalVoidReason,
            setJournalVoidReason,
            journalVoidBy,
            setJournalVoidBy,
            onVoidJournal: voidJournal,
            journalDetail,
            onLinkJournalToPaymentRequest: linkPaymentFromActiveJournal,
            onLoadIncomeStatement: loadIncomeStatementReport,
            bsAsOf,
            setBsAsOf,
            onLoadBalanceSheet: loadBalanceSheetReport,
            glAccountCode,
            setGlAccountCode,
            onLoadGeneralLedger: loadGeneralLedgerReport,
            incomeStatement,
            balanceSheet,
            generalLedger,
          }}
          fiscal={{
            loading,
            toolsEntity,
            setToolsEntity,
            fiscalPeriodFrom,
            setFiscalPeriodFrom,
            fiscalPeriodTo,
            setFiscalPeriodTo,
            fiscalLabel,
            setFiscalLabel,
            onLoadFiscalYears: loadFiscalYears,
            onCreateFiscalYear: createFiscalYear,
            fiscalYears,
            onCloseFiscalYear: closeFiscalYear,
            fiscalCloseSurplusCode,
            setFiscalCloseSurplusCode,
            fiscalCloseBy,
            setFiscalCloseBy,
            fiscalCloseNote,
            setFiscalCloseNote,
            faCode,
            setFaCode,
            faName,
            setFaName,
            faPurchaseDate,
            setFaPurchaseDate,
            faCost,
            setFaCost,
            faResidual,
            setFaResidual,
            faLifeMonths,
            setFaLifeMonths,
            faDepAccCode,
            setFaDepAccCode,
            faAccumAccCode,
            setFaAccumAccCode,
            faNote,
            setFaNote,
            faCreatedBy,
            setFaCreatedBy,
            onLoadFixedAssets: loadFixedAssets,
            onCreateFixedAsset: createFixedAsset,
            fixedAssets,
            depMonth,
            setDepMonth,
            onRunFixedAssetDepreciation: runFixedAssetDepreciation,
            taxMonth,
            setTaxMonth,
            onLoadTaxMonthly: loadTaxMonthly,
            taxMonthly,
            taxCalcBase,
            setTaxCalcBase,
            taxCalcVat,
            setTaxCalcVat,
            taxCalcWht,
            setTaxCalcWht,
            onCalculateTaxPreview: calculateTaxPreview,
            taxCalcResult,
          }}
          donations={
            donationsReport
              ? {
                  loading,
                  donorPaged,
                  batchPaged,
                  entityPaged,
                  donorSortKey,
                  donorSortDir,
                  onToggleDonorSort: toggleDonorSort,
                  batchSortKey,
                  batchSortDir,
                  onToggleBatchSort: toggleBatchSort,
                  entitySortKey,
                  entitySortDir,
                  onToggleEntitySort: toggleEntitySort,
                  sortArrow,
                  setDonorPage,
                  setBatchPage,
                  setEntityPage,
                  onExportDonorsCsv: () => downloadCurrentViewCsv('finance-current-donors.csv', donorExportRows),
                  onExportBatchCsv: () => downloadCurrentViewCsv('finance-current-batch.csv', batchExportRows),
                  onExportEntityCsv: () => downloadCurrentViewCsv('finance-current-entity.csv', entityExportRows),
                }
              : null
          }
        />
      </FinanceAdminAccountingRegion>
        </>
      ) : null}

      {section === 'meetings' ? (
        <div
          className="mt-6 rounded-lg border border-slate-700 bg-slate-950/60 p-4"
          role="group"
          aria-label="เครื่องมือสร้างและติดตามรอบประชุม"
        >
          <FinanceAdminMeetingColumn {...meeting} />
        </div>
      ) : null}

      {section === 'payments' ? (
        <div className="mt-6" role="group" aria-label="คำขอจ่ายเงินและอนุมัติ">
          <PaymentRequestTools {...payment} />
        </div>
      ) : null}

      <FinanceAdminFeedbackFooter msg={msg} isErrorMsg={isErrorMsg} loading={loading} />
    </FinanceAdminPanelSection>
  )
}
