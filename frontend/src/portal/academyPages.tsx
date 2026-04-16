import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'

export function AcademyArea() {
  const navItems = [
    { to: '/academy/dashboard', label: 'Dashboard' },
    { to: '/academy/students', label: 'นักเรียน/ห้องเรียน' },
    { to: '/academy/courses', label: 'คอร์สเรียน' },
    { to: '/academy/enrollment', label: 'สมัครเรียน' },
    { to: '/academy/results', label: 'ผลการเรียน/คะแนน' },
    { to: '/academy/reports', label: 'รายงาน infographic' },
  ]

  return (
    <PortalShell
      title="Academy Portal"
      subtitle="ผู้บริหาร · ผู้ปกครอง · นักเรียน · ครู · dashboard infographic"
      navItems={navItems}
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AcademyDashboardPage />} />
        <Route
          path="students"
          element={
            <SectionPlaceholder
              title="ข้อมูลนักเรียนและห้องเรียน"
              description="ภาพรวมจำนวนนักเรียนรายห้อง, รายชื่อนักเรียนรายคน, และการกระจายระดับชั้น"
            />
          }
        />
        <Route
          path="courses"
          element={
            <SectionPlaceholder
              title="คอร์สเรียน"
              description="จัดการรายการคอร์สเรียน, รอบเรียน, และข้อมูลครูผู้สอนแต่ละคอร์ส"
            />
          }
        />
        <Route
          path="enrollment"
          element={
            <SectionPlaceholder
              title="สมัครเรียน"
              description="ระบบสมัครเรียน, ตรวจเอกสาร, และติดตามสถานะการสมัคร"
            />
          }
        />
        <Route
          path="results"
          element={
            <SectionPlaceholder
              title="ผลการเรียนและคะแนน"
              description="ผลการเรียนรายบุคคล, คะแนนรายวิชา, และสรุปผลสัมฤทธิ์"
            />
          }
        />
        <Route
          path="reports"
          element={
            <SectionPlaceholder
              title="รายงานเชิง infographic"
              description="dashboard สำหรับผู้บริหาร ครู นักเรียน และผู้ปกครองตามสิทธิ์การเข้าถึง"
            />
          }
        />
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </PortalShell>
  )
}

function AcademyDashboardPage() {
  const classes = [
    { room: 'ม.4 ห้อง A', students: 38, avgScore: 84.2 },
    { room: 'ม.5 ห้อง B', students: 42, avgScore: 81.5 },
    { room: 'ม.6 ห้อง C', students: 34, avgScore: 86.7 },
  ]

  const enrollmentFunnel = [
    { label: 'สมัครใหม่', value: 120 },
    { label: 'ยืนยันเอกสาร', value: 92 },
    { label: 'ชำระเงิน', value: 78 },
    { label: 'เข้าเรียนแล้ว', value: 71 },
  ]

  return (
    <div className="space-y-4">
      <MetricCards
        items={[
          { label: 'นักเรียนทั้งหมด', value: '862', hint: 'รวมทุกห้องและทุกระดับ' },
          { label: 'ห้องเรียนที่เปิด', value: '24', hint: 'ห้องที่มี active schedule' },
          { label: 'คอร์สที่เปิด', value: '31', hint: 'คอร์สที่เปิดรับสมัครอยู่' },
          { label: 'ค่าเฉลี่ยผลการเรียน', value: '82.4', hint: 'คะแนนเฉลี่ยรวมทุกวิชา' },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลคะแนนเฉลี่ยตามห้อง</h3>
          <p className="mt-2 text-sm text-slate-400">ดูคุณภาพการเรียนรายห้องเพื่อวางแผนเสริมจุดอ่อน</p>
          <div className="mt-4 space-y-2 text-sm">
            {classes.map((row) => (
              <div key={row.room} className="rounded border border-slate-800 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-100">{row.room}</p>
                  <p className="text-xs text-slate-400">{row.students} คน</p>
                </div>
                <div className="mt-2 h-2 rounded bg-slate-800">
                  <div className="h-full rounded bg-cyan-500/80" style={{ width: `${Math.min(100, row.avgScore)}%` }} />
                </div>
                <p className="mt-1 text-xs text-cyan-200">คะแนนเฉลี่ย {row.avgScore}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">Funnel สมัครเรียน</h3>
          <TrendBars items={enrollmentFunnel} color="violet" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/academy/enrollment" className="rounded bg-violet-800 px-3 py-1.5 text-xs text-white hover:bg-violet-700">
              ไปหน้าสมัครเรียน
            </Link>
            <Link to="/academy/reports" className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
              ดูรายงานทั้งหมด
            </Link>
          </div>
        </section>
      </div>
      <SectionPlaceholder
        title="Role-based infographic"
        description="รองรับการแสดงผลต่างกันตามสิทธิ์: ผู้บริหารเห็นภาพรวมทั้งหมด, ครูเห็นห้องที่สอน, นักเรียน/ผู้ปกครองเห็นข้อมูลรายบุคคล"
      />
    </div>
  )
}

function NotFoundInline() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
      ไม่พบหน้าที่ร้องขอภายในพอร์ทัลโรงเรียนกวดวิชา
    </section>
  )
}
