import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MetricCards, PortalDataSourceBadge, PortalShell, SectionPlaceholder, TrendBars } from './ui'
import {
  type CommitteePortalData,
  type CommitteeRoleView,
  type PortalDataState,
  useCommitteePortalData,
} from './dataAdapter'

export function CommitteeArea(props: { apiBase: string }) {
  const [roleView, setRoleView] = useState<CommitteeRoleView>('chair')
  const portalData = useCommitteePortalData(props.apiBase)
  const navItems = [
    { to: '/committee/dashboard', label: 'Dashboard', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/members', label: 'ทะเบียนสมาชิก', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/finance', label: 'การเงินละเอียด', roles: ['chair'] as CommitteeRoleView[] },
    { to: '/committee/meetings', label: 'วาระ/รายงานประชุม', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/attendance', label: 'ลงทะเบียน/ลงชื่อประชุม', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/voting', label: 'ลงมติ', roles: ['chair', 'member'] as CommitteeRoleView[] },
  ]
  const visibleNavItems = navItems.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))

  return (
    <PortalShell
      title="Committee Portal"
      subtitle="คณะกรรมการ 35 คน · ทะเบียนสมาชิก · การเงินละเอียด · ประชุม · ลงมติ"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Role view</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as CommitteeRoleView)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
          >
            <option value="chair">ประธานคณะกรรมการ</option>
            <option value="member">กรรมการ</option>
          </select>
          <span className="text-xs text-slate-500">จำลองสิทธิ์เมนูภายใน committee portal</span>
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
            data: {portalData.loading ? 'loading...' : portalData.source}
          </span>
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CommitteeDashboardPage roleView={roleView} portalData={portalData.data} />} />
        <Route
          path="members"
          element={
            <SectionPlaceholder
              title="ทะเบียนสมาชิก"
              description="ค้นหา/กรองสมาชิก, ดูข้อมูลเชิงลึก และสถิติสมาชิกสำหรับคณะกรรมการ"
            />
          }
        />
        <Route
          path="finance"
          element={
            roleView === 'chair' ? (
              <SectionPlaceholder
                title="การเงินแบบละเอียด"
                description="รายรับรายจ่ายสมาคมและโรงเรียนกวดวิชาแบบละเอียด พร้อมเอกสารประกอบ"
              />
            ) : (
              <SectionPlaceholder
                title="การเงินแบบละเอียด"
                description="สิทธิ์ระดับกรรมการเห็นเฉพาะสรุปภาพรวม โปรดยกระดับสิทธิ์เพื่อดูรายละเอียดทั้งหมด"
              />
            )
          }
        />
        <Route path="meetings" element={<CommitteeMeetingsPage portalState={portalData} />} />
        <Route
          path="attendance"
          element={
            <SectionPlaceholder
              title="ลงทะเบียนและลงชื่อประชุม"
              description="ระบบลงทะเบียนเข้าร่วมประชุม, เช็กชื่อ, และติดตาม quorum"
            />
          }
        />
        <Route
          path="voting"
          element={
            <SectionPlaceholder
              title="การลงมติ"
              description="เปิดวาระลงมติ, ลงคะแนน, และดูผลการลงมติในแต่ละหัวข้อ"
            />
          }
        />
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </PortalShell>
  )
}

function CommitteeMeetingsPage(props: { portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const meetings = data.meetings

  const statusLabel = (s: (typeof meetings)[number]['status']) =>
    s === 'ready' ? 'พร้อม' : s === 'pending_vote' ? 'รอลงมติ' : 'ตรวจสอบ'

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">วาระและรอบประชุม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจาก snapshot (<code className="text-slate-500">meeting_sessions</code> ล่าสุด) — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : meetings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">ยังไม่มีรายการประชุมใน snapshot</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {meetings.map((m, i) => (
              <li
                key={`${m.topic}-${i}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-slate-100">{m.topic}</p>
                  <p className="text-xs text-slate-500">เวลา {m.time}</p>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    m.status === 'ready'
                      ? 'bg-emerald-900/40 text-emerald-200'
                      : m.status === 'pending_vote'
                        ? 'bg-amber-900/40 text-amber-200'
                        : 'bg-sky-900/40 text-sky-200'
                  }`}
                >
                  {statusLabel(m.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/committee/dashboard" className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700">
            กลับแดชบอร์ด
          </Link>
          <Link to="/committee/voting" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
            หน้าลงมติ (ตัวอย่าง)
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeDashboardPage(props: { roleView: CommitteeRoleView; portalData: CommitteePortalData }) {
  return (
    <div className="space-y-4">
      <MetricCards items={props.portalData.metricCards} />
      <MetricCards items={props.portalData.roleCards[props.roleView]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">แนวโน้มคำร้อง 7 วัน</h3>
          <p className="mt-2 text-sm text-slate-400">ใช้ติดตาม backlog ของคำร้องและคาดการณ์ภาระงานทีมอนุมัติ</p>
          <TrendBars items={props.portalData.requestTrend} />
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">งานด่วนวันนี้</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-100">ตรวจ quorum ก่อนเริ่มประชุม</li>
            <li className="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-red-100">วาระลงมติค้าง 2 รายการ</li>
            <li className="rounded border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-sky-100">ติดตามเอกสารการเงินเดือนล่าสุด</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/committee/voting" className="rounded bg-emerald-800 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">
              เปิดหน้าลงมติ
            </Link>
            <Link to="/committee/attendance" className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
              เช็กชื่อประชุม
            </Link>
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถานะประชุมวันนี้</h3>
        <div className="mt-3 space-y-2 text-sm">
          {props.portalData.meetings.map((meeting) => (
            <div key={meeting.topic} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2">
              <div>
                <p className="text-slate-100">{meeting.topic}</p>
                <p className="text-xs text-slate-400">เริ่ม {meeting.time}</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  meeting.status === 'ready'
                    ? 'bg-emerald-900/40 text-emerald-200'
                    : meeting.status === 'pending_vote'
                      ? 'bg-amber-900/40 text-amber-200'
                      : 'bg-sky-900/40 text-sky-200'
                }`}
              >
                {meeting.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function NotFoundInline() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
      ไม่พบหน้าที่ร้องขอภายในพอร์ทัลคณะกรรมการ
    </section>
  )
}
