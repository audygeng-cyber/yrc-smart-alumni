import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'

export function CommitteeArea() {
  const navItems = [
    { to: '/committee/dashboard', label: 'Dashboard' },
    { to: '/committee/members', label: 'ทะเบียนสมาชิก' },
    { to: '/committee/finance', label: 'การเงินละเอียด' },
    { to: '/committee/meetings', label: 'วาระ/รายงานประชุม' },
    { to: '/committee/attendance', label: 'ลงทะเบียน/ลงชื่อประชุม' },
    { to: '/committee/voting', label: 'ลงมติ' },
  ]

  return (
    <PortalShell
      title="Committee Portal"
      subtitle="คณะกรรมการ 35 คน · ทะเบียนสมาชิก · การเงินละเอียด · ประชุม · ลงมติ"
      navItems={navItems}
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CommitteeDashboardPage />} />
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
            <SectionPlaceholder
              title="การเงินแบบละเอียด"
              description="รายรับรายจ่ายสมาคมและโรงเรียนกวดวิชาแบบละเอียด พร้อมเอกสารประกอบ"
            />
          }
        />
        <Route
          path="meetings"
          element={
            <SectionPlaceholder
              title="วาระและรายงานการประชุม"
              description="จัดการวาระประชุม, รายงานการประชุม และสรุปผลแต่ละครั้ง"
            />
          }
        />
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

function CommitteeDashboardPage() {
  const requestTrend = [
    { label: 'Mon', value: 4 },
    { label: 'Tue', value: 8 },
    { label: 'Wed', value: 6 },
    { label: 'Thu', value: 10 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 3 },
    { label: 'Sun', value: 7 },
  ]

  const meetings = [
    { topic: 'วาระการเงินประจำเดือน', time: '09:30', status: 'ready' },
    { topic: 'โครงการสนับสนุนโรงเรียน', time: '10:30', status: 'pending_vote' },
    { topic: 'อัปเดตทะเบียนสมาชิก', time: '11:15', status: 'in_review' },
  ]

  return (
    <div className="space-y-4">
      <MetricCards
        items={[
          { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'อัปเดตล่าสุดตามทะเบียนสมาชิก' },
          { label: 'คำร้องรอดำเนินการ', value: '18', hint: 'pending_president + pending_admin' },
          { label: 'ผู้ลงทะเบียนประชุม', value: '29/35', hint: 'เทียบกับ quorum ที่กำหนด' },
          { label: 'วาระรอลงมติ', value: '6', hint: 'พร้อมเปิด vote ในที่ประชุม' },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">แนวโน้มคำร้อง 7 วัน</h3>
          <p className="mt-2 text-sm text-slate-400">ใช้ติดตาม backlog ของคำร้องและคาดการณ์ภาระงานทีมอนุมัติ</p>
          <TrendBars items={requestTrend} />
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
          {meetings.map((meeting) => (
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
