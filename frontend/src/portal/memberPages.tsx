import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MemberPortal } from '../components/MemberPortal'
import { DonationCampaignCard, MeetingReportRow, MetricCards, PortalDataSourceBadge, PortalShell, TrendBars } from './ui'
import {
  type MemberPortalData,
  type MemberRoleView,
  type PortalDataState,
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
        <Route path="statistics" element={<MemberStatisticsPage roleView={roleView} portalState={portalData} />} />
        <Route path="donations" element={<MemberDonationsPage portalState={portalData} />} />
        <Route path="meetings" element={<MemberMeetingsPage portalState={portalData} />} />
        <Route
          path="documents"
          element={roleView === 'staff' ? <MemberStaffDocumentsPage /> : <NotFoundInline />}
        />
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </PortalShell>
  )
}

function MemberStaffDocumentsPage() {
  const links = [
    {
      to: '/admin',
      title: 'แผง Admin',
      description: 'นำเข้าสมาชิก การเงิน กิจกรรมโรงเรียน — จุดทำงานหลักของเจ้าหน้าที่',
    },
    {
      to: '/requests',
      title: 'คำร้องสมาชิก',
      description: 'อนุมัติและติดตามคำร้องลงทะเบียน/แก้ไขข้อมูล',
    },
    {
      to: '/committee/dashboard',
      title: 'พอร์ทัลคณะกรรมการ',
      description: 'สรุปการประชุม การเงิน ทะเบียน และวาระลงมติ',
    },
    {
      to: '/academy/dashboard',
      title: 'Academy',
      description: 'โรงเรียนกวดวิชา — ห้องเรียน คอร์ส และ funnel สมัคร',
    },
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลเชิงกำกับดูแล</h3>
        <p className="mt-2 text-sm text-slate-400">
          ศูนย์ลิงก์สำหรับเจ้าหน้าที่สมาคม — รายงานปิดงบ หลักฐานการเงิน และ audit trail อยู่ใน workflow การเงิน (Admin) และบัญชีแยกประเภท
          ในระบบหลังบ้าน
        </p>
        <ul className="mt-5 space-y-3">
          {links.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="block rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 transition hover:border-emerald-800/60 hover:bg-slate-900/70"
              >
                <p className="font-medium text-emerald-200">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-600">
          หมายเหตุ: การเข้าถึงข้อมูลส่วนบัญชีอาจต้องใช้คีย์หรือสิทธิ์ตามที่กำหนดในแผง Admin
        </p>
      </section>
    </div>
  )
}

function memberStr(m: Record<string, unknown>, key: string): string {
  const v = m[key]
  if (v == null || v === '') return ''
  return String(v).trim()
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || 'สมาชิก'
  const batch = memberStr(props.member, 'batch') || '—'
  const code = memberStr(props.member, 'member_code')
  const status = memberStr(props.member, 'membership_status') || '—'
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-xl ring-1 ring-emerald-500/20">
          <div className="bg-emerald-950/50 px-6 py-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">YRC Smart Alumni</p>
            <p className="mt-1 text-xs text-slate-400">บัตรสมาชิกดิจิทัล</p>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-xl font-semibold text-white">{fullName}</p>
            <p className="mt-2 text-sm text-slate-400">รุ่น {batch}</p>
            <div className="mt-6 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/80 text-[10px] text-slate-500">
                QR
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <div className="flex justify-between gap-4 border-t border-slate-800 pt-3">
                <dt className="text-slate-500">รหัสสมาชิก</dt>
                <dd className="font-mono text-xs text-slate-300">{code || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">สถานะ</dt>
                <dd className="text-slate-200">{status}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          to="/member/profile"
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700"
        >
          ข้อมูลส่วนตัว
        </Link>
        <Link to="/member/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
          แดชบอร์ด
        </Link>
      </div>
    </div>
  )
}

function MemberProfilePage(props: { member: Record<string, unknown> }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'ชื่อ', value: [memberStr(props.member, 'first_name'), memberStr(props.member, 'last_name')].filter(Boolean).join(' ') || '—' },
    { label: 'รุ่น', value: memberStr(props.member, 'batch') || '—' },
    { label: 'รหัสสมาชิก', value: memberStr(props.member, 'member_code') || '—' },
    { label: 'สถานะสมาชิก', value: memberStr(props.member, 'membership_status') || '—' },
    { label: 'อีเมล', value: memberStr(props.member, 'email') || '—' },
    { label: 'โทรศัพท์', value: memberStr(props.member, 'phone') || '—' },
    { label: 'จังหวัด', value: memberStr(props.member, 'province') || '—' },
  ]
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลส่วนตัว</h3>
        <p className="mt-2 text-sm text-slate-400">ข้อมูลจากบัญชีที่ลงทะเบียนแล้ว — แก้ไขผ่านคำร้องอัปเดตข้อมูล</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="rounded border border-slate-800/80 bg-slate-900/30 px-3 py-2">
              <dt className="text-xs text-slate-500">{r.label}</dt>
              <dd className="mt-0.5 text-sm text-slate-100">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-600">
          หากข้อมูลไม่ครบหรือต้องแก้ไข ใช้ flow คำร้องในแอปหลักหลังเชื่อม LINE
        </p>
      </section>
    </div>
  )
}

function MemberStatisticsPage(props: { roleView: MemberRoleView; portalState: PortalDataState<MemberPortalData> }) {
  const { data, loading, source } = props.portalState
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">ข้อมูล snapshot</p>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
      </section>
      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลด…</p>
      ) : (
        <>
          <MetricCards items={data.statsCards} />
          <MetricCards items={data.roleCards[props.roleView]} />
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">คำร้องใหม่ 7 วัน (UTC)</h3>
            <p className="mt-2 text-sm text-slate-400">
              จำนวนคำร้องต่อวันจาก <code className="text-slate-500">member_update_requests</code> — เทียบกับแนวโน้มใน Committee
              portal
            </p>
            <TrendBars items={data.requestTrend} color="cyan" />
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สัดส่วนสมาชิกตามรุ่น</h3>
            <TrendBars items={data.batchDistribution} color="emerald" />
          </section>
        </>
      )}
    </div>
  )
}

function MemberDonationsPage(props: { portalState: PortalDataState<MemberPortalData> }) {
  const { data, loading, source } = props.portalState
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สนับสนุนกิจกรรมโรงเรียน</h3>
            <p className="mt-2 text-sm text-slate-400">เลือกโครงการที่ต้องการสนับสนุนและแนบสลิปเพื่อยืนยันรายการ</p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.donationCampaigns.map((campaign) => (
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
          </>
        )}
      </section>
    </div>
  )
}

function MemberMeetingsPage(props: { portalState: PortalDataState<MemberPortalData> }) {
  const { data, loading, source } = props.portalState
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สาระประชุมและรายรับรายจ่าย</h3>
            <p className="mt-2 text-sm text-slate-400">ข้อมูลที่สมาชิกเข้าถึงได้: สรุปรายงานประชุมและภาพรวมทางการเงิน</p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            {data.meetingReports.map((meeting) => (
              <MeetingReportRow key={meeting.title} title={meeting.title} date={meeting.date} />
            ))}
          </div>
        )}
      </section>
      {!loading ? <MetricCards items={data.financeCards} /> : null}
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
