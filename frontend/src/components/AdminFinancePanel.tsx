import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeApiBase } from '../lib/adminApi'
import { PAGE_SIZE } from '../lib/adminFinanceConstants'
import {
  buildBuiltinReportPresets,
  formatActivityTimestamp,
  formatDateInputValue,
  formatThNumber,
  paginateRows,
  rowsToCsvText,
  type ActivityFilter,
  type ReportFilterEntity,
  type ReportPreset,
} from '../lib/adminFinanceHelpers'
import {
  nextBatchSortState,
  nextDonorSortState,
  nextEntitySortState,
  nextPlSortState,
} from '../lib/adminFinanceReportSort'
import { formatFetchError, readApiJson } from '../lib/adminHttp'
import type {
  ActivityItem,
  ActivityLimit,
  BalanceSheetPayload,
  BankAccount,
  BatchSortKey,
  DonationsReportPayload,
  DonorSortKey,
  EntitySortKey,
  FinancePeriodClosingDetail,
  FinancePeriodClosingItem,
  FiscalYearRow,
  FixedAssetRow,
  GeneralLedgerPayload,
  IncomeStatementPayload,
  JournalListItem,
  MeetingAgendaItem,
  MeetingDocumentItem,
  OverviewPayload,
  PlSortKey,
  PlSummaryPayload,
  Props,
  SortDirection,
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
import { FinanceAdminMeetingPaymentSection } from './adminFinance/FinanceAdminMeetingPaymentSection'
import { useFinanceAutoRefresh } from './adminFinance/useFinanceAutoRefresh'
import { useFinancePanelSessionSync } from './adminFinance/useFinancePanelSessionSync'
import { FinanceOverviewSummary } from './adminFinance/FinanceOverviewSummary'
import { FinanceQuickActionsBar } from './adminFinance/FinanceQuickActionsBar'
import { FinanceReportFilters } from './adminFinance/FinanceReportFilters'
import { FinanceReportPresets } from './adminFinance/FinanceReportPresets'
export function AdminFinancePanel({ apiBase }: Props) {
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
  const isErrorMsg = msg !== null && (msg.includes('ไม่สำเร็จ') || msg.includes('HTTP'))
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
  const [meetingMinutes, setMeetingMinutes] = useState('')
  const [meetingMinutesMeta, setMeetingMinutesMeta] = useState('')
  const [meetingMinutesPublished, setMeetingMinutesPublished] = useState(false)
  const [agendaTitle, setAgendaTitle] = useState('')
  const [agendaDetails, setAgendaDetails] = useState('')
  const [agendas, setAgendas] = useState<MeetingAgendaItem[]>([])
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<'all' | 'open' | 'closed'>('open')
  const [voteAgendaId, setVoteAgendaId] = useState('')
  const [agendaVoterName, setAgendaVoterName] = useState('')
  const [agendaVote, setAgendaVote] = useState<'approve' | 'reject' | 'abstain'>('approve')
  const [agendaVoteSummary, setAgendaVoteSummary] = useState('')
  const [agendaPatchId, setAgendaPatchId] = useState('')
  const [agendaPatchTitle, setAgendaPatchTitle] = useState('')
  const [agendaPatchDetails, setAgendaPatchDetails] = useState('')
  const [agendaPatchStatus, setAgendaPatchStatus] = useState<'open' | 'closed'>('open')
  const [documents, setDocuments] = useState<MeetingDocumentItem[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentText, setDocumentText] = useState('')
  const [documentAgendaId, setDocumentAgendaId] = useState('')
  const [documentMeetingId, setDocumentMeetingId] = useState('')
  const [documentPatchId, setDocumentPatchId] = useState('')
  const [documentPatchTitle, setDocumentPatchTitle] = useState('')
  const [documentPatchUrl, setDocumentPatchUrl] = useState('')
  const [documentPatchText, setDocumentPatchText] = useState('')
  const [documentPatchMeetingId, setDocumentPatchMeetingId] = useState('')
  const [documentPatchAgendaId, setDocumentPatchAgendaId] = useState('')

  const [paymentEntity, setPaymentEntity] = useState<'association' | 'cram_school'>('association')
  const [paymentPurpose, setPaymentPurpose] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentBankAccountId, setPaymentBankAccountId] = useState('')
  const [paymentMeetingId, setPaymentMeetingId] = useState('')
  const [paymentRequestId, setPaymentRequestId] = useState('')
  const [paymentPurposeCategory, setPaymentPurposeCategory] = useState<string>('other')
  const [paymentVatRate, setPaymentVatRate] = useState('0')
  const [paymentWhtRate, setPaymentWhtRate] = useState('0')
  const [paymentTaxpayerId, setPaymentTaxpayerId] = useState('')

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

  const [approveSignerId, setApproveSignerId] = useState('')
  const [approveRoleCode, setApproveRoleCode] = useState<'bank_signer_3of5' | 'committee'>('bank_signer_3of5')
  const [approveDecision, setApproveDecision] = useState<'approve' | 'reject'>('approve')
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
  })

  useEffect(() => {
    if (!allPresets.some((p) => p.id === selectedPresetId)) {
      setSelectedPresetId(builtinPresets[0]?.id ?? '')
    }
  }, [allPresets, builtinPresets, selectedPresetId])

  const getReportQueryString = useCallback(() => {
    const q = new URLSearchParams()
    if (reportEntity) q.set('legal_entity_code', reportEntity)
    if (reportFrom.trim()) q.set('from', reportFrom.trim())
    if (reportTo.trim()) q.set('to', reportTo.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
  }, [reportEntity, reportFrom, reportTo])

  const { toggleAutoRefresh, resumeAutoRefresh } = useFinanceAutoRefresh({
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
  })

  const filteredAccounts = useMemo(() => {
    const ent = overview?.entities.find((e) => e.code === paymentEntity)
    if (!ent) return accounts
    return accounts.filter((a) => a.legal_entity_id === ent.id)
  }, [accounts, overview?.entities, paymentEntity])
  const periodClosingsSentCount = useMemo(
    () => periodClosings.filter((row) => row.auditor_handoff_status === 'sent').length,
    [periodClosings],
  )
  const periodClosingsCompletedCount = useMemo(
    () => periodClosings.filter((row) => row.auditor_handoff_status === 'completed').length,
    [periodClosings],
  )

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

  const trialBalanceExportRows = useMemo(
    () =>
      (trialBalance?.rows ?? []).map((row) => ({
        legal_entity_code: row.legalEntityCode,
        legal_entity_name: row.legalEntityName,
        account_code: row.accountCode,
        account_name: row.accountName,
        account_type: row.accountType,
        debit: row.debit,
        credit: row.credit,
        net: row.net,
      })),
    [trialBalance?.rows],
  )

  useEffect(() => {
    setPlPage(1)
    setDonorPage(1)
    setBatchPage(1)
    setEntityPage(1)
  }, [reportKeywordNorm])

  function togglePlSort(nextKey: PlSortKey) {
    const next = nextPlSortState(plSortKey, plSortDir, nextKey)
    setPlSortKey(next.sortKey)
    setPlSortDir(next.sortDir)
  }

  function toggleDonorSort(nextKey: DonorSortKey) {
    const next = nextDonorSortState(donorSortKey, donorSortDir, nextKey)
    setDonorSortKey(next.sortKey)
    setDonorSortDir(next.sortDir)
  }

  function toggleBatchSort(nextKey: BatchSortKey) {
    const next = nextBatchSortState(batchSortKey, batchSortDir, nextKey)
    setBatchSortKey(next.sortKey)
    setBatchSortDir(next.sortDir)
  }

  function toggleEntitySort(nextKey: EntitySortKey) {
    const next = nextEntitySortState(entitySortKey, entitySortDir, nextKey)
    setEntitySortKey(next.sortKey)
    setEntitySortDir(next.sortDir)
  }

  function buildReportQueryStringFromValues(entity: ReportFilterEntity, from: string, to: string) {
    const q = new URLSearchParams()
    if (entity) q.set('legal_entity_code', entity)
    if (from.trim()) q.set('from', from.trim())
    if (to.trim()) q.set('to', to.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  function buildJournalsQueryString() {
    const q = new URLSearchParams()
    if (reportEntity) q.set('legal_entity_code', reportEntity)
    if (reportFrom.trim()) q.set('from', reportFrom.trim())
    if (reportTo.trim()) q.set('to', reportTo.trim())
    if (journalStatusFilter) q.set('status', journalStatusFilter)
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  function buildBalanceSheetQueryString() {
    const q = new URLSearchParams()
    if (reportEntity) q.set('legal_entity_code', reportEntity)
    if (bsAsOf.trim()) q.set('as_of', bsAsOf.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
  }

  function buildGlQueryString() {
    const q = new URLSearchParams()
    if (reportEntity) q.set('legal_entity_code', reportEntity)
    if (reportFrom.trim()) q.set('from', reportFrom.trim())
    if (reportTo.trim()) q.set('to', reportTo.trim())
    if (glAccountCode.trim()) q.set('account_code', glAccountCode.trim())
    const s = q.toString()
    return s ? `?${s}` : ''
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setMsg(`ดาวน์โหลด ${filename} (มุมมองปัจจุบัน) แล้ว`)
  }

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
    downloadCurrentViewCsv('finance-activity-log.csv', rows)
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

  async function loadOverviewAndAccounts() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
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
      const r = await fetch(`${base}/api/admin/finance/reports/pl-summary${getReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/reports/donations${getReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/reports/trial-balance${getReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const [plResp, donationsResp, trialResp] = await Promise.all([
        fetch(`${base}/api/admin/finance/reports/pl-summary${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
        fetch(`${base}/api/admin/finance/reports/donations${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
        fetch(`${base}/api/admin/finance/reports/trial-balance${q}`, {
          headers: { 'x-admin-key': adminKey.trim() },
        }),
      ])
      const [pl, donations, trial] = await Promise.all([readApiJson(plResp), readApiJson(donationsResp), readApiJson(trialResp)])

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
      const q = new URLSearchParams()
      if (reportEntity) q.set('legal_entity_code', reportEntity)
      if (periodHandoffFilter !== 'all') q.set('auditor_handoff_status', periodHandoffFilter)
      q.set('limit', '50')
      const url = `${base}/api/admin/finance/period-closing${q.toString() ? `?${q.toString()}` : ''}`
      const r = await fetch(url, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/period-closing`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: reportEntity,
          period_from: closePeriodFrom,
          period_to: closePeriodTo,
          closed_by: closeBy.trim() || 'finance-admin',
          note: closeNote.trim() || null,
        }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(id)
      const r = await fetch(`${base}/api/admin/finance/period-closing/${safeId}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/period-closing/${safeId}/auditor-package.csv`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const blob = await r.blob()
      if (!r.ok) {
        const txt = await blob.text().catch(() => '')
        setMsg(`ดาวน์โหลดแพ็กผู้ตรวจสอบงวด ${label} ไม่สำเร็จ — HTTP ${r.status}\n${txt}`)
        addActivity('error', `ดาวน์โหลดแพ็กผู้ตรวจสอบงวดไม่สำเร็จ: ${label}`)
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `period-closing-${id}-auditor-package.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
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
      const safeId = encodeURIComponent(id)
      const r = await fetch(`${base}/api/admin/finance/period-closing/${safeId}/mark-auditor-sent`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_sent_by: auditorSentBy.trim() || 'finance-admin',
          auditor_handoff_note: auditorHandoffNote.trim() || null,
        }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(id)
      const r = await fetch(`${base}/api/admin/finance/period-closing/${safeId}/mark-auditor-completed`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_completed_by: auditorCompletedBy.trim() || 'finance-admin',
          auditor_completed_note: auditorCompletedNote.trim() || null,
        }),
      })
      const p = await readApiJson(r)
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
      const q = new URLSearchParams()
      q.set('legal_entity_code', toolsEntity)
      const r = await fetch(`${base}/api/admin/finance/fiscal-years?${q}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/fiscal-years`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: toolsEntity,
          period_from: fiscalPeriodFrom,
          period_to: fiscalPeriodTo,
          fiscal_label: fiscalLabel.trim() || null,
        }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(id)
      const r = await fetch(`${base}/api/admin/finance/fiscal-years/${safeId}/close`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closed_by: fiscalCloseBy.trim() || 'finance-admin',
          close_note: fiscalCloseNote.trim() || null,
          accumulated_surplus_account_code: fiscalCloseSurplusCode.trim() || '3110',
        }),
      })
      const p = await readApiJson(r)
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
      const q = new URLSearchParams()
      q.set('legal_entity_code', toolsEntity)
      const r = await fetch(`${base}/api/admin/finance/fixed-assets?${q}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/fixed-assets`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/fixed-assets/run-depreciation`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: toolsEntity,
          month: depMonth.trim(),
          posted_by: faCreatedBy.trim() || 'finance-admin',
        }),
      })
      const p = await readApiJson(r)
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
      const q = new URLSearchParams()
      q.set('month', taxMonth.trim())
      q.set('legal_entity_code', toolsEntity)
      const r = await fetch(`${base}/api/admin/finance/reports/tax-monthly?${q}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/tax/calculate`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_amount: baseAmount, vat_rate: vatRate, wht_rate: whtRate }),
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/journals${buildJournalsQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(id.trim())
      const r = await fetch(`${base}/api/admin/finance/journals/${safeId}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/journals`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legal_entity_code: journalDraftEntity,
          entry_date: journalDraftDate,
          reference_no: journalDraftRef.trim() || null,
          memo: journalDraftMemo.trim() || null,
          created_by: journalDraftBy.trim() || 'finance-admin',
        }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(journalActiveId.trim())
      const r = await fetch(`${base}/api/admin/finance/journals/${safeId}/lines`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_code: journalLineAccount.trim(),
          debit_amount: Number.isFinite(debit) && debit > 0 ? debit : 0,
          credit_amount: Number.isFinite(credit) && credit > 0 ? credit : 0,
          description: journalLineDesc.trim() || null,
          actor: journalLineBy.trim() || 'finance-admin',
        }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(journalActiveId.trim())
      const r = await fetch(`${base}/api/admin/finance/journals/${safeId}/post`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ posted_by: journalPostBy.trim() || 'finance-admin' }),
      })
      const p = await readApiJson(r)
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
      const safeId = encodeURIComponent(journalActiveId.trim())
      const r = await fetch(`${base}/api/admin/finance/journals/${safeId}/void`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voided_by: journalVoidBy.trim() || 'finance-admin',
          reason: journalVoidReason.trim(),
        }),
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/reports/income-statement${getReportQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/reports/balance-sheet${buildBalanceSheetQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}/api/admin/finance/reports/general-ledger${buildGlQueryString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
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
      const r = await fetch(`${base}${path}${getReportQueryString()}`, {
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
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const expected = Number(meetingExpected)
    if (!meetingTitle.trim() || !Number.isFinite(expected) || expected <= 0) {
      return setMsg('กรอกชื่อประชุม และจำนวนผู้เข้าร่วมที่คาดไว้ต้องมากกว่า 0')
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
      setMsg(`สร้างประชุมแล้ว ต้องมีองค์ประชุมอย่างน้อย ${String(j.quorumRequired ?? '')} คน`)
      addActivity('info', `สร้างประชุมสำเร็จ: ${meetingTitle.trim()} (${meetingEntity})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างประชุมไม่สำเร็จ: ${meetingTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function signAttendance() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim() || !attendanceName.trim()) return setMsg('กรอกรหัสการประชุมและชื่อผู้เข้าประชุม')
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
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
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

  async function loadMeetingMinutes() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/minutes`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลดรายงานการประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as {
        meetingSession?: {
          minutes_markdown?: string | null
          minutes_recorded_by?: string | null
          minutes_updated_at?: string | null
          minutes_published?: boolean
        }
      }
      const minutes = payload.meetingSession?.minutes_markdown
      setMeetingMinutes(typeof minutes === 'string' ? minutes : '')
      const by = payload.meetingSession?.minutes_recorded_by ?? '-'
      const at = payload.meetingSession?.minutes_updated_at ?? '-'
      const published = payload.meetingSession?.minutes_published === true
      setMeetingMinutesPublished(published)
      setMeetingMinutesMeta(`ล่าสุดโดย ${by} เมื่อ ${at} · ${published ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}`)
      setMsg('โหลดรายงานการประชุมแล้ว')
      addActivity('info', `โหลดรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `โหลดรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveMeetingMinutes() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    if (!meetingMinutes.trim()) return setMsg('กรอกบันทึกรายงานการประชุมก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/minutes`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes_markdown: meetingMinutes.trim(),
          minutes_recorded_by: attendanceName.trim() || 'admin-ui',
          publish_to_portal: meetingMinutesPublished,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('บันทึกรายงานการประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกรายงานการประชุมแล้ว')
      addActivity('info', `บันทึกรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
      await loadMeetingMinutes()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `บันทึกรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function downloadMeetingMinutesTxt() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/minutes.txt`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      if (!r.ok) {
        const p = await readApiJson(r)
        return setMsg(formatFetchError('ดาวน์โหลดรายงานการประชุม', p.status, p.payload, p.rawText))
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-minutes-${meetingId.trim()}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg('ดาวน์โหลดรายงานการประชุมแล้ว')
      addActivity('info', `ดาวน์โหลดรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ดาวน์โหลดรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function setMeetingMinutesPublishState(published: boolean) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-sessions/${meetingId.trim()}/minutes/publish`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('อัปเดตสถานะเผยแพร่รายงานประชุม', p.status, p.payload, p.rawText))
      setMeetingMinutesPublished(published)
      setMsg(published ? 'เผยแพร่รายงานการประชุมแล้ว' : 'ซ่อนรายงานการประชุมจากพอร์ทัลแล้ว')
      addActivity('info', `${published ? 'เผยแพร่' : 'ซ่อน'}รายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
      await loadMeetingMinutes()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `อัปเดตสถานะเผยแพร่รายงานประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingAgendas() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const qs = new URLSearchParams()
      qs.set('scope', meetingEntity)
      if (agendaStatusFilter !== 'all') qs.set('status', agendaStatusFilter)
      if (meetingId.trim()) qs.set('meeting_session_id', meetingId.trim())
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas?${qs.toString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลดวาระประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { agendas?: MeetingAgendaItem[] }
      setAgendas(Array.isArray(payload.agendas) ? payload.agendas : [])
      setMsg('โหลดรายการวาระประชุมแล้ว')
      addActivity('info', `โหลดวาระประชุมสำเร็จ (${meetingEntity}/${agendaStatusFilter})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดวาระประชุมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeetingAgenda() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaTitle.trim()) return setMsg('กรอกหัวข้อวาระก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: meetingEntity,
          title: agendaTitle.trim(),
          details: agendaDetails.trim() || null,
          meeting_session_id: meetingId.trim() || null,
          created_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สร้างวาระประชุม', p.status, p.payload, p.rawText))
      setAgendaTitle('')
      setAgendaDetails('')
      setMsg('สร้างวาระประชุมแล้ว')
      addActivity('info', `สร้างวาระประชุมสำเร็จ: ${agendaTitle.trim()}`)
      await loadMeetingAgendas()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างวาระประชุมไม่สำเร็จ: ${agendaTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function castAgendaVote() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!voteAgendaId.trim() || !agendaVoterName.trim()) {
      return setMsg('กรอกรหัสวาระและชื่อผู้โหวต')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas/${voteAgendaId.trim()}/votes`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_name: agendaVoterName.trim(),
          voter_role_code: attendanceRole,
          vote: agendaVote,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('ลงมติวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกผลโหวตแล้ว')
      addActivity('info', `ลงมติสำเร็จ: ${voteAgendaId.trim()} (${agendaVote})`)
      await loadAgendaVoteSummary(voteAgendaId.trim())
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลงมติไม่สำเร็จ: ${voteAgendaId.trim()} (${agendaVote})`)
    } finally {
      setLoading(false)
    }
  }

  async function loadAgendaVoteSummary(agendaId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaId.trim()) return setMsg('กรอกรหัสวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas/${agendaId.trim()}/vote-summary`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('สรุปผลโหวตวาระ', p.status, p.payload, p.rawText))
      setAgendaVoteSummary(JSON.stringify(p.payload, null, 2))
      setMsg('โหลดสรุปผลโหวตวาระแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function closeMeetingAgenda(agendaId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaId.trim()) return setMsg('กรอกรหัสวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas/${agendaId.trim()}/close`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('ปิดวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('ปิดวาระประชุมแล้ว')
      addActivity('info', `ปิดวาระประชุมสำเร็จ: ${agendaId.trim()}`)
      await loadMeetingAgendas()
      await loadAgendaVoteSummary(agendaId.trim())
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ปิดวาระประชุมไม่สำเร็จ: ${agendaId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  function beginPatchMeetingAgenda(agenda: MeetingAgendaItem) {
    setAgendaPatchId(agenda.id)
    setAgendaPatchTitle(agenda.title)
    setAgendaPatchDetails(agenda.details ?? '')
    setAgendaPatchStatus(agenda.status)
    setMsg(null)
  }

  function cancelPatchMeetingAgenda() {
    setAgendaPatchId('')
    setAgendaPatchTitle('')
    setAgendaPatchDetails('')
    setAgendaPatchStatus('open')
  }

  async function savePatchMeetingAgenda() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaPatchId.trim()) return setMsg('เลือกวาระที่จะแก้ไขก่อน')
    if (!agendaPatchTitle.trim()) return setMsg('กรอกหัวข้อวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-agendas/${agendaPatchId.trim()}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: agendaPatchTitle.trim(),
          details: agendaPatchDetails.trim() || null,
          status: agendaPatchStatus,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('แก้ไขวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกการแก้ไขวาระแล้ว')
      addActivity('info', `แก้ไขวาระประชุมสำเร็จ: ${agendaPatchId.trim()}`)
      cancelPatchMeetingAgenda()
      await loadMeetingAgendas()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `แก้ไขวาระประชุมไม่สำเร็จ: ${agendaPatchId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingDocuments() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const qs = new URLSearchParams()
      qs.set('scope', meetingEntity)
      if (documentMeetingId.trim()) qs.set('meeting_session_id', documentMeetingId.trim())
      if (documentAgendaId.trim()) qs.set('agenda_id', documentAgendaId.trim())
      const r = await fetch(`${base}/api/admin/finance/meeting-documents?${qs.toString()}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('โหลดเอกสารประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { documents?: MeetingDocumentItem[] }
      setDocuments(Array.isArray(payload.documents) ? payload.documents : [])
      setMsg('โหลดเอกสารประชุมแล้ว')
      addActivity('info', `โหลดเอกสารประชุมสำเร็จ (${meetingEntity})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดเอกสารประชุมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeetingDocument() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentTitle.trim()) return setMsg('กรอกชื่อเอกสารก่อน')
    if (!documentUrl.trim() && !documentText.trim()) {
      return setMsg('กรอกลิงก์เอกสาร หรือเนื้อหาเอกสารอย่างน้อยหนึ่งค่า')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-documents`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: meetingEntity,
          title: documentTitle.trim(),
          meeting_session_id: documentMeetingId.trim() || null,
          agenda_id: documentAgendaId.trim() || null,
          document_url: documentUrl.trim() || null,
          document_text: documentText.trim() || null,
          uploaded_by: attendanceName.trim() || 'admin-ui',
          published_to_portal: false,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('เพิ่มเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('เพิ่มเอกสารประชุมแล้ว')
      setDocumentTitle('')
      setDocumentUrl('')
      setDocumentText('')
      addActivity('info', `เพิ่มเอกสารประชุมสำเร็จ: ${documentTitle.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `เพิ่มเอกสารประชุมไม่สำเร็จ: ${documentTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function deleteMeetingDocument(documentId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-documents/${documentId.trim()}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('ลบเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('ลบเอกสารประชุมแล้ว')
      addActivity('warn', `ลบเอกสารประชุมสำเร็จ: ${documentId.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลบเอกสารประชุมไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function downloadMeetingDocumentTxt(documentId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-documents/${documentId.trim()}/download.txt`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      if (!r.ok) {
        const p = await readApiJson(r)
        return setMsg(formatFetchError('ดาวน์โหลดเอกสารประชุม', p.status, p.payload, p.rawText))
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-document-${documentId.trim()}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMsg('ดาวน์โหลดเอกสารประชุมแล้ว')
      addActivity('info', `ดาวน์โหลดเอกสารประชุมสำเร็จ: ${documentId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ดาวน์โหลดเอกสารประชุมไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function toggleMeetingDocumentPublished(documentId: string, nextPublished: boolean) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-documents/${documentId.trim()}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_to_portal: nextPublished }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('อัปเดตสถานะเผยแพร่เอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg(nextPublished ? 'เผยแพร่เอกสารประชุมแล้ว' : 'ซ่อนเอกสารประชุมจากพอร์ทัลแล้ว')
      addActivity('info', `${nextPublished ? 'เผยแพร่' : 'ซ่อน'}เอกสารประชุมสำเร็จ: ${documentId.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `อัปเดตสถานะเผยแพร่เอกสารไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  function beginPatchMeetingDocument(doc: MeetingDocumentItem) {
    setDocumentPatchId(doc.id)
    setDocumentPatchTitle(doc.title)
    setDocumentPatchUrl(doc.document_url ?? '')
    setDocumentPatchText(doc.document_text ?? '')
    setDocumentPatchMeetingId(doc.meeting_session_id ?? '')
    setDocumentPatchAgendaId(doc.agenda_id ?? '')
    setMsg(null)
  }

  function cancelPatchMeetingDocument() {
    setDocumentPatchId('')
    setDocumentPatchTitle('')
    setDocumentPatchUrl('')
    setDocumentPatchText('')
    setDocumentPatchMeetingId('')
    setDocumentPatchAgendaId('')
  }

  async function savePatchMeetingDocument() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentPatchId.trim()) return setMsg('เลือกเอกสารที่จะแก้ไขก่อน')
    if (!documentPatchTitle.trim()) return setMsg('กรอกชื่อเอกสาร')
    const urlT = documentPatchUrl.trim()
    const textT = documentPatchText.trim()
    if (!urlT && !textT) {
      return setMsg('ต้องมีลิงก์เอกสารหรือเนื้อหาอย่างน้อยหนึ่งค่า (ตรงกับกติกาตอนสร้างเอกสาร)')
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/finance/meeting-documents/${documentPatchId.trim()}`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey.trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentPatchTitle.trim(),
          document_url: urlT || null,
          document_text: textT || null,
          meeting_session_id: documentPatchMeetingId.trim() || null,
          agenda_id: documentPatchAgendaId.trim() || null,
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) return setMsg(formatFetchError('แก้ไขเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกการแก้ไขเอกสารแล้ว')
      addActivity('info', `แก้ไขเอกสารประชุมสำเร็จ: ${documentPatchId.trim()}`)
      cancelPatchMeetingDocument()
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `แก้ไขเอกสารประชุมไม่สำเร็จ: ${documentPatchId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function createPaymentRequest() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const amount = Number(paymentAmount)
    if (!paymentPurpose.trim() || !Number.isFinite(amount) || amount <= 0) {
      return setMsg('กรอกวัตถุประสงค์และจำนวนเงินที่มากกว่า 0')
    }
    if (amount <= 20000 && !paymentBankAccountId) {
      return setMsg('ยอด <= 20,000 ต้องเลือกบัญชีธนาคาร')
    }
    if (amount <= 20000 && paymentPurposeCategory === 'other') {
      return setMsg('ยอดไม่เกิน 20,000 บาทต้องเลือกหมวดค่าใช้จ่ายปกติธุระ (ห้ามใช้ “อื่นๆ”) — ใช้ยอดเกิน 20,000 พร้อมมติประชุมแทน')
    }
    if (amount > 20000 && !paymentMeetingId.trim()) {
      return setMsg('ยอด > 20,000 ต้องกรอกรหัสการประชุม')
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
          purpose_category: paymentPurposeCategory || undefined,
          amount,
          vat_rate: Number(paymentVatRate),
          wht_rate: Number(paymentWhtRate),
          taxpayer_id: paymentTaxpayerId.trim() || undefined,
          bank_account_id: amount <= 20000 ? paymentBankAccountId : undefined,
          meeting_session_id: amount > 20000 ? paymentMeetingId.trim() : undefined,
          requested_by: 'admin-ui',
        }),
      })
      const p = await readApiJson(r)
      if (!p.ok) {
        addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()} (${formatThNumber(amount)})`)
        return setMsg(formatFetchError('สร้างคำขอจ่ายเงิน', p.status, p.payload, p.rawText))
      }
      const j = (p.payload ?? {}) as { paymentRequest?: { id?: string } }
      if (j.paymentRequest?.id) setPaymentRequestId(j.paymentRequest.id)
      setMsg('สร้างคำขอจ่ายเงินแล้ว')
      addActivity('info', `สร้างคำขอจ่ายเงินสำเร็จ: ${paymentPurpose.trim()} (${formatThNumber(amount)})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างคำขอจ่ายเงินไม่สำเร็จ: ${paymentPurpose.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function approvePayment() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!paymentRequestId.trim()) return setMsg('กรอกรหัสคำขอจ่ายเงิน')
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

  const paymentAmountParsed = Number(paymentAmount)
  const paymentLowAmountOtherBlocked =
    Number.isFinite(paymentAmountParsed) &&
    paymentAmountParsed > 0 &&
    paymentAmountParsed <= 20000 &&
    paymentPurposeCategory === 'other'

  return (
    <FinanceAdminPanelSection loading={loading}>
      <FinanceAdminPanelHeader />

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
          autoRefreshSeconds={autoRefreshSeconds}
          setAutoRefreshSeconds={setAutoRefreshSeconds}
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

      <FinanceAdminMeetingPaymentSection
        meeting={{
          loading,
          meetingEntity,
          setMeetingEntity,
          meetingTitle,
          setMeetingTitle,
          meetingExpected,
          setMeetingExpected,
          onCreateMeeting: createMeeting,
          meetingId,
          setMeetingId,
          attendanceName,
          setAttendanceName,
          attendanceRole,
          setAttendanceRole,
          attendanceLineUid,
          setAttendanceLineUid,
          onSignAttendance: signAttendance,
          onLoadMeetingSummary: loadMeetingSummary,
          onLoadMeetingMinutes: loadMeetingMinutes,
          meetingSummary,
          meetingMinutesMeta,
          meetingMinutes,
          setMeetingMinutes,
          onSaveMeetingMinutes: saveMeetingMinutes,
          onDownloadMeetingMinutesTxt: downloadMeetingMinutesTxt,
          onPublishMinutes: () => void setMeetingMinutesPublishState(true),
          onUnpublishMinutes: () => void setMeetingMinutesPublishState(false),
          meetingMinutesPublished,
          agendas,
          agendaTitle,
          setAgendaTitle,
          agendaDetails,
          setAgendaDetails,
          onCreateMeetingAgenda: createMeetingAgenda,
          agendaStatusFilter,
          setAgendaStatusFilter,
          onLoadMeetingAgendas: loadMeetingAgendas,
          onSelectAgendaForSummary: (agenda) => {
            setVoteAgendaId(agenda.id)
            void loadAgendaVoteSummary(agenda.id)
          },
          onCloseMeetingAgenda: closeMeetingAgenda,
          onBeginPatchMeetingAgenda: beginPatchMeetingAgenda,
          agendaPatchId,
          agendaPatchTitle,
          setAgendaPatchTitle,
          agendaPatchDetails,
          setAgendaPatchDetails,
          agendaPatchStatus,
          setAgendaPatchStatus,
          onSavePatchMeetingAgenda: () => void savePatchMeetingAgenda(),
          onCancelPatchMeetingAgenda: cancelPatchMeetingAgenda,
          voteAgendaId,
          setVoteAgendaId,
          agendaVoterName,
          setAgendaVoterName,
          agendaVote,
          setAgendaVote,
          onCastAgendaVote: castAgendaVote,
          agendaVoteSummary,
          documents,
          documentTitle,
          setDocumentTitle,
          documentMeetingId,
          setDocumentMeetingId,
          documentAgendaId,
          setDocumentAgendaId,
          documentUrl,
          setDocumentUrl,
          documentText,
          setDocumentText,
          onCreateMeetingDocument: createMeetingDocument,
          onLoadMeetingDocuments: loadMeetingDocuments,
          onDownloadMeetingDocumentTxt: downloadMeetingDocumentTxt,
          onToggleMeetingDocumentPublished: toggleMeetingDocumentPublished,
          onBeginPatchMeetingDocument: beginPatchMeetingDocument,
          onDeleteMeetingDocument: deleteMeetingDocument,
          documentPatchId,
          documentPatchTitle,
          setDocumentPatchTitle,
          documentPatchMeetingId,
          setDocumentPatchMeetingId,
          documentPatchAgendaId,
          setDocumentPatchAgendaId,
          documentPatchUrl,
          setDocumentPatchUrl,
          documentPatchText,
          setDocumentPatchText,
          onSavePatchMeetingDocument: () => void savePatchMeetingDocument(),
          onCancelPatchMeetingDocument: cancelPatchMeetingDocument,
        }}
        payment={{
          loading,
          paymentEntity,
          setPaymentEntity,
          paymentPurpose,
          setPaymentPurpose,
          paymentAmount,
          setPaymentAmount,
          paymentPurposeCategory,
          setPaymentPurposeCategory,
          paymentVatRate,
          setPaymentVatRate,
          paymentWhtRate,
          setPaymentWhtRate,
          paymentTaxpayerId,
          setPaymentTaxpayerId,
          paymentBankAccountId,
          setPaymentBankAccountId,
          paymentMeetingId,
          setPaymentMeetingId,
          paymentRequestId,
          setPaymentRequestId,
          paymentLowAmountOtherBlocked,
          filteredAccounts,
          selectedAccount,
          approveRoleCode,
          setApproveRoleCode,
          approveSignerId,
          setApproveSignerId,
          approveDecision,
          setApproveDecision,
          onCreatePaymentRequest: createPaymentRequest,
          onApprovePayment: approvePayment,
        }}
      />

      <FinanceAdminFeedbackFooter msg={msg} isErrorMsg={isErrorMsg} loading={loading} />
    </FinanceAdminPanelSection>
  )
}
