import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'
import { type AcademyPortalData, type AcademyRoleView, useAcademyPortalData } from './dataAdapter'

export function AcademyArea(props: { apiBase: string }) {
  const [roleView, setRoleView] = useState<AcademyRoleView>('admin')
  const portalData = useAcademyPortalData(props.apiBase)
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
          <span className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
            data: {portalData.loading ? 'loading...' : portalData.source}
          </span>
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AcademyDashboardPage roleView={roleView} portalData={portalData.data} />} />
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

function AcademyDashboardPage(props: { roleView: AcademyRoleView; portalData: AcademyPortalData }) {
  const roleSummary =
    props.roleView === 'admin'
      ? 'ผู้บริหารเห็นภาพรวมทั้งหมด'
      : props.roleView === 'teacher'
        ? 'ครูเห็นข้อมูลห้องเรียนและผลการเรียนที่รับผิดชอบ'
        : props.roleView === 'student'
          ? 'นักเรียนเห็นข้อมูลส่วนตัว/คอร์ส/ผลคะแนนของตน'
          : 'ผู้ปกครองเห็นข้อมูลของบุตรหลานและความคืบหน้า'

  const roleCards = props.portalData.roleCards[props.roleView]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm text-slate-200">{roleSummary}</p>
      </section>
      <MetricCards items={props.portalData.metricCards} />
      <MetricCards items={roleCards} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลคะแนนเฉลี่ยตามห้อง</h3>
          <p className="mt-2 text-sm text-slate-400">ดูคุณภาพการเรียนรายห้องเพื่อวางแผนเสริมจุดอ่อน</p>
          <div className="mt-4 space-y-2 text-sm">
            {props.portalData.classes.map((row) => (
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
          <TrendBars items={props.portalData.enrollmentFunnel} color="violet" />
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
