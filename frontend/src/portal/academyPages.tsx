import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'

type AcademyRoleView = 'admin' | 'teacher' | 'student' | 'parent'

export function AcademyArea() {
  const [roleView, setRoleView] = useState<AcademyRoleView>('admin')
  const navItems = [
    { to: '/academy/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/students', label: 'นักเรียน/ห้องเรียน', roles: ['admin', 'teacher'] as AcademyRoleView[] },
    { to: '/academy/courses', label: 'คอร์สเรียน', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/enrollment', label: 'สมัครเรียน', roles: ['admin', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/results', label: 'ผลการเรียน/คะแนน', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/reports', label: 'รายงาน infographic', roles: ['admin', 'teacher'] as AcademyRoleView[] },
  ]
  const visibleNavItems = navItems.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))

  return (
    <PortalShell
      title="Academy Portal"
      subtitle="ผู้บริหาร · ผู้ปกครอง · นักเรียน · ครู · dashboard infographic (role-based)"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Role view</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as AcademyRoleView)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
          >
            <option value="admin">ผู้บริหารโรงเรียน</option>
            <option value="teacher">ครู</option>
            <option value="student">นักเรียน</option>
            <option value="parent">ผู้ปกครอง</option>
          </select>
          <span className="text-xs text-slate-500">จำลองสิทธิ์การเข้าถึงเมนูภายใน academy</span>
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AcademyDashboardPage roleView={roleView} />} />
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

function AcademyDashboardPage(props: { roleView: AcademyRoleView }) {
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

  const roleSummary =
    props.roleView === 'admin'
      ? 'ผู้บริหารเห็นภาพรวมทั้งหมด'
      : props.roleView === 'teacher'
        ? 'ครูเห็นข้อมูลห้องเรียนและผลการเรียนที่รับผิดชอบ'
        : props.roleView === 'student'
          ? 'นักเรียนเห็นข้อมูลส่วนตัว/คอร์ส/ผลคะแนนของตน'
          : 'ผู้ปกครองเห็นข้อมูลของบุตรหลานและความคืบหน้า'

  const roleCards =
    props.roleView === 'admin'
      ? [
          { label: 'นักเรียนใหม่เดือนนี้', value: '74', hint: 'แนวโน้มการสมัครรายเดือน' },
          { label: 'อัตราชำระครบ', value: '86%', hint: 'สถานะค่าใช้จ่ายรวมทุกคอร์ส' },
        ]
      : props.roleView === 'teacher'
        ? [
            { label: 'ชั้นเรียนที่รับผิดชอบ', value: '6', hint: 'ห้องเรียน active ของครู' },
            { label: 'งานตรวจคะแนนค้าง', value: '24', hint: 'รายการที่ต้องตรวจวันนี้' },
          ]
        : props.roleView === 'student'
          ? [
              { label: 'คอร์สที่ลงทะเบียน', value: '4', hint: 'คอร์สที่กำลังเรียนอยู่' },
              { label: 'คะแนนเฉลี่ยของฉัน', value: '83.6', hint: 'คำนวณจากทุกวิชาล่าสุด' },
            ]
          : [
              { label: 'บุตรหลานที่ดูแล', value: '2', hint: 'บัญชีที่เชื่อมกับผู้ปกครอง' },
              { label: 'แจ้งเตือนผลการเรียนใหม่', value: '3', hint: 'อัปเดตที่ยังไม่อ่าน' },
            ]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm text-slate-200">{roleSummary}</p>
      </section>
      <MetricCards
        items={[
          { label: 'นักเรียนทั้งหมด', value: '862', hint: 'รวมทุกห้องและทุกระดับ' },
          { label: 'ห้องเรียนที่เปิด', value: '24', hint: 'ห้องที่มี active schedule' },
          { label: 'คอร์สที่เปิด', value: '31', hint: 'คอร์สที่เปิดรับสมัครอยู่' },
          { label: 'ค่าเฉลี่ยผลการเรียน', value: '82.4', hint: 'คะแนนเฉลี่ยรวมทุกวิชา' },
        ]}
      />
      <MetricCards items={roleCards} />
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
