import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_ADMIN = 'yrc_admin_upload_key'
const STORAGE_PRESIDENT = 'yrc_president_upload_key'
const STORAGE_AUTO_REFRESH = 'yrc_member_requests_auto_refresh'
const STORAGE_AUTO_REFRESH_MS = 'yrc_member_requests_auto_refresh_ms'
const STORAGE_LAST_PENDING = 'yrc_member_requests_last_pending'
const STORAGE_LAST_REQUEST_IDS = 'yrc_member_requests_last_ids'
const STORAGE_VIEW_PRESET = 'yrc_member_requests_view_preset'
const STORAGE_ACTIVITY_ACTION = 'yrc_member_requests_activity_action'
const STORAGE_ACTIVITY_SEARCH = 'yrc_member_requests_activity_search'
const STORAGE_ACTIVITY_LIMIT = 'yrc_member_requests_activity_limit'
const STORAGE_ACTIVITY_PRESET = 'yrc_member_requests_activity_preset'
const REJECT_REASON_TEMPLATES = [
  'ข้อมูลไม่ครบถ้วน กรุณาแนบ/กรอกข้อมูลเพิ่มเติม',
  'ไม่พบข้อมูลยืนยันตัวตนตามทะเบียน กรุณาตรวจสอบชื่อ-นามสกุล-รุ่น',
  'ข้อมูลซ้ำกับสมาชิกที่มีอยู่แล้ว กรุณาติดต่อผู้ดูแล',
  'รายละเอียดคำร้องไม่ตรงตามเงื่อนไข กรุณาแก้ไขแล้วส่งใหม่',
] as const

type RequestRow = {
  id: string
  line_uid: string | null
  request_type: string
  requested_data: Record<string, unknown>
  status: string
  president_approved_by: string | null
  president_approved_at: string | null
  admin_approved_by: string | null
  admin_approved_at: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  action_history?: unknown
  created_at: string
}

type ActionHistoryEntry = {
  action: 'submitted' | 'president_approved' | 'admin_approved' | 'rejected'
  actor: string
  at: string
  comment: string | null
  from_status: string | null
  to_status: string | null
}

type ActivityFilter = 'all' | ActionHistoryEntry['action']
type ActivityPreset = 'manual' | 'rejected_recent' | 'pending_approvals' | 'today'
type ActivitySeverityFilter = 'all' | 'critical' | 'warning' | 'info'
type ReviewIntent = 'approve' | 'reject'

type RequestActivityRow = ActionHistoryEntry & {
  requestId: string
  lineUid: string
  batch: string
  fullName: string
  currentStatus: string
  severity: ActivitySeverityFilter
  isToday: boolean
}

type QuickView = 'all' | 'new' | 'pending'
type SortMode = 'newest' | 'oldest' | 'pending_first'
type ViewPreset = 'manual' | 'pending_work' | 'new_only' | 'approved_review'

type Props = { apiBase: string }

