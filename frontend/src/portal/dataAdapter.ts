import { useCallback, useEffect, useRef, useState } from 'react'
import { portalSnapshotPath } from './portalLabels'
import {
  academyClasses,
  academyEnrollmentFunnel,
  academyMetricCards,
  academyRoleCards,
  committeeAttendanceRowsMock,
  committeeAttendanceSessionMock,
  committeeMemberDirectoryPreviewMock,
  committeeAssociationPlMock,
  committeeCramSchoolPlMock,
  committeeMeetings,
  committeeMetricCards,
  committeeOpenAgendasMock,
  committeeMeetingDocumentsMock,
  committeeMeetingMinutesMock,
  committeeMeetingOverviewMock,
  committeeClosedAgendaResultsMock,
  committeeRequestTrend,
  committeeRoleCards,
  memberBatchDistribution,
  memberDonationCampaigns,
  memberFinanceCards,
  memberMeetingReports,
  memberRequestTrendMock,
  memberStatsCards,
  academyCramClassRoster,
  academySchoolCourses,
  type AcademyClassItem,
  type AcademyCramClassRoster,
  type AcademySchoolCourseItem,
  type CommitteeMeetingDocumentItem,
  type CommitteeMeetingMinutesItem,
  type CommitteeMeetingOverview,
  type CommitteeClosedAgendaResultItem,
  type DonationCampaign,
  type MeetingItem,
  type MeetingReportItem,
  type MetricItem,
  type TrendItem,
} from './mockData'

export type MemberRoleView = 'member' | 'staff'
export type CommitteeRoleView = 'chair' | 'member'
export type AcademyRoleView = 'admin' | 'teacher' | 'student' | 'parent'
export type PortalDataSource = 'api' | 'mock'

export type YupparajDonationActivityItem = {
  id: string
  title: string
  category: string
  description: string | null
  fundScope: 'yupparaj_school'
  targetAmount: number | null
  raisedAmount: number
}

export type MemberPortalData = {
  statsCards: MetricItem[]
  roleCards: Record<MemberRoleView, MetricItem[]>
  batchDistribution: TrendItem[]
  donationCampaigns: DonationCampaign[]
  /** กิจกรรมโรงเรียนยุพราช — บริจาคไม่นับเป็นรายรับสมาคม/กวดวิชา */
  yupparajDonationActivities: YupparajDonationActivityItem[]
  financeCards: MetricItem[]
  meetingReports: MeetingReportItem[]
  /** คำร้องใหม่ต่อวัน (UTC) 7 วัน — จาก member_update_requests */
  requestTrend: TrendItem[]
}

export type CommitteeAttendanceSession = {
  id: string
  title: string
  scheduledAt: string | null
  expectedParticipants: number
  quorumNumerator: number
  quorumDenominator: number
  /** 2/3 ของกรรมการเต็มชุด (35) — ปกติ 24 */
  quorumRequiredCount: number
  rsvpYes: number
  rsvpNo: number
  rsvpMaybe: number
  status: string
  signedCount: number
}

export type CommitteeAttendanceRow = {
  attendeeName: string
  attendeeRoleCode: string
  signedVia: string
  signedAt: string
}

export type CommitteeOpenAgenda = {
  id: string
  title: string
  scope: string
  status: string
}

export type CommitteeMemberPreviewRow = {
  id: string
  firstName: string
  lastName: string
  batch: string | null
  membershipStatus: string
}

export type CommitteeMonthlyPl = {
  revenue: number
  expense: number
  netIncome: number
}

