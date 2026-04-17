import { useEffect, useState } from 'react'
import {
  academyClasses,
  academyEnrollmentFunnel,
  academyMetricCards,
  academyRoleCards,
  committeeMeetings,
  committeeMetricCards,
  committeeRequestTrend,
  committeeRoleCards,
  memberBatchDistribution,
  memberDonationCampaigns,
  memberFinanceCards,
  memberMeetingReports,
  memberStatsCards,
  academyCramClassRoster,
  academySchoolCourses,
  type AcademyClassItem,
  type AcademyCramClassRoster,
  type AcademySchoolCourseItem,
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

export type MemberPortalData = {
  statsCards: MetricItem[]
  roleCards: Record<MemberRoleView, MetricItem[]>
  batchDistribution: TrendItem[]
  donationCampaigns: DonationCampaign[]
  financeCards: MetricItem[]
  meetingReports: MeetingReportItem[]
}

export type CommitteePortalData = {
  metricCards: MetricItem[]
  roleCards: Record<CommitteeRoleView, MetricItem[]>
  requestTrend: TrendItem[]
  meetings: MeetingItem[]
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
}

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
  financeCards: memberFinanceCards,
  meetingReports: memberMeetingReports,
}

const committeePortalMockData: CommitteePortalData = {
  metricCards: committeeMetricCards,
  roleCards: committeeRoleCards,
  requestTrend: committeeRequestTrend,
  meetings: committeeMeetings,
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

/** รวมฟิลด์ที่ขาดเมื่อ API เก่าหรือ response ไม่ครบ — ลดความเสี่ยง UI พัง */
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
}): Promise<{ data: TData; source: PortalDataSource }> {
  try {
    const res = await fetch(`${params.apiBase}${params.endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body: unknown = await res.json()
    const unwrapped =
      isRecord(body) && 'data' in body && body.data !== undefined ? (body as { data: unknown }).data : body
    const data = params.normalize ? params.normalize(unwrapped, params.fallback) : (unwrapped as TData)
    return { data, source: 'api' }
  } catch {
    return { data: params.fallback, source: 'mock' }
  }
}

function usePortalData<TData>(
  apiBase: string,
  endpoint: string,
  fallback: TData,
  normalize?: (raw: unknown, fallback: TData) => TData,
) {
  const [state, setState] = useState<PortalDataState<TData>>({
    data: fallback,
    source: 'mock',
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await loadPortalData({ apiBase, endpoint, fallback, normalize })
      if (cancelled) return
      setState({ ...result, loading: false })
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, endpoint, fallback, normalize])

  return state
}

export function useMemberPortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/member', memberPortalMockData)
}

export function useCommitteePortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/committee', committeePortalMockData)
}

export function useAcademyPortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/academy', academyPortalMockData, normalizeAcademyPortalData)
}
