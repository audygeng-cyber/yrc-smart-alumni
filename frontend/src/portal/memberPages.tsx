import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MemberPortal } from '../components/MemberPortal'
import { DonationCampaignCard, MeetingReportRow, MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'
import {
  type MemberPortalData,
  type MemberRoleView,
  useMemberPortalData,
} from './dataAdapter'

export function MemberArea(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  lineDisplayName: string
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  const [roleView, setRoleView] = useState<MemberRoleView>('member')
  const portalData = useMemberPortalData(props.apiBase)
  const memberNav = [
    { to: '/member/dashboard', label: 'Dashboard', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/card', label: 'บัตรสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/profile', label: 'ข้อมูลส่วนตัว', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/statistics', label: 'สถิติสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/donations', label: 'สนับสนุนกิจกรรม', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/meetings', label: 'ประชุมและการเงิน', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/documents', label: 'ข้อมูลเชิงกำกับดูแล', roles: ['staff'] as MemberRoleView[] },
  ]
  const visibleNavItems = memberNav.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))

  return (
    <PortalShell
      title="Member Portal"
      subtitle="เมนูสมาชิก · บัตรสมาชิก · ข้อมูลส่วนตัว · สถิติ · การสนับสนุน"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Role view</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as MemberRoleView)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
          >
            <option value="member">สมาชิกทั่วไป</option>
            <option value="staff">เจ้าหน้าที่สมาคม</option>
          </select>
          <span className="text-xs text-slate-500">จำลองสิทธิ์เมนูภายใน member portal</span>
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
            data: {portalData.loading ? 'loading...' : portalData.source}
          </span>
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <MemberPortal
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              onMemberUpdated={props.onMemberUpdated}
              lineDisplayName={props.lineDisplayName}
            />
          }
        />
        <Route path="card" element={<MemberCardPage member={props.member} />} />
        <Route path="profile" element={<MemberProfilePage member={props.member} />} />
        <Route path="statistics" element={<MemberStatisticsPage roleView={roleView} portalData={portalData.data} />} />
        <Route path="donations" element={<MemberDonationsPage portalData={portalData.data} />} />
        <Route path="meetings" element={<MemberMeetingsPage portalData={portalData.data} />} />
        <Route
          path="documents"
          element={
            roleView === 'staff' ? (
              <SectionPlaceholder
                title="ข้อมูลเชิงกำกับดูแล"
                description="เอกสารกำกับดูแลเชิงลึกสำหรับเจ้าหน้าที่สมาคม เช่น รายงานปิดงบและเอกสารตรวจสอบภายใน"
              />
            ) : (
              <NotFoundInline />
            )
          }
        />
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </PortalShell>
  )
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  const batch = props.member.batch != null ? String(props.member.batch) : '-'
  const lineUid = props.member.line_uid != null ? String(props.member.line_uid) : '-'
  return (
    <SectionPlaceholder
      title="บัตรสมาชิกดิจิทัล"
      description={`เตรียมหน้าบัตรสมาชิกสำหรับ ${fullName} · รุ่น ${batch} · LINE UID ${lineUid}`}
    />
  )
}

function MemberProfilePage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  return (
    <SectionPlaceholder
      title="ข้อมูลส่วนตัวสมาชิก"
      description={`เตรียมหน้าจัดการข้อมูลส่วนตัวและประวัติคำขอแก้ไขข้อมูลของ ${fullName}`}
    />
  )
}

function MemberStatisticsPage(props: { roleView: MemberRoleView; portalData: MemberPortalData }) {
  return (
    <div className="space-y-4">
      <MetricCards items={props.portalData.statsCards} />
      <MetricCards items={props.portalData.roleCards[props.roleView]} />
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สัดส่วนสมาชิกตามรุ่น (ตัวอย่าง)</h3>
        <TrendBars items={props.portalData.batchDistribution} color="emerald" />
      </section>
    </div>
  )
}

function MemberDonationsPage(props: { portalData: MemberPortalData }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สนับสนุนกิจกรรมโรงเรียน</h3>
        <p className="mt-2 text-sm text-slate-400">เลือกโครงการที่ต้องการสนับสนุนและแนบสลิปเพื่อยืนยันรายการ</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {props.portalData.donationCampaigns.map((campaign) => (
            <DonationCampaignCard
              key={campaign.title}
              title={campaign.title}
              progress={campaign.progress}
              target={campaign.target}
              raised={campaign.raised}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700">
            บริจาคและแนบสลิป
          </button>
          <button type="button" className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            ดูประวัติการบริจาค
          </button>
        </div>
      </section>
    </div>
  )
}

function MemberMeetingsPage(props: { portalData: MemberPortalData }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สาระประชุมและรายรับรายจ่าย</h3>
        <p className="mt-2 text-sm text-slate-400">ข้อมูลที่สมาชิกเข้าถึงได้: สรุปรายงานประชุมและภาพรวมทางการเงิน</p>
        <div className="mt-4 space-y-2 text-sm">
          {props.portalData.meetingReports.map((meeting) => (
            <MeetingReportRow key={meeting.title} title={meeting.title} date={meeting.date} />
          ))}
        </div>
      </section>
      <MetricCards items={props.portalData.financeCards} />
    </div>
  )
}

function NotFoundInline() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
      ไม่พบหน้าที่ร้องขอภายในพอร์ทัลสมาชิก
    </section>
  )
}