export type CommitteePortalData = {
  metricCards: MetricItem[]
  roleCards: Record<CommitteeRoleView, MetricItem[]>
  requestTrend: TrendItem[]
  meetings: MeetingItem[]
  /** รอบประชุมล่าสุด — null ถ้าไม่มีข้อมูล */
  attendanceSession: CommitteeAttendanceSession | null
  attendanceRows: CommitteeAttendanceRow[]
  /** วาระเปิดลงมติ */
  openAgendas: CommitteeOpenAgenda[]
  /** สัดส่วนสมาชิกตามรุ่น (snapshot) */
  memberBatchDistribution: TrendItem[]
  /** รายชื่ออัปเดตล่าสุด (ไม่เกิน 40 คน) */
  memberDirectoryPreview: CommitteeMemberPreviewRow[]
  /** P/L เดือนปัจจุบัน — นิติบุคคลสมาคม */
  associationMonthlyPl: CommitteeMonthlyPl | null
  /** P/L เดือนปัจจุบัน — โรงเรียนกวดวิชา */
  cramSchoolMonthlyPl: CommitteeMonthlyPl | null
  /** คำขอจ่ายที่รออนุมัติ */
  paymentRequestsPending: number
  /** เอกสารประชุมล่าสุด (meeting_documents) */
  meetingDocuments: CommitteeMeetingDocumentItem[]
  /** รายงานการประชุมล่าสุด (meeting_sessions.minutes_*) */
  recentMinutes: CommitteeMeetingMinutesItem[]
  /** สรุปสถานะงานประชุม */
  meetingOverview: CommitteeMeetingOverview
  /** ผลมติวาระที่ปิดแล้วล่าสุด */
  closedAgendaResults: CommitteeClosedAgendaResultItem[]
}

export type AcademyPortalData = {
  metricCards: MetricItem[]
  roleCards: Record<AcademyRoleView, MetricItem[]>
  classes: AcademyClassItem[]
  enrollmentFunnel: TrendItem[]
  /** P/L เดือนนี้จาก journal นิติบุคคล cram_school — null ถ้ายังไม่มีรายการ */
  cramSchoolMonthlyPl: { revenue: number; expense: number; netIncome: number } | null
  /** รายชื่อนักเรียนตามห้อง (cram_students) — [] ถ้าไม่มี */
  cramClassRoster: AcademyCramClassRoster[]
  /** คอร์ส/กิจกรรมที่เปิด (school_activities) — [] ถ้าไม่มี */
  schoolCourses: AcademySchoolCourseItem[]
}

export type PortalDataState<TData> = {
  data: TData
  source: PortalDataSource
  loading: boolean
  /** โหลด snapshot จาก API อีกครั้ง (แสดง loading ระหว่างดึง) */
  refetch: () => Promise<void>
}

type PortalSnapshotSlice<TData> = Omit<PortalDataState<TData>, 'refetch'>

const memberPortalMockData: MemberPortalData = {
  statsCards: memberStatsCards,
  roleCards: {
    member: [
      { label: 'กิจกรรมที่สมัคร', value: '3', hint: 'กิจกรรมที่กำลังเข้าร่วมอยู่' },
      { label: 'การแจ้งเตือนใหม่', value: '5', hint: 'ยังไม่ได้อ่านในรอบ 7 วัน' },
    ],
    staff: [
      { label: 'คำร้องต้องติดตาม', value: '14', hint: 'รายการที่ต้องประสานงานเพิ่ม' },
      { label: 'เอกสารรอตรวจ', value: '9', hint: 'เอกสารรายงานที่ยังไม่สมบูรณ์' },
    ],
  },
  batchDistribution: memberBatchDistribution,
  donationCampaigns: memberDonationCampaigns,
  yupparajDonationActivities: [
    {
      id: 'mock-yup-1',
      title: 'ทุนอาหารกลางวัน',
      category: 'สวัสดิการนักเรียน',
      description: 'ตัวอย่าง — เชื่อมต่อ API จะโหลดจากฐานข้อมูล',
      fundScope: 'yupparaj_school',
      targetAmount: 200000,
      raisedAmount: 85000,
    },
  ],
  financeCards: memberFinanceCards,
  meetingReports: memberMeetingReports,
  requestTrend: memberRequestTrendMock,
}

const committeePortalMockData: CommitteePortalData = {
  metricCards: committeeMetricCards,
  roleCards: committeeRoleCards,
  requestTrend: committeeRequestTrend,
  meetings: committeeMeetings,
  attendanceSession: committeeAttendanceSessionMock,
  attendanceRows: committeeAttendanceRowsMock,
  openAgendas: committeeOpenAgendasMock,
  memberBatchDistribution: memberBatchDistribution,
  memberDirectoryPreview: committeeMemberDirectoryPreviewMock,
  associationMonthlyPl: committeeAssociationPlMock,
  cramSchoolMonthlyPl: committeeCramSchoolPlMock,
  paymentRequestsPending: 3,
  meetingDocuments: committeeMeetingDocumentsMock,
  recentMinutes: committeeMeetingMinutesMock,
  meetingOverview: committeeMeetingOverviewMock,
  closedAgendaResults: committeeClosedAgendaResultsMock,
}

