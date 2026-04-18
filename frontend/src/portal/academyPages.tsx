import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { formatThbShort, totalStudentsInClasses, weightedAverageFromClasses } from './academyMath'
import { type AcademyPortalData, type AcademyRoleView, type PortalDataState, useAcademyPortalData } from './dataAdapter'
import { portalFocusRing, portalNotFoundScopeLabel } from './portalLabels'
import {
  MetricCards,
  PortalContentLoading,
  PortalNotFound,
  PortalSectionHeader,
  PortalShell,
  PortalSnapshotStatusRow,
  PortalSnapshotToolbar,
  TrendBars,
} from './ui'

export function AcademyArea(props: { apiBase: string }) {
  const [roleView, setRoleView] = useState<AcademyRoleView>('admin')
  const portalData = useAcademyPortalData(props.apiBase)
  const roleViewSummaryId = 'academy-role-view-summary'
  const navItems = [
    { to: '/academy/dashboard', label: 'แดชบอร์ด', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/students', label: 'นักเรียน/ห้องเรียน', roles: ['admin', 'teacher'] as AcademyRoleView[] },
    { to: '/academy/courses', label: 'คอร์สเรียน', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/enrollment', label: 'สมัครเรียน', roles: ['admin', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/results', label: 'ผลการเรียน/คะแนน', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/reports', label: 'รายงานอินโฟกราฟิก', roles: ['admin', 'teacher'] as AcademyRoleView[] },
  ]
  const visibleNavItems = navItems.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))
  const roleViewLabel =
    roleView === 'admin'
      ? 'ผู้บริหารโรงเรียน'
      : roleView === 'teacher'
        ? 'ครู'
        : roleView === 'student'
          ? 'นักเรียน'
          : 'ผู้ปกครอง'

  return (
    <PortalShell
      title="พอร์ทัลโรงเรียนกวดวิชา (Academy)"
      subtitle="ผู้บริหาร · ผู้ปกครอง · นักเรียน · ครู · แดชบอร์ดอินโฟกราฟิก (ตามบทบาท)"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm" aria-busy={portalData.loading}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">มุมมองบทบาท</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as AcademyRoleView)}
            aria-label="เลือกมุมมองบทบาทในพอร์ทัลโรงเรียนกวดวิชา"
            aria-describedby={roleViewSummaryId}
            className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 ${portalFocusRing}`}
          >
            <option value="admin">ผู้บริหารโรงเรียน</option>
            <option value="teacher">ครู</option>
            <option value="student">นักเรียน</option>
            <option value="parent">ผู้ปกครอง</option>
          </select>
          <span className="text-xs text-slate-500">จำลองสิทธิ์การเข้าถึงเมนูภายในพอร์ทัลโรงเรียนกวดวิชา (Academy)</span>
          <span id={roleViewSummaryId} className="text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            บทบาทปัจจุบัน: {roleViewLabel} · เมนูที่เข้าถึงได้ {visibleNavItems.length.toLocaleString('th-TH')} รายการ
          </span>
          <PortalSnapshotToolbar loading={portalData.loading} source={portalData.source} onRefresh={portalData.refetch} />
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AcademyDashboardPage roleView={roleView} portalState={portalData} />} />
        <Route
          path="students"
          element={<AcademyStudentsPage roleView={roleView} portalState={portalData} />}
        />
        <Route path="courses" element={<AcademyCoursesPage portalState={portalData} />} />
        <Route path="enrollment" element={<AcademyEnrollmentPage portalState={portalData} />} />
        <Route path="results" element={<AcademyResultsPage roleView={roleView} portalState={portalData} />} />
        <Route path="reports" element={<AcademyReportsPage roleView={roleView} portalState={portalData} />} />
        <Route path="*" element={<PortalNotFound scopeLabel={portalNotFoundScopeLabel.academy} />} />
      </Routes>
    </PortalShell>
  )
}

function AcademyStudentsPage(props: { roleView: AcademyRoleView; portalState: PortalDataState<AcademyPortalData> }) {
  const { roleView, portalState } = props
  const { data, loading, source } = portalState
  const classes = data.classes
  const cramClassRoster = data.cramClassRoster ?? []
  const rosterForRoom = (room: string) => cramClassRoster.find((c) => c.room === room)?.roster ?? []
  const hasAnyRoster = cramClassRoster.some((c) => c.roster.length > 0)

  if (roleView === 'student' || roleView === 'parent') {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">นักเรียนและห้องเรียน</h3>
        <p className="mt-3 text-sm text-slate-400">
          หน้านี้จัดไว้สำหรับผู้บริหารและครูเป็นหลัก หากต้องการดูข้อมูลส่วนตัวหรือของบุตรหลาน ให้ใช้เมนูที่เกี่ยวข้องเมื่อระบบเชื่อมบัญชีแล้ว
        </p>
        <Link
          to="/academy/dashboard"
          aria-label="กลับไปหน้าแดชบอร์ดโรงเรียนกวดวิชา"
          className={`mt-4 inline-block rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
        >
          กลับไปหน้าแดชบอร์ด
        </Link>
      </section>
    )
  }

  const totalStudents = totalStudentsInClasses(classes)
  const weightedAvg = weightedAverageFromClasses(classes)

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ห้องเรียนและจำนวนนักเรียน</h3>
            <p className="mt-2 text-sm text-slate-400">
              สรุปจากฐานข้อมูลห้องที่เปิดใช้งานและนักเรียนในระบบ — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : classes.length === 0 ? (
          <div
            className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>ยังไม่มีข้อมูลห้องจากระบบ (หรือใช้ข้อมูลจำลองที่ไม่มีรายการห้อง)</p>
            <p className="mt-2">
              ผู้ดูแลสามารถเพิ่มห้องและนักเรียนได้ที่{' '}
              <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบ" className={`rounded-sm text-emerald-400 underline hover:text-emerald-300 ${portalFocusRing}`}>
                ผู้ดูแล (Admin)
              </Link>{' '}
              หลังรัน migration และตั้งค่า API
            </p>
          </div>
        ) : (
          <>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-3"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="สรุปภาพรวมจำนวนนักเรียนและคะแนน"
            >
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">จำนวนห้อง</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{classes.length.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">นักเรียนทั้งหมด</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{totalStudents.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{weightedAvg != null ? weightedAvg : '—'}</p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm" aria-label="ตารางสรุปห้องเรียนและคะแนนเฉลี่ย">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-3">ห้อง</th>
                    <th scope="col" className="py-2 pr-3">จำนวนนักเรียน</th>
                    <th scope="col" className="py-2">คะแนนเฉลี่ยห้อง</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((row, i) => (
                    <tr key={`${row.room}-${i}`} className="border-b border-slate-800/90">
                      <td className="py-2.5 pr-3 text-slate-100">{row.room}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{row.students.toLocaleString('th-TH')}</td>
                      <td className="py-2.5 text-cyan-200">{row.avgScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasAnyRoster ? (
              <div className="mt-8 space-y-3">
                <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายชื่อนักเรียนตามห้อง</h4>
                {classes.map((row, i) => {
                  const roster = rosterForRoom(row.room)
                  if (roster.length === 0) return null
                  return (
                    <details
                      key={`roster-${row.room}-${i}`}
                      aria-label={`รายชื่อนักเรียนห้อง ${row.room}`}
                      className="group rounded-lg border border-slate-800 bg-slate-950/40 open:border-slate-700"
                    >
                      <summary
                        aria-label={`สลับการแสดงรายชื่อนักเรียนห้อง ${row.room}`}
                        className={`cursor-pointer list-none px-3 py-2.5 text-sm text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden ${portalFocusRing}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>{row.room}</span>
                          <span className="text-xs text-slate-500">
                            {roster.length.toLocaleString('th-TH')} คน · คลิกเพื่อขยาย
                          </span>
                        </span>
                      </summary>
                      <ul className="border-t border-slate-800 px-3 py-2 text-sm" role="list" aria-label={`รายชื่อนักเรียนห้อง ${row.room}`}>
                        {roster.map((s, j) => (
                          <li
                            key={`${row.room}-${s.name}-${j}`}
                            className="flex items-center justify-between gap-3 border-b border-slate-800/80 py-2 last:border-0"
                            role="listitem"
                          >
                            <span className="text-slate-200">{s.name}</span>
                            <span className="tabular-nums text-slate-400">
                              {s.avgScore != null ? s.avgScore : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )
                })}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีรายชื่อนักเรียนในสแนปช็อต — เพิ่มนักเรียนได้ที่{' '}
                <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบ" className={`rounded-sm text-emerald-400/90 underline hover:text-emerald-300 ${portalFocusRing}`}>
                  ผู้ดูแล (Admin)
                </Link>{' '}
                (ข้อมูลมาจาก cram_students)
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function AcademyCoursesPage(props: { portalState: PortalDataState<AcademyPortalData> }) {
  const { data, loading, source } = props.portalState
  const schoolCourses = data.schoolCourses ?? []

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">คอร์สเรียน / กิจกรรม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจาก <code className="text-slate-500">school_activities</code> ที่เปิดใช้งาน — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : schoolCourses.length === 0 ? (
          <div
            className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>ยังไม่มีรายการคอร์สในฐานข้อมูล (หรือใช้ข้อมูลจำลองที่ไม่มีรายการ)</p>
            <p className="mt-2 text-xs text-slate-500">
              เพิ่มผ่าน{' '}
              <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบส่วนคอร์สและกิจกรรม" className={`rounded-sm text-amber-400/90 underline hover:text-amber-300 ${portalFocusRing}`}>
                ผู้ดูแล (Admin) → คอร์ส/กิจกรรม
              </Link>{' '}
              หรือแก้ที่ตาราง <code className="text-slate-400">school_activities</code> ใน Supabase
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm" aria-label="ตารางคอร์สและกิจกรรมที่เปิดใช้งาน">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="py-2 pr-3">หมวด</th>
                  <th scope="col" className="py-2 pr-3">ชื่อคอร์ส</th>
                  <th scope="col" className="py-2">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {schoolCourses.map((c) => (
                  <tr key={c.id} className="border-b border-slate-800/90">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">{c.category}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-100">{c.title}</td>
                    <td className="max-w-md py-2.5 text-slate-400">
                      {c.description ? (
                        <span className="line-clamp-2">{c.description}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function AcademyEnrollmentPage(props: { portalState: PortalDataState<AcademyPortalData> }) {
  const { data, loading, source } = props.portalState
  const funnel = data.enrollmentFunnel
  const first = funnel[0]?.value ?? 0
  const last = funnel[funnel.length - 1]?.value ?? 0
  const conversionPct = first > 0 ? Math.round((last / first) * 100) : 0

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สมัครเรียน (ขั้นตอนฟันเนล (Funnel))</h3>
            <p className="mt-2 text-sm text-slate-400">
              สรุปจำนวนตามขั้นจากสแนปช็อต — ใช้เป็นภาพรวมก่อนมีขั้นตอนงานสมัครจริง (เวิร์กโฟลว์ workflow) ในระบบ
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <TrendBars items={funnel} color="violet" />
            <p className="mt-4 text-sm text-slate-400">
              อัตราแปลงโดยประมาณจากขั้นแรกถึงขั้นสุดในขั้นตอนฟันเนล (Funnel):{' '}
              <span className="font-medium text-violet-200">{conversionPct}%</span>
              <span className="text-slate-500"> ({last.toLocaleString('th-TH')} / {first.toLocaleString('th-TH')})</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้ารายงานโรงเรียนกวดวิชา">
              <Link
                to="/academy/courses"
                aria-label="ไปหน้ารายการคอร์สเรียน"
                className={`rounded-lg bg-violet-800 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 ${portalFocusRing}`}
              >
                ดูรายการคอร์ส
              </Link>
              <Link
                to="/academy/reports"
                aria-label="ไปหน้ารายงานสรุปโรงเรียนกวดวิชา"
                className={`rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
              >
                รายงานสรุป
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function AcademyResultsPage(props: { roleView: AcademyRoleView; portalState: PortalDataState<AcademyPortalData> }) {
  const { roleView, portalState } = props
  const { data, loading, source } = portalState
  const classes = data.classes
  const weighted = weightedAverageFromClasses(classes)
  const total = totalStudentsInClasses(classes)

  if (roleView === 'student' || roleView === 'parent') {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลการเรียนและคะแนน</h3>
            <p className="mt-3 text-sm text-slate-400">
              มุมมองรายบุคคลและรายวิชาจะเชื่อมกับบัญชีนักเรียน/ผู้ปกครองเมื่อระบบพร้อม — ตอนนี้ดูภาพรวมได้จากแดชบอร์ดและเมนูที่เกี่ยวข้อง
            </p>
          </div>
        </PortalSectionHeader>
        <Link
          to="/academy/dashboard"
          aria-label="ไปหน้าแดชบอร์ดโรงเรียนกวดวิชา"
          className={`mt-4 inline-block rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
        >
          ไปแดชบอร์ด
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สรุปผลการเรียน (จากสแนปช็อต)</h3>
            <p className="mt-2 text-sm text-slate-400">
              ค่าเฉลี่ยถ่วงน้ำหนักและจำนวนนักเรียนตามห้อง — รายละเอียดรายห้องและรายชื่ออยู่ที่เมนูนักเรียน/ห้องเรียน
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="สรุปผลการเรียนรวมในสแนปช็อต"
            >
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">นักเรียน (รวมจากตารางห้อง)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{total.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-200">{weighted != null ? weighted : '—'}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าสรุปผลการเรียน">
              <Link
                to="/academy/students"
                aria-label="ไปหน้ารายห้องและรายชื่อนักเรียน"
                className={`rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 ${portalFocusRing}`}
              >
                ดูรายห้องและรายชื่อ
              </Link>
              <Link
                to="/academy/dashboard"
                aria-label="ไปหน้าแดชบอร์ดโรงเรียนกวดวิชา"
                className={`rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
              >
                แดชบอร์ด
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function AcademyReportsPage(props: { roleView: AcademyRoleView; portalState: PortalDataState<AcademyPortalData> }) {
  const { roleView, portalState } = props
  const { data, loading, source } = portalState
  const cramPl = data.cramSchoolMonthlyPl
  const cramFinanceCards =
    cramPl !== null
      ? [
          { label: 'รายรับ (cram_school)', value: formatThbShort(cramPl.revenue), hint: 'journal เดือนนี้' },
          { label: 'รายจ่าย (cram_school)', value: formatThbShort(cramPl.expense), hint: 'journal เดือนนี้' },
          { label: 'คงเหลือสุทธิ', value: formatThbShort(cramPl.netIncome), hint: 'รายรับ − รายจ่าย' },
        ]
      : []

  const roleHint =
    roleView === 'admin'
      ? 'ภาพรวมผู้บริหาร'
      : roleView === 'teacher'
        ? 'เน้นห้องเรียนและผลการเรียน'
        : roleView === 'student'
          ? 'มุมมองนักเรียน (จำลอง)'
          : 'มุมมองผู้ปกครอง (จำลอง)'

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">รายงานสรุป</h3>
            <p className="mt-2 text-sm text-slate-400">{roleHint}</p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">ตัวชี้วัดหลัก</p>
              <div className="mt-2">
                <MetricCards items={data.metricCards} />
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ขั้นตอนสมัครเรียน (ฟันเนล Funnel)</p>
              <TrendBars items={data.enrollmentFunnel} color="cyan" />
            </div>
            {cramFinanceCards.length > 0 ? (
              <div className="mt-6 rounded-lg border border-violet-900/40 bg-violet-950/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-200">การเงินหน่วยงาน cram_school</p>
                <div className="mt-3">
                  <MetricCards items={cramFinanceCards} />
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้ารายงานโรงเรียนกวดวิชา">
              <Link
                to="/academy/enrollment"
                aria-label="ไปหน้าขั้นตอนสมัครเรียนแบบฟันเนล"
                className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 ${portalFocusRing}`}
              >
                ขั้นตอนสมัคร (ฟันเนล Funnel)
              </Link>
              <Link to="/academy/students" aria-label="ไปหน้าห้องเรียนและรายชื่อนักเรียน" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
                ห้อง / นักเรียน
              </Link>
              <Link to="/academy/courses" aria-label="ไปหน้าคอร์สเรียนและกิจกรรม" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
                คอร์ส
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function AcademyDashboardPage(props: { roleView: AcademyRoleView; portalState: PortalDataState<AcademyPortalData> }) {
  const { data, loading, source } = props.portalState
  const roleSummary =
    props.roleView === 'admin'
      ? 'ผู้บริหารเห็นภาพรวมทั้งหมด'
      : props.roleView === 'teacher'
        ? 'ครูเห็นข้อมูลห้องเรียนและผลการเรียนที่รับผิดชอบ'
        : props.roleView === 'student'
          ? 'นักเรียนเห็นข้อมูลส่วนตัว/คอร์ส/ผลคะแนนของตน'
          : 'ผู้ปกครองเห็นข้อมูลของบุตรหลานและความคืบหน้า'

  const roleCards = data.roleCards[props.roleView]
  const cramPl = data.cramSchoolMonthlyPl
  const cramFinanceCards =
    cramPl !== null
      ? [
          {
            label: 'รายรับ (cram_school)',
            value: formatThbShort(cramPl.revenue),
            hint: 'จากบัญชีแยกประเภท — สมุดรายวัน (journal) เดือนนี้',
          },
          {
            label: 'รายจ่าย (cram_school)',
            value: formatThbShort(cramPl.expense),
            hint: 'จากบัญชีแยกประเภท — สมุดรายวัน (journal) เดือนนี้',
          },
          {
            label: 'คงเหลือสุทธิ',
            value: formatThbShort(cramPl.netIncome),
            hint: 'รายรับ − รายจ่าย (cram_school)',
          },
        ]
      : []

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4" aria-busy={loading}>
        <PortalSnapshotStatusRow loading={loading} source={source}>
          <p className="text-sm text-slate-200" role="status" aria-live="polite" aria-atomic="true">
            {roleSummary}
          </p>
        </PortalSnapshotStatusRow>
      </section>
      <MetricCards items={data.metricCards} />
      <MetricCards items={roleCards} />
      {cramFinanceCards.length > 0 ? (
        <section className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-4" aria-busy={loading}>
          <h3 className="text-sm font-medium uppercase tracking-wide text-violet-200">การเงินโรงเรียนกวดวิชา (นิติบุคคล)</h3>
          <p className="mt-1 text-xs text-violet-300/80">ยอดจากสมุดรายวัน (journal) เดือนปัจจุบัน — แยกจากสมาคมศิษย์เก่า</p>
          <div className="mt-3">
            <MetricCards items={cramFinanceCards} />
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลคะแนนเฉลี่ยตามห้อง</h3>
          <p className="mt-2 text-sm text-slate-400">ดูคุณภาพการเรียนรายห้องเพื่อวางแผนเสริมจุดอ่อน</p>
          {data.classes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500" role="status" aria-live="polite" aria-atomic="true">
              ยังไม่มีข้อมูลห้องเรียนจากสแนปช็อต (เช่น ยังไม่มีข้อมูลห้องที่เปิดใช้งานใน `cram_classrooms`)
            </p>
          ) : (
            <div className="mt-4 space-y-2 text-sm" role="list" aria-label="ผลคะแนนเฉลี่ยรายห้อง">
              {data.classes.map((row) => (
                <div key={row.room} className="rounded border border-slate-800 px-3 py-2" role="listitem">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-slate-100">{row.room}</p>
                    <p className="text-xs text-slate-400">{row.students.toLocaleString('th-TH')} คน</p>
                  </div>
                  <div
                    className="mt-2 h-2 rounded bg-slate-800"
                    role="progressbar"
                    aria-label={`คะแนนเฉลี่ยของห้อง ${row.room}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, row.avgScore)}
                    aria-valuetext={`คะแนนเฉลี่ย ${Math.min(100, row.avgScore)}`}
                  >
                    <div className="h-full rounded bg-cyan-500/80" style={{ width: `${Math.min(100, row.avgScore)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-cyan-200">คะแนนเฉลี่ย {row.avgScore}</p>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ขั้นตอนฟันเนลสมัครเรียน (Funnel)</h3>
          <TrendBars items={data.enrollmentFunnel} color="violet" />
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าฟันเนลและรายงาน">
            <Link
              to="/academy/enrollment"
              aria-label="ไปหน้าสมัครเรียน"
              className={`rounded bg-violet-800 px-3 py-1.5 text-xs text-white hover:bg-violet-700 ${portalFocusRing}`}
            >
              ไปหน้าสมัครเรียน
            </Link>
            <Link
              to="/academy/reports"
              aria-label="ไปหน้ารายงานทั้งหมดของโรงเรียนกวดวิชา"
              className={`rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">มุมมองตามบทบาท</h3>
        <p className="mt-2 text-sm text-slate-400">
          สรุปสิ่งที่แต่ละบทบาทใช้ในเมนูโรงเรียนกวดวิชา (Academy) — ข้อมูลตัวเลขด้านบนมาจากสแนปช็อตเดียวกัน แต่ละบทบาทเห็นเมนูย่อยต่างกัน
        </p>
        <div className="mt-4 rounded-lg border border-cyan-900/35 bg-cyan-950/20 px-4 py-3">
          <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-300" role="list" aria-label="สรุปสิทธิ์ใช้งานตามบทบาทในพอร์ทัล Academy">
            {academyRoleBullets(props.roleView).map((line) => (
              <li key={line} role="listitem">
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้ามุมมองตามบทบาทของ Academy">
          <Link
            to="/academy/students"
            aria-label="ไปหน้าห้องเรียนและนักเรียน"
            className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
          >
            ห้อง / นักเรียน
          </Link>
          <Link to="/academy/courses" aria-label="ไปหน้าคอร์สเรียน" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            คอร์ส
          </Link>
          <Link to="/academy/reports" aria-label="ไปหน้ารายงานอินโฟกราฟิก" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            รายงาน
          </Link>
        </div>
      </section>
    </div>
  )
}

function academyRoleBullets(role: AcademyRoleView): string[] {
  switch (role) {
    case 'admin':
      return [
        'เห็นเมตริกภาพรวม การเงิน cram_school (ถ้ามีข้อมูลสมุดรายวัน journal) และฟันเนลสมัครเรียน (Funnel)',
        'เข้าถึงห้องเรียน คอร์ส รายงาน และผลการเรียนทั้งระบบ',
        'ใช้ข้อมูลเพื่อวางแผนรับนักเรียนและติดตามคุณภาพ',
      ]
    case 'teacher':
      return [
        'โฟกัสห้องเรียนและคะแนนเฉลี่ยที่เกี่ยวข้องกับการสอน',
        'ติดตามผลการเรียนและประสานกับผู้บริหารผ่านหน้ารายงาน',
        'เมนูนักเรียน/ห้องเรียนและผลการเรียนเปิดให้ใช้งาน',
      ]
    case 'student':
      return [
        'มุมมองจำลอง: เน้นคอร์ส การสมัครเรียน และผลคะแนนของตนเอง',
        'ใช้เมนูสมัครเรียนและผลการเรียนเมื่อเชื่อมบัญชีจริงในอนาคต',
      ]
    case 'parent':
      return [
        'มุมมองจำลอง: ติดตามความคืบหน้าและข้อมูลบุตรหลาน',
        'ใช้เมนูสมัครเรียนและผลการเรียนเมื่อเชื่อมบัญชีผู้ปกครอง',
      ]
    default:
      return []
  }
}