export function MemberRequestsPanel({ apiBase }: Props) {
  const [adminKey, setAdminKey] = useState('')
  const [presidentKey, setPresidentKey] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoRefreshMs, setAutoRefreshMs] = useState(30000)
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)
  const [pendingIncrease, setPendingIncrease] = useState(0)
  const [newRowIds, setNewRowIds] = useState<string[]>([])
  const [quickView, setQuickView] = useState<QuickView>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [viewPreset, setViewPreset] = useState<ViewPreset>('manual')
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null)
  const [decisionCommentDraft, setDecisionCommentDraft] = useState('')
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null)
  const [pendingReviewDraft, setPendingReviewDraft] = useState<{ requestId: string; intent: ReviewIntent; comment: string } | null>(
    null,
  )
  const [activityActionFilter, setActivityActionFilter] = useState<ActivityFilter>('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [activityLimit, setActivityLimit] = useState(20)
  const [activityPreset, setActivityPreset] = useState<ActivityPreset>('manual')
  const [activitySeverityFilter, setActivitySeverityFilter] = useState<ActivitySeverityFilter>('all')
  const detailSectionRef = useRef<HTMLElement | null>(null)
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null)
  const requestRowRefs = useRef<Record<string, HTMLLIElement | null>>({})

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      pending_president: 0,
      pending_admin: 0,
      approved: 0,
      rejected: 0,
      other: 0,
    }

    for (const row of rows) {
      switch (row.status) {
        case 'pending_president':
          counts.pending_president += 1
          break
        case 'pending_admin':
          counts.pending_admin += 1
          break
        case 'approved':
          counts.approved += 1
          break
        case 'rejected':
          counts.rejected += 1
          break
        default:
          counts.other += 1
          break
      }
    }

    return counts
  }, [rows])

  const pendingTotal = summary.pending_president + summary.pending_admin
  const newRowIdSet = useMemo(() => new Set(newRowIds), [newRowIds])
  const searchQueryTrimmed = searchQuery.trim().toLowerCase()
  const activitySearchTrimmed = activitySearch.trim().toLowerCase()
  const filteredRows = useMemo(() => {
    let nextRows = rows

    if (quickView === 'new') {
      nextRows = nextRows.filter((row) => newRowIdSet.has(row.id))
    } else if (quickView === 'pending') {
      nextRows = nextRows.filter((row) => row.status === 'pending_president' || row.status === 'pending_admin')
    }

    if (!searchQueryTrimmed) return nextRows

    return nextRows.filter((row) => buildRequestSearchText(row).includes(searchQueryTrimmed))
  }, [newRowIdSet, quickView, rows, searchQueryTrimmed])
  const sortedRows = useMemo(() => {
    const nextRows = [...filteredRows]

    if (sortMode === 'oldest') {
      return nextRows.sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b))
    }

    if (sortMode === 'pending_first') {
      return nextRows.sort((a, b) => {
        const pendingDiff = getPendingPriority(a.status) - getPendingPriority(b.status)
        if (pendingDiff !== 0) return pendingDiff
        return getCreatedAtMs(b) - getCreatedAtMs(a)
      })
    }

    return nextRows.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
  }, [filteredRows, sortMode])
  const activityRows = useMemo(() => {
    const now = new Date()
    const flattened = rows.flatMap((row) => {
      const batch = pickRequestedText(row.requested_data, 'batch')
      const fullName = [pickRequestedText(row.requested_data, 'first_name'), pickRequestedText(row.requested_data, 'last_name')]
        .filter(Boolean)
        .join(' ')

      return getActionHistoryEntries(row).map((entry) => ({
        ...entry,
        requestId: row.id,
        lineUid: row.line_uid ?? '',
        batch,
        fullName,
        currentStatus: row.status,
        severity: getActivitySeverity(entry),
        isToday: isSameLocalDay(entry.at, now),
      }))
    })

    const filtered = flattened.filter((entry) => {
      if (activityActionFilter !== 'all' && entry.action !== activityActionFilter) return false
      if (activityPreset === 'today' && !entry.isToday) return false
      if (activitySeverityFilter !== 'all' && entry.severity !== activitySeverityFilter) return false
      if (!activitySearchTrimmed) return true
      return buildActivitySearchText(entry).includes(activitySearchTrimmed)
    })

    return filtered
      .sort((a, b) => getActivityAtMs(b) - getActivityAtMs(a))
      .slice(0, activityLimit)
  }, [activityActionFilter, activityLimit, activityPreset, activitySearchTrimmed, activitySeverityFilter, rows])
  const activitySummary = useMemo(() => {
    const counts: Record<ActivityFilter, number> = {
      all: 0,
      submitted: 0,
      president_approved: 0,
      admin_approved: 0,
      rejected: 0,
    }

    for (const row of rows) {
      for (const entry of getActionHistoryEntries(row)) {
        counts.all += 1
        counts[entry.action] += 1
      }
    }

    return counts
  }, [rows])
  const activitySeveritySummary = useMemo(() => {
    const counts: Record<ActivitySeverityFilter, number> = {
      all: 0,
      critical: 0,
      warning: 0,
      info: 0,
    }

    for (const row of rows) {
      for (const entry of getActionHistoryEntries(row)) {
        const severity = getActivitySeverity(entry)
        counts.all += 1
        counts[severity] += 1
      }
    }

    return counts
  }, [rows])

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_ADMIN) ?? '')
    setPresidentKey(sessionStorage.getItem(STORAGE_PRESIDENT) ?? '')
    setAutoRefresh(sessionStorage.getItem(STORAGE_AUTO_REFRESH) === 'true')
    const savedPreset = sessionStorage.getItem(STORAGE_VIEW_PRESET)
    if (
      savedPreset === 'manual' ||
      savedPreset === 'pending_work' ||
      savedPreset === 'new_only' ||
      savedPreset === 'approved_review'
    ) {
      setViewPreset(savedPreset)
    }

    const savedMs = Number(sessionStorage.getItem(STORAGE_AUTO_REFRESH_MS) ?? '30000')
    if (Number.isFinite(savedMs) && savedMs >= 5000) {
      setAutoRefreshMs(savedMs)
    }

    const savedActivityAction = sessionStorage.getItem(STORAGE_ACTIVITY_ACTION)
    if (
      savedActivityAction === 'all' ||
      savedActivityAction === 'submitted' ||
      savedActivityAction === 'president_approved' ||
      savedActivityAction === 'admin_approved' ||
      savedActivityAction === 'rejected'
    ) {
      setActivityActionFilter(savedActivityAction)
    }

    setActivitySearch(sessionStorage.getItem(STORAGE_ACTIVITY_SEARCH) ?? '')
    const savedActivityLimit = Number(sessionStorage.getItem(STORAGE_ACTIVITY_LIMIT) ?? '20')
    if (Number.isFinite(savedActivityLimit) && savedActivityLimit >= 5) {
      setActivityLimit(savedActivityLimit)
    }

    const savedActivityPreset = sessionStorage.getItem(STORAGE_ACTIVITY_PRESET)
    if (
      savedActivityPreset === 'manual' ||
      savedActivityPreset === 'rejected_recent' ||
      savedActivityPreset === 'pending_approvals' ||
      savedActivityPreset === 'today'
    ) {
      setActivityPreset(savedActivityPreset)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ADMIN, adminKey)
  }, [adminKey])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_PRESIDENT, presidentKey)
  }, [presidentKey])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_AUTO_REFRESH, autoRefresh ? 'true' : 'false')
  }, [autoRefresh])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_AUTO_REFRESH_MS, String(autoRefreshMs))
  }, [autoRefreshMs])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_VIEW_PRESET, viewPreset)
  }, [viewPreset])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ACTIVITY_ACTION, activityActionFilter)
  }, [activityActionFilter])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ACTIVITY_SEARCH, activitySearch)
  }, [activitySearch])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ACTIVITY_LIMIT, String(activityLimit))
  }, [activityLimit])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ACTIVITY_PRESET, activityPreset)
  }, [activityPreset])

  useEffect(() => {
    if (!selectedRequest) {
      setDecisionCommentDraft('')
      setReviewIntent(null)
      return
    }

    if (pendingReviewDraft && pendingReviewDraft.requestId === selectedRequest.id) {
      setDecisionCommentDraft(pendingReviewDraft.comment)
      setReviewIntent(pendingReviewDraft.intent)
      setPendingReviewDraft(null)
      return
    }

    setDecisionCommentDraft('')
    setReviewIntent(null)
  }, [pendingReviewDraft, selectedRequest])

  useEffect(() => {
    if (!highlightedRequestId) return

    const timer = window.setTimeout(() => {
      setHighlightedRequestId((current) => (current === highlightedRequestId ? null : current))
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [highlightedRequestId])

  useEffect(() => {
    const savedPending = Number(sessionStorage.getItem(STORAGE_LAST_PENDING) ?? '0')
    if (!Number.isFinite(savedPending) || savedPending < 0) return
    if (savedPending > 0 && pendingTotal > savedPending) {
      setPendingIncrease(pendingTotal - savedPending)
    }
    sessionStorage.setItem(STORAGE_LAST_PENDING, String(pendingTotal))
  }, [pendingTotal])

  useEffect(() => {
    if (!selectedRequest) return

    const match = rows.find((row) => row.id === selectedRequest.id)
    if (!match) {
      setSelectedRequest(null)
      setReviewIntent(null)
      setPendingReviewDraft(null)
      return
    }

    if (!isPendingRequestStatus(match.status) && isPendingRequestStatus(selectedRequest.status)) {
      setSelectedRequest(null)
      setReviewIntent(null)
      setPendingReviewDraft(null)
      setMsg((current) => current ?? `คำร้อง ${match.id} ถูกอัปเดตเป็น ${match.status} แล้ว ปิด detail ให้อัตโนมัติ`)
      return
    }

    if (match !== selectedRequest) {
      setSelectedRequest(match)
    }
  }, [rows, selectedRequest])

  useEffect(() => {
    const savedRaw = sessionStorage.getItem(STORAGE_LAST_REQUEST_IDS)
    const savedIds = savedRaw ? savedRaw.split(',').map((v) => v.trim()).filter(Boolean) : []
    const currentIds = rows.map((row) => row.id)

    if (savedIds.length === 0) {
      setNewRowIds([])
      if (currentIds.length > 0) sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
      return
    }

    const savedSet = new Set(savedIds)
    const incoming = currentIds.filter((id) => !savedSet.has(id))
    setNewRowIds(incoming)
    sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
  }, [rows])

  const load = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key ก่อน (เฉพาะ Admin ดูรายการได้)')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const q = filter.trim() ? `?status=${encodeURIComponent(filter.trim())}` : ''
      const r = await fetch(`${apiBase}/api/admin/member-requests${q}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const j = (await r.json().catch(() => ({}))) as { requests?: RequestRow[]; error?: string }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setRows(j.requests ?? [])
      setLastLoadedAt(new Date().toISOString())
    } catch {
      setMsg('โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminKey, filter])

  useEffect(() => {
    if (!autoRefresh || !adminKey.trim()) return

    const timer = window.setInterval(() => {
      void load()
    }, autoRefreshMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [adminKey, autoRefresh, autoRefreshMs, load])

  function headersAdminOnly(): Record<string, string> | null {
    if (!adminKey.trim()) return null
    return {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey.trim(),
    }
  }

  /** อนุมัติประธานรุ่น / ปฏิเสธ — ส่ง x-admin-key หรือ x-president-key อย่างใดอย่างหนึ่ง (หรือทั้งคู่) */
  function headersPresidentOrAdmin(): Record<string, string> | null {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminKey.trim()) h['x-admin-key'] = adminKey.trim()
    if (presidentKey.trim()) h['x-president-key'] = presidentKey.trim()
    if (!adminKey.trim() && !presidentKey.trim()) return null
    return h
  }

  async function callAction(
    path: string,
    body: Record<string, string | undefined>,
    auth: 'admin-only' | 'president-or-admin',
  ) {
    const headers =
      auth === 'admin-only' ? headersAdminOnly() : headersPresidentOrAdmin()
    if (!headers) {
      setMsg(
        auth === 'admin-only'
          ? 'ใส่ x-admin-key'
          : 'ใส่ x-admin-key หรือ x-president-key (ต้องตรงกับ backend)',
      )
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${apiBase}/api/admin/member-requests${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
      setMsg(buildActionFeedbackMessage(path, body, r.ok, j))
      if (r.ok) await load()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function markAllAsSeen() {
    const currentIds = rows.map((row) => row.id)
    sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
    sessionStorage.setItem(STORAGE_LAST_PENDING, String(pendingTotal))
    setNewRowIds([])
    setPendingIncrease(0)
    setMsg('ทำเครื่องหมายคำร้องปัจจุบันทั้งหมดว่าเห็นแล้ว')
  }

  function applyRejectReasonTemplate(reason: string) {
    setDecisionCommentDraft(reason)
  }

  function applyActivityPreset(preset: ActivityPreset) {
    setActivityPreset(preset)

    if (preset === 'rejected_recent') {
      setActivityActionFilter('rejected')
      setActivitySeverityFilter('critical')
      setActivitySearch('')
      setActivityLimit(20)
      setMsg('เปลี่ยนเป็น activity preset: rejected recent')
      return
    }

    if (preset === 'pending_approvals') {
      setActivityActionFilter('all')
      setActivitySeverityFilter('warning')
      setActivitySearch('pending_')
      setActivityLimit(50)
      setMsg('เปลี่ยนเป็น activity preset: pending approvals')
      return
    }

    if (preset === 'today') {
      setActivityActionFilter('all')
      setActivitySeverityFilter('all')
      setActivitySearch('')
      setActivityLimit(50)
      setMsg('เปลี่ยนเป็น activity preset: today')
      return
    }

    setMsg('เปลี่ยนเป็น activity preset: manual')
  }

  function saveCurrentAsManualActivityPreset() {
    setActivityPreset('manual')
    setMsg('บันทึก activity view ปัจจุบันเป็น manual preset แล้ว')
  }

  function openRequestDetailFromActivity(requestId: string, intent?: ReviewIntent) {
    const match = rows.find((row) => row.id === requestId)
    if (!match) {
      setMsg(`ไม่พบคำร้อง ${requestId} ในรายการปัจจุบัน`)
      return
    }

    if (intent) {
      if (!isPendingRequestStatus(match.status)) {
        setMsg(`คำร้อง ${requestId} ไม่ได้อยู่ในสถานะรอตรวจแล้ว`)
        return
      }

      setPendingReviewDraft({
        requestId,
        intent,
        comment: buildSuggestedReviewComment(match, intent),
      })
      setMsg(`เปิด review mode สำหรับ ${requestId}: ${intent === 'approve' ? 'approve' : 'reject'}`)
    } else {
      setPendingReviewDraft(null)
    }

    setSelectedRequest(match)
    setHighlightedRequestId(requestId)
    requestRowRefs.current[requestId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function applyPreset(preset: ViewPreset) {
    setViewPreset(preset)

    if (preset === 'pending_work') {
      setQuickView('pending')
      setFilter('')
      setSearchQuery('')
      setSortMode('pending_first')
      setMsg('เปลี่ยนเป็น preset: pending work')
      return
    }

    if (preset === 'new_only') {
      setQuickView('new')
      setFilter('')
      setSearchQuery('')
      setSortMode('newest')
      setMsg('เปลี่ยนเป็น preset: new only')
      return
    }

    if (preset === 'approved_review') {
      setQuickView('all')
      setFilter('approved')
      setSearchQuery('')
      setSortMode('newest')
      setMsg('เปลี่ยนเป็น preset: approved review')
      return
    }

    setMsg('เปลี่ยนเป็น preset: manual')
  }

  function saveCurrentAsManualPreset() {
    setViewPreset('manual')
    setMsg('บันทึกมุมมองปัจจุบันเป็น manual preset แล้ว')
  }

  function exportCurrentViewCsv() {
    if (sortedRows.length === 0) {
      setMsg('ยังไม่มีรายการในมุมมองปัจจุบันให้ export')
      return
    }

    const headers = [
      'id',
      'status',
      'request_type',
      'line_uid',
      'batch',
      'first_name',
      'last_name',
      'created_at',
      'is_new',
    ]

    const lines = [
      headers.join(','),
      ...sortedRows.map((row) =>
        [
          csvCell(row.id),
          csvCell(row.status),
          csvCell(row.request_type),
          csvCell(row.line_uid ?? ''),
          csvCell(pickRequestedText(row.requested_data, 'batch')),
          csvCell(pickRequestedText(row.requested_data, 'first_name')),
          csvCell(pickRequestedText(row.requested_data, 'last_name')),
          csvCell(row.created_at),
          csvCell(newRowIdSet.has(row.id) ? 'yes' : 'no'),
        ].join(','),
      ),
    ]

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-requests-${viewPreset}-${sortMode}-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setMsg(`exported ${sortedRows.length} rows from current view`)
  }

  function exportActivityCsv() {
    if (activityRows.length === 0) {
      setMsg('ยังไม่มี activity ในมุมมองปัจจุบันให้ export')
      return
    }

    const headers = [
      'request_id',
      'action',
      'action_label',
      'actor',
      'at',
      'line_uid',
      'batch',
      'name',
      'from_status',
      'to_status',
      'comment',
    ]

    const lines = [
      headers.join(','),
      ...activityRows.map((entry) =>
        [
          csvCell(entry.requestId),
          csvCell(entry.action),
          csvCell(getActionHistoryLabel(entry.action)),
          csvCell(entry.actor),
          csvCell(entry.at),
          csvCell(entry.lineUid),
          csvCell(entry.batch),
          csvCell(entry.fullName),
          csvCell(entry.from_status ?? ''),
          csvCell(entry.to_status ?? ''),
          csvCell(entry.comment ?? ''),
        ].join(','),
      ),
    ]

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `member-request-activity-${activityActionFilter}-${activityLimit}-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setMsg(`exported ${activityRows.length} activity rows`)
  }

  async function copyRequestSummary() {
    if (!selectedRequest) return
    const text = buildRequestSummaryText(selectedRequest)
    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกสรุปคำร้องแล้ว')
    } catch {
      setMsg('คัดลอกสรุปคำร้องไม่สำเร็จ')
    }
  }

  async function copyRequestDetails() {
    if (!selectedRequest) return
    const text = buildRequestDetailText(selectedRequest)
    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกรายละเอียดคำร้องแล้ว')
    } catch {
      setMsg('คัดลอกรายละเอียดคำร้องไม่สำเร็จ')
    }
  }

  async function copyActivitySummary() {
    const text = [
      `activity_total: ${activitySummary.all}`,
      `submitted: ${activitySummary.submitted}`,
      `president_approved: ${activitySummary.president_approved}`,
      `admin_approved: ${activitySummary.admin_approved}`,
      `rejected: ${activitySummary.rejected}`,
      `visible_rows: ${activityRows.length}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกสรุป activity log แล้ว')
    } catch {
      setMsg('คัดลอกสรุป activity log ไม่สำเร็จ')
    }
  }

  async function copyActivityRows() {
    if (activityRows.length === 0) {
      setMsg('ยังไม่มี activity rows ให้คัดลอก')
      return
    }

    const text = activityRows.map((entry) => buildActivityRowText(entry)).join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setMsg(`คัดลอก activity ${activityRows.length} แถวแล้ว`)
    } catch {
      setMsg('คัดลอก activity rows ไม่สำเร็จ')
    }
  }

  async function copyActivityValue(label: string, value: string) {
    if (!value.trim()) {
      setMsg(`ไม่มี ${label} ให้คัดลอก`)
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setMsg(`คัดลอก ${label} แล้ว`)
    } catch {
      setMsg(`คัดลอก ${label} ไม่สำเร็จ`)
    }
  }

  async function copyActivityRowSummary(entry: RequestActivityRow) {
    try {
      await navigator.clipboard.writeText(buildActivityRowText(entry))
      setMsg('คัดลอกสรุป activity row แล้ว')
    } catch {
      setMsg('คัดลอกสรุป activity row ไม่สำเร็จ')
    }
  }

  async function copyActivityMemberIdentity(entry: RequestActivityRow) {
    const text = buildActivityIdentityText(entry)
    try {
      await navigator.clipboard.writeText(text)
      setMsg('คัดลอกข้อมูลสมาชิกจาก activity แล้ว')
    } catch {
      setMsg('คัดลอกข้อมูลสมาชิกจาก activity ไม่สำเร็จ')
    }
  }

  function focusRequestFromActivity(requestId: string) {
    setSearchQuery(requestId)
    setQuickView('all')
    setFilter('')
    setSortMode('newest')
    setViewPreset('manual')
    setMsg(`กรองรายการหลักเป็น request ${requestId}`)
  }

  function runSelectedRequestAction(intent: ReviewIntent) {
    if (!selectedRequest) return

    const draft = decisionCommentDraft.trim()

    if (intent === 'approve') {
      if (selectedRequest.status === 'pending_president') {
        void callAction(
          `/${selectedRequest.id}/president-approve`,
          { approved_by: 'ประธานรุ่น', comment: draft || undefined },
          'president-or-admin',
        )
        return
      }

      if (selectedRequest.status === 'pending_admin') {
        void callAction(
          `/${selectedRequest.id}/admin-approve`,
          { approved_by: 'Admin', comment: draft || undefined },
          'admin-only',
        )
        return
      }
    }

    if (intent === 'reject' && isPendingRequestStatus(selectedRequest.status)) {
      void callAction(
        `/${selectedRequest.id}/reject`,
        {
          rejected_by: selectedRequest.status === 'pending_president' ? 'ประธานรุ่น' : 'Admin',
          reason: draft || 'ปฏิเสธ',
          comment: draft || undefined,
        },
        'president-or-admin',
      )
      return
    }

    setMsg(`คำร้อง ${selectedRequest.id} ไม่อยู่ในสถานะที่ทำ ${intent} ได้`)
  }

  return (
    <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-violet-200/90">
        คำร้องสมาชิก (ประธานรุ่น → Admin)
      </h2>
      {pendingIncrease > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100">
          <p>
            มีคำร้องที่รอดำเนินการเพิ่มขึ้น {pendingIncrease} รายการ และตอนนี้มี pending รวม {pendingTotal} รายการ
          </p>
          <button
            type="button"
            onClick={() => setPendingIncrease(0)}
            className="rounded border border-amber-700 px-3 py-1 text-xs text-amber-100 hover:bg-amber-900/30"
          >
            ซ่อนแจ้งเตือน
          </button>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-amber-900/40 px-2 py-1 text-amber-200">
          pending รวม: {pendingTotal}
        </span>
        <span className="rounded bg-slate-900 px-2 py-1 text-slate-300">
          last updated: {lastLoadedAt ? new Date(lastLoadedAt).toLocaleString() : '-'}
        </span>
        <span
          className={`rounded px-2 py-1 ${
            autoRefresh ? 'bg-emerald-900/40 text-emerald-200' : 'bg-slate-900 text-slate-300'
          }`}
        >
          auto refresh: {autoRefresh ? 'on' : 'off'}
        </span>
        <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-200">
          ใหม่: {newRowIds.length}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Admin ดูรายการด้วย x-admin-key — ประธานรุ่นอนุมัติขั้นแรกได้ด้วย x-president-key (ตั้ง PRESIDENT_UPLOAD_KEY
        ใน backend) หรือให้ Admin ใช้ x-admin-key แทนได้
      </p>

      <label className="mt-4 block text-sm text-slate-300">
        x-admin-key (ดูรายการ + อนุมัติ Admin)
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-violet-600"
        />
      </label>

      <label className="mt-4 block text-sm text-slate-300">
        x-president-key (อนุมัติประธานรุ่น / ปฏิเสธ — ไม่บังคับถ้าใช้ admin แทน)
        <input
          type="password"
          autoComplete="off"
          value={presidentKey}
          onChange={(e) => setPresidentKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-700"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300">
          กรอง status
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="เช่น pending_president"
            className="mt-1 block w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-violet-600"
          />
        </label>
        <label className="text-sm text-slate-300">
          ค้นหาในคำร้อง
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="line_uid / รุ่น / ชื่อ / นามสกุล"
            className="mt-1 block w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          />
        </label>
        <label className="text-sm text-slate-300">
          Auto refresh ทุก
          <select
            value={String(autoRefreshMs)}
            onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          >
            <option value="10000">10 วินาที</option>
            <option value="30000">30 วินาที</option>
            <option value="60000">60 วินาที</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          เรียงลำดับ
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          >
            <option value="newest">ใหม่สุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="pending_first">pending ก่อน</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          เปิด auto refresh
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          โหลดรายการ
        </button>
        <button
          type="button"
          disabled={loading || (newRowIds.length === 0 && pendingIncrease === 0)}
          onClick={markAllAsSeen}
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/30 disabled:opacity-50"
        >
          mark all as seen
        </button>
        <button
          type="button"
          disabled={sortedRows.length === 0}
          onClick={exportCurrentViewCsv}
          className="rounded-lg border border-sky-800 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-950/30 disabled:opacity-50"
        >
          export current view
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="ทั้งหมด" value={summary.total} tone="slate" />
        <SummaryCard label="รอประธานรุ่น" value={summary.pending_president} tone="amber" />
        <SummaryCard label="รอ Admin" value={summary.pending_admin} tone="violet" />
        <SummaryCard label="อนุมัติแล้ว" value={summary.approved} tone="emerald" />
        <SummaryCard label="ถูกปฏิเสธ" value={summary.rejected} tone="red" />
        {summary.other > 0 ? <SummaryCard label="สถานะอื่น" value={summary.other} tone="slate" /> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-300">preset: {viewPreset}</span>
        <button
          type="button"
          onClick={() => applyPreset('pending_work')}
          className="rounded border border-amber-800 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
        >
          pending work
        </button>
        <button
          type="button"
          onClick={() => applyPreset('new_only')}
          className="rounded border border-emerald-800 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/30"
        >
          new only
        </button>
        <button
          type="button"
          onClick={() => applyPreset('approved_review')}
          className="rounded border border-violet-800 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/30"
        >
          approved review
        </button>
        <button
          type="button"
          onClick={saveCurrentAsManualPreset}
          className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          save current
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setQuickView('all')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'all'
              ? 'border-violet-700 bg-violet-900/40 text-violet-100'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          ทั้งหมดในรายการ
        </button>
        <button
          type="button"
          onClick={() => setQuickView('new')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'new'
              ? 'border-emerald-700 bg-emerald-900/40 text-emerald-100'
              : 'border-emerald-800 text-emerald-200 hover:bg-emerald-950/30'
          }`}
        >
          เฉพาะรายการใหม่ ({newRowIds.length})
        </button>
        <button
          type="button"
          onClick={() => setQuickView('pending')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'pending'
              ? 'border-amber-700 bg-amber-900/40 text-amber-100'
              : 'border-amber-800 text-amber-200 hover:bg-amber-950/30'
          }`}
        >
          เฉพาะ pending ({pendingTotal})
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          ดูทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending_president')}
          className="rounded border border-amber-800 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
        >
          รอประธานรุ่น
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending_admin')}
          className="rounded border border-violet-800 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/30"
        >
          รอ Admin
        </button>
        <button
          type="button"
          onClick={() => setFilter('approved')}
          className="rounded border border-emerald-800 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/30"
        >
          อนุมัติแล้ว
        </button>
        <button
          type="button"
          onClick={() => setFilter('rejected')}
          className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/30"
        >
          ถูกปฏิเสธ
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-200/80">Admin Activity Log</p>
            <p className="mt-1 text-xs text-slate-400">รวมเหตุการณ์ทุกคำร้องจาก action history เพื่อ review งานล่าสุดในจุดเดียว</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportActivityCsv}
              disabled={activityRows.length === 0}
              className="rounded border border-sky-800 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-950/30 disabled:opacity-50"
            >
              export csv
            </button>
            <button
              type="button"
              onClick={() => void copyActivitySummary()}
              className="rounded border border-cyan-800 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-950/30"
            >
              copy summary
            </button>
            <button
              type="button"
              onClick={() => void copyActivityRows()}
              className="rounded border border-violet-800 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/30"
            >
              copy rows
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-slate-900 px-2 py-1 text-slate-300">preset: {activityPreset}</span>
          <span className="rounded bg-slate-900 px-2 py-1 text-slate-300">ทั้งหมด: {activitySummary.all}</span>
          <span className="rounded bg-slate-900 px-2 py-1 text-slate-300">ส่งคำร้อง: {activitySummary.submitted}</span>
          <span className="rounded bg-amber-900/40 px-2 py-1 text-amber-200">ประธานรุ่นอนุมัติ: {activitySummary.president_approved}</span>
          <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-200">Admin อนุมัติ: {activitySummary.admin_approved}</span>
          <span className="rounded bg-red-900/40 px-2 py-1 text-red-200">ปฏิเสธ: {activitySummary.rejected}</span>
          <span className="rounded bg-red-950/60 px-2 py-1 text-red-100">critical: {activitySeveritySummary.critical}</span>
          <span className="rounded bg-amber-950/50 px-2 py-1 text-amber-100">warning: {activitySeveritySummary.warning}</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">info: {activitySeveritySummary.info}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyActivityPreset('rejected_recent')}
            className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/30"
          >
            rejected ล่าสุด
          </button>
          <button
            type="button"
            onClick={() => applyActivityPreset('pending_approvals')}
            className="rounded border border-amber-800 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
          >
            pending approvals
          </button>
          <button
            type="button"
            onClick={() => applyActivityPreset('today')}
            className="rounded border border-cyan-800 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-950/30"
          >
            วันนี้
          </button>
          <button
            type="button"
            onClick={saveCurrentAsManualActivityPreset}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            save current
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-300">
            กรอง activity
            <select
              value={activityActionFilter}
              onChange={(e) => setActivityActionFilter(e.target.value as ActivityFilter)}
              className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-600"
            >
              <option value="all">ทั้งหมด</option>
              <option value="submitted">ส่งคำร้อง</option>
              <option value="president_approved">ประธานรุ่นอนุมัติ</option>
              <option value="admin_approved">Admin อนุมัติ</option>
              <option value="rejected">ปฏิเสธ</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            ระดับความสำคัญ
            <select
              value={activitySeverityFilter}
              onChange={(e) => setActivitySeverityFilter(e.target.value as ActivitySeverityFilter)}
              className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-600"
            >
              <option value="all">ทั้งหมด</option>
              <option value="critical">critical</option>
              <option value="warning">warning</option>
              <option value="info">info</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            ค้นหาใน activity
            <input
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="request id / line uid / รุ่น / ชื่อ / comment"
              className="mt-1 block w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-600"
            />
          </label>
          <label className="text-sm text-slate-300">
            จำนวนที่แสดง
            <select
              value={String(activityLimit)}
              onChange={(e) => setActivityLimit(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-600"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {activityRows.map((entry, index) => (
            <div
              key={`${entry.requestId}-${entry.action}-${entry.at}-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => openRequestDetailFromActivity(entry.requestId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openRequestDetailFromActivity(entry.requestId)
                }
              }}
              className={`rounded-lg border p-3 ${
                entry.severity === 'critical'
                  ? 'border-red-700/60 bg-red-950/20 shadow-[0_0_0_1px_rgba(239,68,68,0.16)]'
                  : entry.severity === 'warning'
                    ? 'border-amber-700/50 bg-amber-950/15 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]'
                    : 'border-slate-800 bg-slate-950/50'
              } cursor-pointer outline-none transition hover:border-cyan-700/60 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-700/40`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${getActionHistoryTone(entry.action)}`}>
                    {getActionHistoryLabel(entry.action)}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${getActivitySeverityTone(entry.severity)}`}>
                    {entry.severity}
                  </span>
                  {entry.isToday ? (
                    <span className="rounded bg-cyan-900/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-200">
                      today
                    </span>
                  ) : null}
                  <span className="font-mono text-xs text-slate-500">{entry.requestId}</span>
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(entry.at)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {entry.fullName || '-'} | รุ่น {entry.batch || '-'} | line_uid {entry.lineUid || '-'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                โดย {entry.actor || '-'} | {entry.from_status ?? '-'} {'->'} {entry.to_status ?? '-'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isPendingRequestStatus(entry.currentStatus) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openRequestDetailFromActivity(entry.requestId, 'approve')
                    }}
                    className="rounded border border-emerald-800 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-950/30"
                  >
                    review approve
                  </button>
                ) : null}
                {isPendingRequestStatus(entry.currentStatus) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openRequestDetailFromActivity(entry.requestId, 'reject')
                    }}
                    className="rounded border border-red-800 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-950/30"
                  >
                    review reject
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void copyActivityValue('request id', entry.requestId)
                  }}
                  className="rounded border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  copy request id
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void copyActivityRowSummary(entry)
                  }}
                  className="rounded border border-sky-800 px-2.5 py-1 text-[11px] text-sky-200 hover:bg-sky-950/30"
                >
                  copy summary
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void copyActivityMemberIdentity(entry)
                  }}
                  className="rounded border border-emerald-800 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-950/30"
                >
                  copy member identity
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void copyActivityValue('line uid', entry.lineUid)
                  }}
                  className="rounded border border-violet-800 px-2.5 py-1 text-[11px] text-violet-200 hover:bg-violet-950/30"
                >
                  copy line uid
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    focusRequestFromActivity(entry.requestId)
                  }}
                  className="rounded border border-cyan-800 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-950/30"
                >
                  filter list to request
                </button>
              </div>
              {entry.comment ? <p className="mt-2 rounded bg-slate-900/80 p-2 text-sm text-slate-200">{entry.comment}</p> : null}
            </div>
          ))}
          {activityRows.length === 0 ? (
            <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-500">
              ยังไม่มี activity ที่ตรงกับ filter ปัจจุบัน
            </p>
          ) : null}
        </div>
      </section>

      <ul className="mt-6 space-y-4">
        {sortedRows.map((r) => (
          <li
            key={r.id}
            ref={(node) => {
              requestRowRefs.current[r.id] = node
            }}
            className={`rounded-lg border p-4 text-left text-sm ${
              highlightedRequestId === r.id
                ? 'border-cyan-500/70 bg-cyan-950/25 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]'
                : newRowIdSet.has(r.id)
                ? 'border-emerald-700/60 bg-emerald-950/20 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{r.id}</span>
                {highlightedRequestId === r.id ? (
                  <span className="rounded bg-cyan-900/50 px-2 py-0.5 text-xs text-cyan-200">เลือกจาก activity</span>
                ) : null}
                {newRowIdSet.has(r.id) ? (
                  <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">ใหม่</span>
                ) : null}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  r.status === 'approved'
                    ? 'bg-emerald-900/50 text-emerald-200'
                    : r.status === 'rejected'
                      ? 'bg-red-900/40 text-red-200'
                      : 'bg-amber-900/40 text-amber-200'
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500">line_uid:</span>{' '}
              <span className="break-all font-mono text-violet-200">{r.line_uid ?? '—'}</span>
            </p>
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900/80 p-2 text-xs text-slate-400">
              {JSON.stringify(r.requested_data, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(r)}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                ดูรายละเอียด
              </button>
              {r.status === 'pending_president' && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/president-approve`,
                        { approved_by: 'ประธานรุ่น', comment: decisionCommentDraft.trim() || undefined },
                        'president-or-admin',
                      )
                    }
                    className="rounded bg-amber-800 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
                  >
                    อนุมัติ (ประธานรุ่น)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/reject`,
                        {
                          rejected_by: 'ประธานรุ่น',
                          reason: decisionCommentDraft.trim() || 'ปฏิเสธ',
                          comment: decisionCommentDraft.trim() || undefined,
                        },
                        'president-or-admin',
                      )
                    }
                    className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
              {r.status === 'pending_admin' && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/admin-approve`,
                        { approved_by: 'Admin', comment: decisionCommentDraft.trim() || undefined },
                        'admin-only',
                      )
                    }
                    className="rounded bg-emerald-800 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                  >
                    อนุมัติ (Admin)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/reject`,
                        {
                          rejected_by: 'Admin',
                          reason: decisionCommentDraft.trim() || 'ปฏิเสธ',
                          comment: decisionCommentDraft.trim() || undefined,
                        },
                        'president-or-admin',
                      )
                    }
                    className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {sortedRows.length === 0 && !loading && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {rows.length === 0
            ? 'ไม่มีรายการ (หรือยังไม่ได้กดโหลด)'
            : 'ไม่มีรายการที่ตรงกับ quick filter หรือคำค้นปัจจุบัน'}
        </p>
      )}

      {selectedRequest ? (
        <section ref={detailSectionRef} className="mt-6 rounded-xl border border-sky-900/40 bg-sky-950/20 p-5 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-200/80">Request Detail</p>
              <p className="mt-1 font-mono text-xs text-slate-400">{selectedRequest.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyRequestSummary()}
                className="rounded border border-sky-800 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-950/30"
              >
                copy summary
              </button>
              <button
                type="button"
                onClick={() => void copyRequestDetails()}
                className="rounded border border-violet-800 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/30"
              >
                copy request details
              </button>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                ปิดรายละเอียด
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailField label="สถานะ" value={selectedRequest.status} />
            <DetailField label="ประเภทคำร้อง" value={selectedRequest.request_type} />
            <DetailField label="Line UID" value={selectedRequest.line_uid ?? '-'} />
            <DetailField label="ส่งเมื่อ" value={formatDateTime(selectedRequest.created_at)} />
            <DetailField
              label="อนุมัติประธานรุ่น"
              value={selectedRequest.president_approved_at ? formatDateTime(selectedRequest.president_approved_at) : '-'}
            />
            <DetailField
              label="อนุมัติ Admin"
              value={selectedRequest.admin_approved_at ? formatDateTime(selectedRequest.admin_approved_at) : '-'}
            />
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Requested Data</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {getRequestedDataEntries(selectedRequest).map(([key, value]) => (
                <DetailField key={key} label={key} value={value} />
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">Reject Reason Templates</p>
            {reviewIntent ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-900/40 bg-sky-950/30 p-3">
                <p className="text-xs text-sky-100">
                  review mode: {reviewIntent === 'approve' ? 'approve' : 'reject'}{' '}
                  {reviewIntent === 'approve'
                    ? '(draft พร้อมสำหรับการอนุมัติ)'
                    : '(draft พร้อมสำหรับการปฏิเสธ/ขอข้อมูลเพิ่ม)'}
                </p>
                <button
                  type="button"
                  onClick={() => setReviewIntent(null)}
                  className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  clear review mode
                </button>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {REJECT_REASON_TEMPLATES.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => applyRejectReasonTemplate(reason)}
                  className="rounded border border-amber-800 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
                  title={reason}
                >
                  {reason}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm text-slate-300">
              หมายเหตุประกอบการอนุมัติ/ปฏิเสธ
              <textarea
                value={decisionCommentDraft}
                onChange={(e) => setDecisionCommentDraft(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-700"
                placeholder="ใช้เป็น comment ตอน approve หรือใช้เป็นเหตุผลตอน reject"
              />
            </label>
            {isPendingRequestStatus(selectedRequest.status) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {reviewIntent === 'approve' ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runSelectedRequestAction('approve')}
                    className={`rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                      selectedRequest.status === 'pending_president' ? 'bg-amber-800 hover:bg-amber-700' : 'bg-emerald-800 hover:bg-emerald-700'
                    }`}
                  >
                    {selectedRequest.status === 'pending_president' ? 'approve with draft (president)' : 'approve with draft (admin)'}
                  </button>
                ) : null}
                {reviewIntent === 'reject' ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runSelectedRequestAction('reject')}
                    className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950/30 disabled:opacity-50"
                  >
                    reject with draft
                  </button>
                ) : null}
                {!reviewIntent ? (
                  <>
                    {selectedRequest.status === 'pending_president' ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => runSelectedRequestAction('approve')}
                        className="rounded bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        อนุมัติ (ประธานรุ่น)
                      </button>
                    ) : null}
                    {selectedRequest.status === 'pending_admin' ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => runSelectedRequestAction('approve')}
                        className="rounded bg-emerald-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        อนุมัติ (Admin)
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => runSelectedRequestAction('reject')}
                      className="rounded border border-red-800 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950/30 disabled:opacity-50"
                    >
                      ปฏิเสธ
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Action History</p>
            <div className="mt-3 space-y-3">
              {getActionHistoryEntries(selectedRequest).map((entry, index) => (
                <div key={`${entry.action}-${entry.at}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-100">{getActionHistoryLabel(entry.action)}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(entry.at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    โดย {entry.actor || '-'} | {entry.from_status ?? '-'} {'->'} {entry.to_status ?? '-'}
                  </p>
                  {entry.comment ? <p className="mt-2 rounded bg-slate-900/80 p-2 text-sm text-slate-200">{entry.comment}</p> : null}
                </div>
              ))}
              {getActionHistoryEntries(selectedRequest).length === 0 ? (
                <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-500">
                  ยังไม่มีประวัติการดำเนินการ
                </p>
              ) : null}
            </div>
          </div>

          <details className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-300">
              JSON ดิบ
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-900/80 p-3 text-xs text-slate-400">
              {JSON.stringify(selectedRequest.requested_data, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}

      {msg && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      )}
    </section>
  )
}

