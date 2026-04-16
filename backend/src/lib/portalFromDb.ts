import type { SupabaseClient } from '@supabase/supabase-js'
import {
  academyPortalPayload,
  committeePortalPayload,
  memberPortalPayload,
} from '../data/portalSnapshot.js'

/** โครงเดียวกับ snapshot แต่ mutable (ไม่ใช่ readonly จาก `as const`) */
type MetricCard = { label: string; value: string; hint: string }
type TrendItem = { label: string; value: number }
type MeetingReport = { title: string; date: string }
type DonationCampaign = { title: string; progress: number; target: string; raised: string }
type MeetingRow = { topic: string; time: string; status: 'ready' | 'pending_vote' | 'in_review' }

type MemberPortalMerged = {
  statsCards: MetricCard[]
  roleCards: { member: MetricCard[]; staff: MetricCard[] }
  batchDistribution: TrendItem[]
  donationCampaigns: DonationCampaign[]
  financeCards: MetricCard[]
  meetingReports: MeetingReport[]
}

type CommitteePortalMerged = {
  metricCards: MetricCard[]
  roleCards: { chair: MetricCard[]; member: MetricCard[] }
  requestTrend: TrendItem[]
  meetings: MeetingRow[]
}

type AcademyPortalMerged = {
  metricCards: MetricCard[]
  roleCards: {
    admin: MetricCard[]
    teacher: MetricCard[]
    student: MetricCard[]
    parent: MetricCard[]
  }
  classes: { room: string; students: number; avgScore: number }[]
  enrollmentFunnel: TrendItem[]
}

function cloneMemberPayload(): MemberPortalMerged {
  return JSON.parse(JSON.stringify(memberPortalPayload)) as MemberPortalMerged
}

function cloneCommitteePayload(): CommitteePortalMerged {
  return JSON.parse(JSON.stringify(committeePortalPayload)) as CommitteePortalMerged
}

function cloneAcademyPayload(): AcademyPortalMerged {
  return JSON.parse(JSON.stringify(academyPortalPayload)) as AcademyPortalMerged
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

function fmtThb(n: number): string {
  return `฿ ${n.toLocaleString('en-US')}`
}

function monthBoundsUtc(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return { start: start.toISOString(), end: end.toISOString() }
}

function topBatchesByCount(rows: Array<{ batch: string | null }>, limit: number) {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const b = r.batch?.trim()
    if (!b) continue
    counts.set(b, (counts.get(b) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label: `รุ่น ${label}`, value }))
}

