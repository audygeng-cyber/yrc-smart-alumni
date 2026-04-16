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
  type AcademyClassItem,
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
}

async function loadPortalData<TData>(params: { apiBase: string; endpoint: string; fallback: TData }): Promise<{ data: TData; source: PortalDataSource }> {
  try {
    const res = await fetch(`${params.apiBase}${params.endpoint}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as TData | { data?: TData }
    const data = typeof body === 'object' && body && 'data' in body && body.data ? body.data : (body as TData)
    return { data, source: 'api' }
  } catch {
    return { data: params.fallback, source: 'mock' }
  }
}

function usePortalData<TData>(apiBase: string, endpoint: string, fallback: TData) {
  const [state, setState] = useState<PortalDataState<TData>>({
    data: fallback,
    source: 'mock',
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await loadPortalData({ apiBase, endpoint, fallback })
      if (cancelled) return
      setState({ ...result, loading: false })
    })()
    return () => {
      cancelled = true
    }
  }, [apiBase, endpoint, fallback])

  return state
}

export function useMemberPortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/member', memberPortalMockData)
}

export function useCommitteePortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/committee', committeePortalMockData)
}

export function useAcademyPortalData(apiBase: string) {
  return usePortalData(apiBase, '/api/portal/academy', academyPortalMockData)
}