function buildRequestSearchText(row: RequestRow): string {
  const requested = row.requested_data ?? {}
  const rawParts = [
    row.id,
    row.line_uid ?? '',
    row.status,
    row.request_type,
    pickRequestedText(requested, 'batch'),
    pickRequestedText(requested, 'first_name'),
    pickRequestedText(requested, 'last_name'),
    JSON.stringify(requested),
  ]

  return rawParts.join(' ').toLowerCase()
}

function getCreatedAtMs(row: RequestRow): number {
  const time = Date.parse(row.created_at)
  return Number.isFinite(time) ? time : 0
}

function getPendingPriority(status: string): number {
  if (status === 'pending_president') return 0
  if (status === 'pending_admin') return 1
  return 2
}

function pickRequestedText(requested: Record<string, unknown>, key: string): string {
  const value = requested[key]
  return typeof value === 'string' ? value : ''
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function getRequestedDataEntries(row: RequestRow): Array<[string, string]> {
  return Object.entries(row.requested_data ?? {})
    .map(([key, value]) => [key, formatUnknownValue(value)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
}

function buildRequestSummaryText(row: RequestRow): string {
  return [
    `requestId: ${row.id}`,
    `status: ${row.status}`,
    `type: ${row.request_type}`,
    `line_uid: ${row.line_uid ?? '-'}`,
    `batch: ${pickRequestedText(row.requested_data, 'batch') || '-'}`,
    `name: ${[pickRequestedText(row.requested_data, 'first_name'), pickRequestedText(row.requested_data, 'last_name')].filter(Boolean).join(' ') || '-'}`,
    `created_at: ${formatDateTime(row.created_at)}`,
  ].join('\n')
}

function buildRequestDetailText(row: RequestRow): string {
  const detailLines = [
    buildRequestSummaryText(row),
    `president_approved_at: ${row.president_approved_at ? formatDateTime(row.president_approved_at) : '-'}`,
    `admin_approved_at: ${row.admin_approved_at ? formatDateTime(row.admin_approved_at) : '-'}`,
    '',
    'requested_data:',
    ...getRequestedDataEntries(row).map(([key, value]) => `- ${key}: ${value}`),
  ]

  return detailLines.join('\n')
}

function formatUnknownValue(value: unknown): string {
  if (value == null) return '-'
  if (typeof value === 'string') return value || '-'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function formatDateTime(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return value
  return new Date(time).toLocaleString()
}

function getActionHistoryEntries(row: RequestRow): ActionHistoryEntry[] {
  const parsed = parseActionHistory(row.action_history)
  if (parsed.length > 0) return parsed

  const fallback: ActionHistoryEntry[] = [
    {
      action: 'submitted',
      actor: 'member',
      at: row.created_at,
      comment: null,
      from_status: null,
      to_status: 'pending_president',
    },
  ]

  if (row.president_approved_at) {
    fallback.push({
      action: 'president_approved',
      actor: row.president_approved_by ?? 'president',
      at: row.president_approved_at,
      comment: null,
      from_status: 'pending_president',
      to_status: 'pending_admin',
    })
  }

  if (row.admin_approved_at) {
    fallback.push({
      action: 'admin_approved',
      actor: row.admin_approved_by ?? 'admin',
      at: row.admin_approved_at,
      comment: null,
      from_status: 'pending_admin',
      to_status: 'approved',
    })
  }

  if (row.rejected_at) {
    fallback.push({
      action: 'rejected',
      actor: row.rejected_by ?? 'admin',
      at: row.rejected_at,
      comment: row.rejection_reason ?? null,
      from_status: row.president_approved_at ? 'pending_admin' : 'pending_president',
      to_status: 'rejected',
    })
  }

  return fallback
}

function parseActionHistory(raw: unknown): ActionHistoryEntry[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const row = entry as Record<string, unknown>
    if (
      !isActionHistoryAction(row.action) ||
      typeof row.actor !== 'string' ||
      typeof row.at !== 'string'
    ) {
      return []
    }

    return [
      {
        action: row.action,
        actor: row.actor,
        at: row.at,
        comment: typeof row.comment === 'string' && row.comment.trim() ? row.comment.trim() : null,
        from_status: typeof row.from_status === 'string' ? row.from_status : null,
        to_status: typeof row.to_status === 'string' ? row.to_status : null,
      },
    ]
  })
}

function isActionHistoryAction(value: unknown): value is ActionHistoryEntry['action'] {
  return (
    value === 'submitted' ||
    value === 'president_approved' ||
    value === 'admin_approved' ||
    value === 'rejected'
  )
}

function getActionHistoryLabel(action: ActionHistoryEntry['action']): string {
  if (action === 'submitted') return 'ส่งคำร้อง'
  if (action === 'president_approved') return 'ประธานรุ่นอนุมัติ'
  if (action === 'admin_approved') return 'Admin อนุมัติ'
  return 'ปฏิเสธคำร้อง'
}

function getActionHistoryTone(action: ActionHistoryEntry['action']): string {
  if (action === 'submitted') return 'bg-slate-900 text-slate-200'
  if (action === 'president_approved') return 'bg-amber-900/40 text-amber-200'
  if (action === 'admin_approved') return 'bg-emerald-900/40 text-emerald-200'
  return 'bg-red-900/40 text-red-200'
}

function getActivitySeverity(entry: ActionHistoryEntry): ActivitySeverityFilter {
  if (entry.action === 'rejected') return 'critical'
  if (entry.to_status === 'pending_admin' || entry.to_status === 'pending_president') return 'warning'
  return 'info'
}

function getActivitySeverityTone(severity: ActivitySeverityFilter): string {
  if (severity === 'critical') return 'bg-red-950/70 text-red-100'
  if (severity === 'warning') return 'bg-amber-950/60 text-amber-100'
  return 'bg-slate-800 text-slate-200'
}

function getActivityAtMs(entry: RequestActivityRow): number {
  const time = Date.parse(entry.at)
  return Number.isFinite(time) ? time : 0
}

function isSameLocalDay(value: string, compareDate: Date): boolean {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return false

  const date = new Date(time)
  return (
    date.getFullYear() === compareDate.getFullYear() &&
    date.getMonth() === compareDate.getMonth() &&
    date.getDate() === compareDate.getDate()
  )
}

function buildActivitySearchText(entry: RequestActivityRow): string {
  return [
    entry.requestId,
    entry.lineUid,
    entry.batch,
    entry.fullName,
    entry.actor,
    entry.action,
    entry.comment ?? '',
    entry.from_status ?? '',
    entry.to_status ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

function buildActivityRowText(entry: RequestActivityRow): string {
  return [
    `requestId: ${entry.requestId}`,
    `action: ${entry.action}`,
    `label: ${getActionHistoryLabel(entry.action)}`,
    `actor: ${entry.actor || '-'}`,
    `at: ${formatDateTime(entry.at)}`,
    `line_uid: ${entry.lineUid || '-'}`,
    `batch: ${entry.batch || '-'}`,
    `name: ${entry.fullName || '-'}`,
    `status_flow: ${entry.from_status ?? '-'} -> ${entry.to_status ?? '-'}`,
    `comment: ${entry.comment ?? '-'}`,
  ].join('\n')
}

function buildActivityIdentityText(entry: RequestActivityRow): string {
  return [
    `requestId: ${entry.requestId}`,
    `line_uid: ${entry.lineUid || '-'}`,
    `batch: ${entry.batch || '-'}`,
    `name: ${entry.fullName || '-'}`,
  ].join('\n')
}

function isPendingRequestStatus(status: string): boolean {
  return status === 'pending_president' || status === 'pending_admin'
}

function buildSuggestedReviewComment(row: RequestRow, intent: ReviewIntent): string {
  const identity = buildRequestIdentityLabel(row)
  if (intent === 'reject') {
    return `${REJECT_REASON_TEMPLATES[0]}${identity ? ` (${identity})` : ''}`
  }

  if (row.status === 'pending_president') {
    return `ตรวจสอบข้อมูลสมาชิก${identity ? ` ${identity}` : ''} แล้ว พร้อมอนุมัติขั้นประธานรุ่น`
  }

  return `ตรวจสอบข้อมูลสมาชิก${identity ? ` ${identity}` : ''} แล้ว พร้อมอนุมัติขั้น Admin`
}

function buildRequestIdentityLabel(row: RequestRow): string {
  const batch = pickRequestedText(row.requested_data, 'batch')
  const fullName = [pickRequestedText(row.requested_data, 'first_name'), pickRequestedText(row.requested_data, 'last_name')]
    .filter(Boolean)
    .join(' ')

  return [fullName, batch ? `รุ่น ${batch}` : ''].filter(Boolean).join(' | ')
}

function buildActionFeedbackMessage(
  path: string,
  body: Record<string, string | undefined>,
  ok: boolean,
  response: Record<string, unknown>,
): string {
  const requestId = extractRequestIdFromActionPath(path)
  const actionLabel = getActionLabelFromPath(path)
  const actor = body.approved_by || body.rejected_by || 'system'
  const reason = body.reason || body.comment || ''
  const errorText = typeof response.error === 'string' ? response.error.trim() : ''
  const details = JSON.stringify(response, null, 2)

  const summaryParts = [
    ok ? 'สำเร็จ' : 'ไม่สำเร็จ',
    actionLabel,
    requestId ? `คำร้อง ${requestId}` : '',
    actor ? `โดย ${actor}` : '',
  ].filter(Boolean)

  const lines = [summaryParts.join(' ')]

  if (reason.trim()) {
    lines.push(`หมายเหตุ: ${reason.trim()}`)
  }

  if (!ok && errorText) {
    lines.push(`สาเหตุ: ${errorText}`)
  }

  if (details && details !== '{}') {
    lines.push('', details)
  }

  return lines.join('\n')
}

function extractRequestIdFromActionPath(path: string): string {
  const match = path.match(/^\/([^/]+)\//)
  return match?.[1] ?? ''
}

function getActionLabelFromPath(path: string): string {
  if (path.endsWith('/president-approve')) return 'อนุมัติขั้นประธานรุ่น'
  if (path.endsWith('/admin-approve')) return 'อนุมัติขั้น Admin'
  if (path.endsWith('/reject')) return 'ปฏิเสธคำร้อง'
  return 'ดำเนินการคำร้อง'
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-slate-100">{value}</p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'slate' | 'amber' | 'violet' | 'emerald' | 'red'
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-900/40 bg-amber-950/20 text-amber-100'
      : tone === 'violet'
        ? 'border-violet-900/40 bg-violet-950/20 text-violet-100'
        : tone === 'emerald'
          ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-100'
          : tone === 'red'
            ? 'border-red-900/40 bg-red-950/20 text-red-100'
            : 'border-slate-800 bg-slate-950/50 text-slate-100'

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