const academyPortalMockData: AcademyPortalData = {
  metricCards: academyMetricCards,
  roleCards: academyRoleCards,
  classes: academyClasses,
  enrollmentFunnel: academyEnrollmentFunnel,
  cramSchoolMonthlyPl: null,
  cramClassRoster: academyCramClassRoster,
  schoolCourses: academySchoolCourses,
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isAbortError(e: unknown): boolean {
  return (e instanceof DOMException && e.name === 'AbortError') || (e instanceof Error && e.name === 'AbortError')
}

export function normalizeMemberPortalData(raw: unknown, fallback: MemberPortalData): MemberPortalData {
  if (!isRecord(raw)) return fallback

  const rc = raw.roleCards
  const roleCards =
    isRecord(rc) && Array.isArray(rc.member) && Array.isArray(rc.staff)
      ? (rc as MemberPortalData['roleCards'])
      : fallback.roleCards

  return {
    statsCards: Array.isArray(raw.statsCards) ? (raw.statsCards as MemberPortalData['statsCards']) : fallback.statsCards,
    roleCards,
    batchDistribution: Array.isArray(raw.batchDistribution)
      ? (raw.batchDistribution as MemberPortalData['batchDistribution'])
      : fallback.batchDistribution,
    donationCampaigns: Array.isArray(raw.donationCampaigns)
      ? (raw.donationCampaigns as MemberPortalData['donationCampaigns'])
      : fallback.donationCampaigns,
    yupparajDonationActivities: Array.isArray(raw.yupparajDonationActivities)
      ? (raw.yupparajDonationActivities as MemberPortalData['yupparajDonationActivities'])
      : fallback.yupparajDonationActivities,
    financeCards: Array.isArray(raw.financeCards) ? (raw.financeCards as MemberPortalData['financeCards']) : fallback.financeCards,
    meetingReports: Array.isArray(raw.meetingReports)
      ? (raw.meetingReports as MemberPortalData['meetingReports'])
      : fallback.meetingReports,
    requestTrend: Array.isArray(raw.requestTrend) ? (raw.requestTrend as MemberPortalData['requestTrend']) : fallback.requestTrend,
  }
}

/** รวมฟิลด์ที่ขาดเมื่อ API เก่าหรือ response ไม่ครบ — ลดความเสี่ยง UI พัง */
export function normalizeCommitteePortalData(raw: unknown, fallback: CommitteePortalData): CommitteePortalData {
  if (!isRecord(raw)) return fallback

  const meetings = Array.isArray(raw.meetings) ? (raw.meetings as CommitteePortalData['meetings']) : fallback.meetings

  let attendanceSession: CommitteePortalData['attendanceSession']
  const as = raw.attendanceSession
  if (as === null) {
    attendanceSession = null
  } else if (
    isRecord(as) &&
    typeof as.id === 'string' &&
    typeof as.title === 'string' &&
    (as.scheduledAt === null || typeof as.scheduledAt === 'string') &&
    typeof as.expectedParticipants === 'number' &&
    typeof as.quorumNumerator === 'number' &&
    typeof as.quorumDenominator === 'number' &&
    typeof as.status === 'string' &&
    typeof as.signedCount === 'number'
  ) {
    const scheduledAt = as.scheduledAt === null ? null : (as.scheduledAt as string)
    const qrc = typeof as.quorumRequiredCount === 'number' ? (as.quorumRequiredCount as number) : 24
    const rsvpY = typeof as.rsvpYes === 'number' ? (as.rsvpYes as number) : 0
    const rsvpN = typeof as.rsvpNo === 'number' ? (as.rsvpNo as number) : 0
    const rsvpM = typeof as.rsvpMaybe === 'number' ? (as.rsvpMaybe as number) : 0
    attendanceSession = {
      id: as.id as string,
      title: as.title as string,
      scheduledAt,
      expectedParticipants: as.expectedParticipants as number,
      quorumNumerator: as.quorumNumerator as number,
      quorumDenominator: as.quorumDenominator as number,
      quorumRequiredCount: qrc,
      rsvpYes: rsvpY,
      rsvpNo: rsvpN,
      rsvpMaybe: rsvpM,
      status: as.status as string,
      signedCount: as.signedCount as number,
    }
  } else {
    attendanceSession = fallback.attendanceSession
  }

  const attendanceRows = Array.isArray(raw.attendanceRows)
    ? (raw.attendanceRows as CommitteePortalData['attendanceRows'])
    : fallback.attendanceRows

  const openAgendas = Array.isArray(raw.openAgendas)
    ? (raw.openAgendas as CommitteePortalData['openAgendas'])
    : fallback.openAgendas

  const memberBatchDistribution = Array.isArray(raw.memberBatchDistribution)
    ? (raw.memberBatchDistribution as CommitteePortalData['memberBatchDistribution'])
    : fallback.memberBatchDistribution

  const memberDirectoryPreview = Array.isArray(raw.memberDirectoryPreview)
    ? (raw.memberDirectoryPreview as CommitteePortalData['memberDirectoryPreview'])
    : fallback.memberDirectoryPreview

  const parsePl = (key: 'associationMonthlyPl' | 'cramSchoolMonthlyPl'): CommitteeMonthlyPl | null => {
    if (!(key in raw)) return fallback[key]
    const v = raw[key]
    if (v === null) return null
    if (
      isRecord(v) &&
      typeof v.revenue === 'number' &&
      typeof v.expense === 'number' &&
      typeof v.netIncome === 'number'
    ) {
      return { revenue: v.revenue, expense: v.expense, netIncome: v.netIncome }
    }
    return fallback[key]
  }

  const associationMonthlyPl = parsePl('associationMonthlyPl')
  const cramSchoolMonthlyPl = parsePl('cramSchoolMonthlyPl')

  const paymentRequestsPending =
    typeof raw.paymentRequestsPending === 'number' ? raw.paymentRequestsPending : fallback.paymentRequestsPending
  const meetingDocuments = Array.isArray(raw.meetingDocuments)
    ? (raw.meetingDocuments as CommitteePortalData['meetingDocuments'])
    : fallback.meetingDocuments
  const recentMinutes = Array.isArray(raw.recentMinutes)
    ? (raw.recentMinutes as CommitteePortalData['recentMinutes'])
    : fallback.recentMinutes
  const meetingOverview =
    isRecord(raw.meetingOverview) &&
    typeof raw.meetingOverview.openAgendaCount === 'number' &&
    typeof raw.meetingOverview.closedAgendaCount === 'number' &&
    typeof raw.meetingOverview.publishedDocumentCount === 'number' &&
    typeof raw.meetingOverview.minutesPublishedCount === 'number'
      ? (raw.meetingOverview as CommitteePortalData['meetingOverview'])
      : fallback.meetingOverview
  const closedAgendaResults = Array.isArray(raw.closedAgendaResults)
    ? (raw.closedAgendaResults as CommitteePortalData['closedAgendaResults'])
    : fallback.closedAgendaResults

  return {
    metricCards: Array.isArray(raw.metricCards) ? (raw.metricCards as CommitteePortalData['metricCards']) : fallback.metricCards,
    roleCards: isRecord(raw.roleCards) ? (raw.roleCards as CommitteePortalData['roleCards']) : fallback.roleCards,
    requestTrend: Array.isArray(raw.requestTrend) ? (raw.requestTrend as CommitteePortalData['requestTrend']) : fallback.requestTrend,
    meetings,
    attendanceSession,
    attendanceRows,
    openAgendas,
    memberBatchDistribution,
    memberDirectoryPreview,
    associationMonthlyPl,
    cramSchoolMonthlyPl,
    paymentRequestsPending,
    meetingDocuments,
    recentMinutes,
    meetingOverview,
    closedAgendaResults,
  }
}

export function normalizeAcademyPortalData(raw: unknown, fallback: AcademyPortalData): AcademyPortalData {
  if (!isRecord(raw)) return fallback

  const pl = raw.cramSchoolMonthlyPl
  let cramSchoolMonthlyPl: AcademyPortalData['cramSchoolMonthlyPl']
  if (pl === null) {
    cramSchoolMonthlyPl = null
  } else if (
    isRecord(pl) &&
    typeof pl.revenue === 'number' &&
    typeof pl.expense === 'number' &&
    typeof pl.netIncome === 'number'
  ) {
    cramSchoolMonthlyPl = { revenue: pl.revenue, expense: pl.expense, netIncome: pl.netIncome }
  } else {
    cramSchoolMonthlyPl = fallback.cramSchoolMonthlyPl
  }

  return {
    metricCards: Array.isArray(raw.metricCards) ? (raw.metricCards as AcademyPortalData['metricCards']) : fallback.metricCards,
    roleCards: isRecord(raw.roleCards) ? (raw.roleCards as AcademyPortalData['roleCards']) : fallback.roleCards,
    classes: Array.isArray(raw.classes) ? (raw.classes as AcademyPortalData['classes']) : fallback.classes,
    enrollmentFunnel: Array.isArray(raw.enrollmentFunnel)
      ? (raw.enrollmentFunnel as AcademyPortalData['enrollmentFunnel'])
      : fallback.enrollmentFunnel,
    cramSchoolMonthlyPl,
    cramClassRoster: Array.isArray(raw.cramClassRoster)
      ? (raw.cramClassRoster as AcademyPortalData['cramClassRoster'])
      : fallback.cramClassRoster,
    schoolCourses: Array.isArray(raw.schoolCourses)
      ? (raw.schoolCourses as AcademyPortalData['schoolCourses'])
      : fallback.schoolCourses,
  }
}

async function loadPortalData<TData>(params: {
  apiBase: string
  endpoint: string
  fallback: TData
  normalize?: (raw: unknown, fallback: TData) => TData
  signal?: AbortSignal
}): Promise<{ data: TData; source: PortalDataSource }> {
  try {
    const res = await fetch(`${params.apiBase}${params.endpoint}`, { signal: params.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body: unknown = await res.json()
    const unwrapped =
      isRecord(body) && 'data' in body && body.data !== undefined ? (body as { data: unknown }).data : body
    const data = params.normalize ? params.normalize(unwrapped, params.fallback) : (unwrapped as TData)
    return { data, source: 'api' }
  } catch (e: unknown) {
    if (isAbortError(e)) throw e
    return { data: params.fallback, source: 'mock' }
  }
}

function usePortalData<TData>(
  apiBase: string,
  endpoint: string,
  fallback: TData,
  normalize?: (raw: unknown, fallback: TData) => TData,
): PortalDataState<TData> {
  const [state, setState] = useState<PortalSnapshotSlice<TData>>({
    data: fallback,
    source: 'mock',
    loading: true,
  })

  const loadGenRef = useRef(0)
  const inFlightRef = useRef<AbortController | null>(null)

  const runLoad = useCallback(
    async (signal?: AbortSignal) => {
      return loadPortalData({ apiBase, endpoint, fallback, normalize, signal })
    },
    [apiBase, endpoint, fallback, normalize],
  )

  useEffect(() => {
    const genRef = loadGenRef
    const gen = ++genRef.current
    inFlightRef.current?.abort()
    const ac = new AbortController()
    inFlightRef.current = ac
    ;(async () => {
      setState((s) => ({ ...s, loading: true }))
      try {
        const result = await runLoad(ac.signal)
        if (gen !== genRef.current) return
        setState({ data: result.data, source: result.source, loading: false })
      } catch (e: unknown) {
        if (isAbortError(e)) return
        throw e
      }
    })()
    return () => {
      ac.abort()
      genRef.current += 1
    }
  }, [runLoad])

  const refetch = useCallback(async () => {
    const gen = ++loadGenRef.current
    inFlightRef.current?.abort()
    const ac = new AbortController()
    inFlightRef.current = ac
    setState((s) => ({ ...s, loading: true }))
    try {
      const result = await runLoad(ac.signal)
      if (gen !== loadGenRef.current) return
      setState({ data: result.data, source: result.source, loading: false })
    } catch (e: unknown) {
      if (isAbortError(e)) return
      throw e
    }
  }, [runLoad])

  return { ...state, refetch }
}

export function useMemberPortalData(apiBase: string) {
  return usePortalData(apiBase, portalSnapshotPath.member, memberPortalMockData, normalizeMemberPortalData)
}

export function useCommitteePortalData(apiBase: string) {
  return usePortalData(apiBase, portalSnapshotPath.committee, committeePortalMockData, normalizeCommitteePortalData)
}

export function useAcademyPortalData(apiBase: string) {
  return usePortalData(apiBase, portalSnapshotPath.academy, academyPortalMockData, normalizeAcademyPortalData)
}