export async function buildMemberPortalFromDb(supabase: SupabaseClient) {
  const base = cloneMemberPayload()

  const { count: totalMembers, error: e1 } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
  if (e1) throw e1

  const { data: batchRows, error: e2 } = await supabase.from('members').select('batch')
  if (e2) throw e2

  const batches = (batchRows ?? []) as Array<{ batch: string | null }>
  const distinctBatches = new Set(
    batches.map((r) => r.batch?.trim()).filter((b): b is string => Boolean(b && b.length > 0)),
  )

  const { count: activeMembers, error: e3 } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .ilike('membership_status', 'active')
  if (e3) throw e3

  const { start, end } = monthBoundsUtc()
  const { count: requestsMonth, error: e4 } = await supabase
    .from('member_update_requests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end)
  if (e4) throw e4

  base.statsCards[0] = { ...base.statsCards[0], value: fmtInt(totalMembers ?? 0) }
  base.statsCards[1] = { ...base.statsCards[1], value: fmtInt(distinctBatches.size) }
  base.statsCards[2] = { ...base.statsCards[2], value: fmtInt(activeMembers ?? 0) }
  base.statsCards[3] = { ...base.statsCards[3], value: fmtInt(requestsMonth ?? 0) }

  const dist = topBatchesByCount(batches, 8)
  if (dist.length > 0) {
    base.batchDistribution = dist
  }

  base.roleCards.staff[0] = { ...base.roleCards.staff[0], value: fmtInt(requestsMonth ?? 0) }

  const { data: donationsMonth, error: e5 } = await supabase
    .from('donations')
    .select('amount')
    .gte('created_at', start)
    .lt('created_at', end)
  if (e5) throw e5

  const donationTotal = (donationsMonth ?? []).reduce((s, r: { amount?: string | number | null }) => {
    const n = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)

  const { data: paymentsMonth, error: e6 } = await supabase
    .from('payment_requests')
    .select('amount')
    .in('status', ['approved', 'executed'])
    .gte('created_at', start)
    .lt('created_at', end)
  if (e6) throw e6

  const expenseTotal = (paymentsMonth ?? []).reduce((s, r: { amount?: string | number | null }) => {
    const n = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
    return s + (Number.isFinite(n) ? n : 0)
  }, 0)

  base.financeCards[0] = { ...base.financeCards[0], value: fmtThb(Math.round(donationTotal)) }
  base.financeCards[1] = { ...base.financeCards[1], value: fmtThb(Math.round(expenseTotal)) }
  base.financeCards[2] = {
    ...base.financeCards[2],
    value: fmtThb(Math.round(donationTotal - expenseTotal)),
  }

  const { count: reportsCount, error: e7 } = await supabase
    .from('meeting_sessions')
    .select('*', { count: 'exact', head: true })
  if (!e7 && typeof reportsCount === 'number') {
    base.financeCards[3] = { ...base.financeCards[3], value: fmtInt(reportsCount) }
  }

  const { data: sessions, error: e8 } = await supabase
    .from('meeting_sessions')
    .select('title,scheduled_at,created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  if (!e8 && sessions?.length) {
    base.meetingReports = sessions.map((s: { title: string; scheduled_at?: string | null; created_at?: string }) => {
      const d = s.scheduled_at ? new Date(s.scheduled_at) : s.created_at ? new Date(s.created_at) : new Date()
      const day = d.getDate().toString().padStart(2, '0')
      const month = (d.getMonth() + 1).toString().padStart(2, '0')
      const year = d.getFullYear() + 543
      return { title: s.title, date: `${day}/${month}/${year}` }
    })
  }

  return base
}

export async function buildCommitteePortalFromDb(supabase: SupabaseClient) {
  const base = cloneCommitteePayload()

  const { count: totalMembers, error: e1 } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
  if (e1) throw e1

  const { count: pendingRequests, error: e2 } = await supabase
    .from('member_update_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending_president', 'pending_admin'])
  if (e2) throw e2

  base.metricCards[0] = { ...base.metricCards[0], value: fmtInt(totalMembers ?? 0) }
  base.metricCards[1] = { ...base.metricCards[1], value: fmtInt(pendingRequests ?? 0) }

  const { data: latestSession, error: e3 } = await supabase
    .from('meeting_sessions')
    .select('id,expected_participants')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!e3 && latestSession?.id) {
    const { count: attCount, error: e4 } = await supabase
      .from('meeting_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_session_id', latestSession.id)
    if (!e4) {
      const exp = latestSession.expected_participants ?? 35
      base.metricCards[2] = {
        ...base.metricCards[2],
        value: `${attCount ?? 0}/${exp}`,
      }
    }
  }

  const { count: openAgendas, error: e5 } = await supabase
    .from('meeting_agendas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  base.roleCards.chair[1] = {
    ...base.roleCards.chair[1],
    value: fmtInt(pendingRequests ?? 0),
  }

  if (!e5 && typeof openAgendas === 'number') {
    base.metricCards[3] = { ...base.metricCards[3], value: fmtInt(openAgendas) }
    base.roleCards.member[0] = { ...base.roleCards.member[0], value: fmtInt(openAgendas) }
  }

  const { data: meetings, error: e6 } = await supabase
    .from('meeting_sessions')
    .select('title,scheduled_at,status')
    .order('created_at', { ascending: false })
    .limit(10)
  if (!e6 && meetings?.length) {
    base.meetings = meetings.map((m: { title: string; scheduled_at?: string | null; status: string }) => {
      const t = m.scheduled_at ? new Date(m.scheduled_at) : new Date()
      const hh = t.getHours().toString().padStart(2, '0')
      const mm = t.getMinutes().toString().padStart(2, '0')
      const st =
        m.status === 'closed' ? ('ready' as const) : m.status === 'open' ? ('pending_vote' as const) : ('in_review' as const)
      return { topic: m.title, time: `${hh}:${mm}`, status: st }
    })
  }

  return base
}

export async function buildAcademyPortalFromDb(supabase: SupabaseClient) {
  const base = cloneAcademyPayload()

  const { count: teachers, error: e1 } = await supabase
    .from('app_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_code', 'teacher')

  const { count: students, error: e2 } = await supabase
    .from('app_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_code', 'student')

  const { count: parents, error: e3 } = await supabase
    .from('app_user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_code', 'parent')

  const { count: execs, error: e4 } = await supabase
    .from('app_user_roles')
    .select('*', { count: 'exact', head: true })
    .in('role_code', ['cram_executive', 'admin'])

  const err = e1 ?? e2 ?? e3 ?? e4
  if (err) throw err

  const s = students ?? 0
  if (s > 0) {
    base.metricCards[0] = { ...base.metricCards[0], value: fmtInt(s) }
  }

  base.roleCards.teacher[0] = { ...base.roleCards.teacher[0], value: fmtInt(teachers ?? 0) }
  base.roleCards.student[0] = { ...base.roleCards.student[0], value: fmtInt(students ?? 0) }
  base.roleCards.parent[0] = { ...base.roleCards.parent[0], value: fmtInt(parents ?? 0) }
  base.roleCards.admin[0] = { ...base.roleCards.admin[0], value: fmtInt(execs ?? 0) }

  return base
}
