import type { SupabaseClient } from '@supabase/supabase-js'
import {
  academyPortalPayload,
  committeePortalPayload,
  memberPortalPayload,
} from '../data/portalSnapshot.js'
import { tryAssociationMonthlyPlFromJournal, tryCramSchoolMonthlyPlFromJournal } from './plFromJournal.js'

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
  requestTrend: TrendItem[]
}

type CommitteeAttendanceSession = {
  id: string
  title: string
  scheduledAt: string | null
  expectedParticipants: number
  quorumNumerator: number
  quorumDenominator: number
  status: string
  signedCount: number
}

type CommitteeAttendanceRow = {
  attendeeName: string
  attendeeRoleCode: string
  signedVia: string
  signedAt: string
}

type CommitteeOpenAgenda = {
  id: string
  title: string
  scope: string
  status: string
}

type CommitteeMemberPreview = {
  id: string
  firstName: string
  lastName: string
  batch: string | null
  membershipStatus: string
}

type CommitteeMonthlyPl = { revenue: number; expense: number; netIncome: number }

type CommitteePortalMerged = {
  metricCards: MetricCard[]
  roleCards: { chair: MetricCard[]; member: MetricCard[] }
  requestTrend: TrendItem[]
  meetings: MeetingRow[]
  attendanceSession: CommitteeAttendanceSession | null
  attendanceRows: CommitteeAttendanceRow[]
  openAgendas: CommitteeOpenAgenda[]
  memberBatchDistribution: TrendItem[]
  memberDirectoryPreview: CommitteeMemberPreview[]
  associationMonthlyPl: CommitteeMonthlyPl | null
  cramSchoolMonthlyPl: CommitteeMonthlyPl | null
  paymentRequestsPending: number
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
  cramSchoolMonthlyPl: { revenue: number; expense: number; netIncome: number } | null
  cramClassRoster: Array<{ room: string; roster: Array<{ name: string; avgScore: number | null }> }>
  schoolCourses: Array<{ id: string; title: string; category: string; description: string | null }>
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

/** คีย์วันที่ UTC แบบ YYYY-MM-DD ย้อนหลัง 7 วัน (วันแรก = ย้อน 6 วัน) */
function last7UtcDateKeys(): string[] {
  const keys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    const day = d.getUTCDate()
    keys.push(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return keys
}

function thaiWeekdayShortFromUtcDateKey(isoDateKey: string): string {
  const d = new Date(`${isoDateKey}T12:00:00.000Z`)
  const w = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
  return w[d.getUTCDay()] ?? isoDateKey
}

/** จำนวนคำร้อง member_update_requests ต่อวัน (UTC) — 7 แท่ง (ใช้ทั้ง member / committee portal) */
async function tryMemberUpdateRequestsTrendLast7Days(supabase: SupabaseClient): Promise<TrendItem[] | null> {
  const keys = last7UtcDateKeys()
  if (keys.length !== 7) return null
  const startIso = `${keys[0]!}T00:00:00.000Z`
  const { data, error } = await supabase.from('member_update_requests').select('created_at').gte('created_at', startIso)
  if (error) return null
  const counts = new Map<string, number>()
  for (const k of keys) counts.set(k, 0)
  for (const row of data ?? []) {
    const ca = String((row as { created_at: string }).created_at)
    const day = ca.slice(0, 10)
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return keys.map((k) => ({ label: thaiWeekdayShortFromUtcDateKey(k), value: counts.get(k) ?? 0 }))
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

  const plFromJournal = await tryAssociationMonthlyPlFromJournal(supabase)
  if (plFromJournal !== null) {
    base.financeCards[0] = {
      ...base.financeCards[0],
      value: fmtThb(Math.round(plFromJournal.revenue)),
      hint: 'รวมรายรับจากบัญชีแยกประเภท (นิติบุคคลสมาคม) เดือนนี้',
    }
    base.financeCards[1] = {
      ...base.financeCards[1],
      value: fmtThb(Math.round(plFromJournal.expense)),
      hint: 'รวมรายจ่ายจากบัญชีแยกประเภท (นิติบุคคลสมาคม) เดือนนี้',
    }
    base.financeCards[2] = {
      ...base.financeCards[2],
      value: fmtThb(Math.round(plFromJournal.netIncome)),
      hint: 'รายรับ − รายจ่าย จาก journal เดือนนี้',
    }
  } else {
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

    base.financeCards[0] = {
      ...base.financeCards[0],
      value: fmtThb(Math.round(donationTotal)),
      hint: 'พร็อกซี: ผลรวมการบริจาคเดือนนี้ (ยังไม่มี journal ในช่วงนี้)',
    }
    base.financeCards[1] = {
      ...base.financeCards[1],
      value: fmtThb(Math.round(expenseTotal)),
      hint: 'พร็อกซี: คำขอจ่ายที่อนุมัติ/โอนแล้วเดือนนี้',
    }
    base.financeCards[2] = {
      ...base.financeCards[2],
      value: fmtThb(Math.round(donationTotal - expenseTotal)),
      hint: 'พร็อกซี: บริจาค − คำขอจ่าย (เมื่อยังไม่ใช้บัญชีแยกประเภท)',
    }
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

  const memberReqTrend = await tryMemberUpdateRequestsTrendLast7Days(supabase)
  if (memberReqTrend && memberReqTrend.length === 7) {
    base.requestTrend = memberReqTrend
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

  const { data: batchRows, error: eBatch } = await supabase.from('members').select('batch')
  if (!eBatch && batchRows?.length) {
    const dist = topBatchesByCount(batchRows as Array<{ batch: string | null }>, 8)
    if (dist.length > 0) {
      base.memberBatchDistribution = dist
    }
  }

  const { data: previewRows, error: ePreview } = await supabase
    .from('members')
    .select('id,first_name,last_name,batch,membership_status')
    .order('updated_at', { ascending: false })
    .limit(40)
  if (!ePreview && previewRows?.length) {
    base.memberDirectoryPreview = (
      previewRows as Array<{
        id: string
        first_name: string | null
        last_name: string | null
        batch: string | null
        membership_status: string | null
      }>
    ).map((r) => ({
      id: r.id,
      firstName: (r.first_name ?? '').trim(),
      lastName: (r.last_name ?? '').trim(),
      batch: r.batch?.trim() ? r.batch.trim() : null,
      membershipStatus: (r.membership_status ?? '').trim() || '—',
    }))
  }

  const { data: latestSession, error: e3 } = await supabase
    .from('meeting_sessions')
    .select(
      'id,title,scheduled_at,expected_participants,quorum_numerator,quorum_denominator,status',
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!e3 && latestSession?.id) {
    const ls = latestSession as {
      id: string
      title: string
      scheduled_at?: string | null
      expected_participants?: number | null
      quorum_numerator?: number | null
      quorum_denominator?: number | null
      status: string
    }
    const exp = ls.expected_participants ?? 35
    const { count: attCount, error: e4 } = await supabase
      .from('meeting_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_session_id', ls.id)
    const signedCount = e4 ? 0 : (attCount ?? 0)
    if (!e4) {
      base.metricCards[2] = {
        ...base.metricCards[2],
        value: `${signedCount}/${exp}`,
      }
    }
    base.attendanceSession = {
      id: ls.id,
      title: ls.title,
      scheduledAt: ls.scheduled_at ?? null,
      expectedParticipants: exp,
      quorumNumerator: ls.quorum_numerator ?? 2,
      quorumDenominator: ls.quorum_denominator ?? 3,
      status: ls.status,
      signedCount,
    }

    const { data: attRows, error: e4b } = await supabase
      .from('meeting_attendance')
      .select('attendee_name,attendee_role_code,signed_via,signed_at')
      .eq('meeting_session_id', ls.id)
      .order('signed_at', { ascending: false })
      .limit(50)
    if (!e4b && attRows?.length) {
      base.attendanceRows = attRows.map(
        (r: {
          attendee_name: string
          attendee_role_code: string
          signed_via: string
          signed_at: string
        }) => ({
          attendeeName: r.attendee_name,
          attendeeRoleCode: r.attendee_role_code,
          signedVia: r.signed_via,
          signedAt: r.signed_at,
        }),
      )
    }
  }

  const { count: openAgendas, error: e5 } = await supabase
    .from('meeting_agendas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  const { data: agendaRows, error: e5b } = await supabase
    .from('meeting_agendas')
    .select('id,title,scope,status')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(25)
  if (!e5b && agendaRows?.length) {
    base.openAgendas = agendaRows.map((a: { id: string; title: string; scope: string; status: string }) => ({
      id: a.id,
      title: a.title,
      scope: a.scope,
      status: a.status,
    }))
  }

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

  const assocPl = await tryAssociationMonthlyPlFromJournal(supabase)
  const cramPl = await tryCramSchoolMonthlyPlFromJournal(supabase)
  base.associationMonthlyPl = assocPl
  base.cramSchoolMonthlyPl = cramPl

  const { count: payPending, error: ePay } = await supabase
    .from('payment_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (!ePay && typeof payPending === 'number') {
    base.paymentRequestsPending = payPending
  }

  const reqTrend = await tryMemberUpdateRequestsTrendLast7Days(supabase)
  if (reqTrend && reqTrend.length === 7) {
    base.requestTrend = reqTrend
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

  const cramPl = await tryCramSchoolMonthlyPlFromJournal(supabase)
  base.cramSchoolMonthlyPl = cramPl

  const { data: courseRows, error: courseErr } = await supabase
    .from('school_activities')
    .select('id, title, category, description')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('title', { ascending: true })
    .limit(200)

  if (!courseErr && courseRows && courseRows.length > 0) {
    base.schoolCourses = (
      courseRows as { id: string; title: string; category: string; description: string | null }[]
    ).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? '').trim() || '—',
      category: String(r.category ?? '').trim() || 'ทั่วไป',
      description: r.description != null && String(r.description).trim() ? String(r.description) : null,
    }))
    const cats = new Set(base.schoolCourses.map((c) => c.category))
    base.metricCards[1] = {
      ...base.metricCards[1],
      value: fmtInt(Math.max(cats.size, 1)),
      hint: 'จำนวนหมวดคอร์สที่แตกต่าง (school_activities ที่ active)',
    }
    base.metricCards[2] = {
      ...base.metricCards[2],
      value: fmtInt(courseRows.length),
      hint: 'จำนวนรายการคอร์ส/กิจกรรมที่เปิด (school_activities)',
    }
  }

  const { data: cramRooms, error: cramRoomErr } = await supabase
    .from('cram_classrooms')
    .select('id, display_name, room_code')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (!cramRoomErr && cramRooms && cramRooms.length > 0) {
    const { data: cramStuds, error: cramStudErr } = await supabase
      .from('cram_students')
      .select('classroom_id, display_name, current_avg_score')
      .order('display_name', { ascending: true })

    const byRoom = new Map<string, { n: number; sum: number }>()
    const rosterByClass = new Map<string, Array<{ name: string; avgScore: number | null }>>()
    let totalN = 0
    let totalSum = 0
    if (!cramStudErr && cramStuds) {
      for (const row of cramStuds as { classroom_id: string; current_avg_score?: number | null }[]) {
        const v = Number(row.current_avg_score ?? 0)
        if (!Number.isFinite(v)) continue
        const cid = String(row.classroom_id)
        const cur = byRoom.get(cid) ?? { n: 0, sum: 0 }
        cur.n += 1
        cur.sum += v
        byRoom.set(cid, cur)
        totalN += 1
        totalSum += v
      }
      for (const row of cramStuds as {
        classroom_id: string
        display_name?: string | null
        current_avg_score?: number | null
      }[]) {
        const cid = String(row.classroom_id)
        const name = String(row.display_name ?? '').trim() || '—'
        let avgScore: number | null = null
        if (row.current_avg_score != null) {
          const n = Number(row.current_avg_score)
          avgScore = Number.isFinite(n) ? n : null
        }
        const list = rosterByClass.get(cid) ?? []
        list.push({ name, avgScore })
        rosterByClass.set(cid, list)
      }
    }

    base.classes = cramRooms.map((r: { id: string; display_name: string; room_code: string }) => {
      const agg = byRoom.get(String(r.id)) ?? { n: 0, sum: 0 }
      const avg = agg.n > 0 ? Math.round((agg.sum / agg.n) * 10) / 10 : 0
      return {
        room: r.display_name || r.room_code,
        students: agg.n,
        avgScore: avg,
      }
    })

    base.cramClassRoster = cramRooms.map((r: { id: string; display_name: string; room_code: string }) => ({
      room: r.display_name || r.room_code,
      roster: rosterByClass.get(String(r.id)) ?? [],
    }))

    if (totalN > 0) {
      const overall = Math.round((totalSum / totalN) * 10) / 10
      base.metricCards[3] = {
        ...base.metricCards[3],
        value: String(overall),
        hint: 'ค่าเฉลี่ยจากนักเรียนในระบบ (cram_students)',
      }
    }
  }

  return base
}
