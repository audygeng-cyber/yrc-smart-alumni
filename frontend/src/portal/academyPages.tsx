import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { themeAccent } from '../lib/themeTokens'
import { formatThbShort, totalStudentsInClasses, weightedAverageFromClasses } from './academyMath'
import { type AcademyPortalData, type AcademyRoleView, type PortalDataState, useAcademyPortalData } from './dataAdapter'
import { portalAccent, portalFocusRing, portalNotFoundScopeLabel } from './portalLabels'
import {
  MetricCards,
  PortalContentLoading,
  PortalNotFound,
  PortalSectionHeader,
  PortalShell,
  PortalSnapshotStatusRow,
  TrendBars,
} from './ui'

/** จำกัดความสูงรายการยาวในพอร์ทัล Academy — เลื่อนในกรอบ ไม่ดันหน้าทั้งหมด */
const academyPortalScrollList =
  'max-h-[min(45dvh,22rem)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-width:thin]'

const academyJumpLinkClass = `rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800 ${portalFocusRing}`

export function AcademyArea(props: { apiBase: string }) {
  const [roleView, setRoleView] = useState<AcademyRoleView>('admin')
  const portalData = useAcademyPortalData(props.apiBase)
  const roleViewSummaryId = 'academy-role-view-summary'
  const navItems = [
    { to: '/academy/dashboard', label: 'แดชบอร์ด', shortLabel: 'แดชบอร์ด', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    {
      to: '/academy/students',
      label: 'นักเรียน/ห้องเรียน',
      shortLabel: 'ห้อง/นักเรียน',
      roles: ['admin', 'teacher'] as AcademyRoleView[],
    },
    { to: '/academy/courses', label: 'คอร์สเรียน', shortLabel: 'คอร์ส', roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[] },
    { to: '/academy/enrollment', label: 'สมัครเรียน', shortLabel: 'สมัครเรียน', roles: ['admin', 'student', 'parent'] as AcademyRoleView[] },
    {
      to: '/academy/results',
      label: 'ผลการเรียน/คะแนน',
      shortLabel: 'ผลเรียน',
      roles: ['admin', 'teacher', 'student', 'parent'] as AcademyRoleView[],
    },
    { to: '/academy/reports', label: 'รายงานอินโฟกราฟิก', shortLabel: 'รายงาน', roles: ['admin', 'teacher'] as AcademyRoleView[] },
  ]
  const visibleNavItems = navItems
    .filter((item) => item.roles.includes(roleView))
    .map((item) => ({ to: item.to, label: item.label, shortLabel: item.shortLabel }))
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
      subtitle="ผู้บริหาร ครู นักเรียน ผู้ปกครอง — แดชบอร์ดและรายงานตามบทบาท (เลือกเมนูด้านบน)"
      navItems={visibleNavItems}
    >
      <section className="mb-3 min-w-0 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-sm sm:mb-4 sm:p-3" aria-busy={portalData.loading}>
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">มุมมองบทบาท</span>
            <select
              value={roleView}
              onChange={(e) => setRoleView(e.target.value as AcademyRoleView)}
              aria-label="เลือกมุมมองบทบาทในพอร์ทัลโรงเรียนกวดวิชา"
              aria-describedby={roleViewSummaryId}
              className={`min-w-0 max-w-full flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 sm:flex-none sm:py-1 sm:text-xs ${portalFocusRing}`}
            >
              <option value="admin">ผู้บริหารโรงเรียน</option>
              <option value="teacher">ครู</option>
              <option value="student">นักเรียน</option>
              <option value="parent">ผู้ปกครอง</option>
            </select>
          </div>
          <span className="hidden text-xs text-slate-500 lg:inline">จำลองสิทธิ์เมนูภายใน Academy</span>
          <span
            id={roleViewSummaryId}
            className="min-w-0 text-xs leading-snug text-slate-400 sm:max-w-[min(100%,28rem)]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sm:hidden">
              {roleViewLabel} · {visibleNavItems.length.toLocaleString('th-TH')} เมนู
            </span>
            <span className="hidden sm:inline">
              บทบาทปัจจุบัน: {roleViewLabel} · เมนูที่เข้าถึงได้ {visibleNavItems.length.toLocaleString('th-TH')} รายการ
            </span>
          </span>
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
      <section className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
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
    <div className="min-w-0 space-y-4">
      {loading ? (
        <section className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
          <PortalSectionHeader loading={loading} source={source}>
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ห้องเรียนและจำนวนนักเรียน</h3>
              <p className="mt-2 text-sm text-slate-400">
                สรุปจากฐานข้อมูลห้องที่เปิดใช้งานและนักเรียนในระบบ — อัปเดตเมื่อโหลดพอร์ทัล
              </p>
            </div>
          </PortalSectionHeader>
          <PortalContentLoading />
        </section>
      ) : classes.length === 0 ? (
        <section className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
          <PortalSectionHeader loading={loading} source={source}>
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ห้องเรียนและจำนวนนักเรียน</h3>
              <p className="mt-2 text-sm text-slate-400">
                สรุปจากฐานข้อมูลห้องที่เปิดใช้งานและนักเรียนในระบบ — อัปเดตเมื่อโหลดพอร์ทัล
              </p>
            </div>
          </PortalSectionHeader>
          <div
            className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>ยังไม่มีข้อมูลห้องจากระบบ (หรือใช้ข้อมูลจำลองที่ไม่มีรายการห้อง)</p>
            <p className="mt-2">
              ผู้ดูแลสามารถเพิ่มห้องและนักเรียนได้ที่{' '}
              <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบ" className={`rounded-sm text-fuchsia-400 underline hover:text-fuchsia-300 ${portalFocusRing}`}>
                ผู้ดูแล (Admin)
              </Link>{' '}
              หลังรัน migration และตั้งค่า API
            </p>
          </div>
        </section>
      ) : (
        <>
          <nav
            className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
            aria-label="ข้ามไปยังส่วนของหน้านักเรียนและห้องเรียน"
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
            <div className="flex flex-wrap gap-2">
              <a href="#academy-students-summary" className={academyJumpLinkClass}>
                สรุป
              </a>
              <a href="#academy-students-table" className={academyJumpLinkClass}>
                ตารางห้อง
              </a>
              {hasAnyRoster ? (
                <a href="#academy-students-roster" className={academyJumpLinkClass}>
                  รายชื่อ
                </a>
              ) : null}
            </div>
          </nav>

          <section
            id="academy-students-summary"
            className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
            aria-busy={loading}
          >
            <PortalSectionHeader loading={loading} source={source}>
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ห้องเรียนและจำนวนนักเรียน</h3>
                <p className="mt-2 text-sm text-slate-400">
                  สรุปจากฐานข้อมูลห้องที่เปิดใช้งานและนักเรียนในระบบ — อัปเดตเมื่อโหลดพอร์ทัล
                </p>
              </div>
            </PortalSectionHeader>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-3"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="สรุปภาพรวมจำนวนนักเรียนและคะแนน"
            >
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">จำนวนห้อง</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{classes.length.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">นักเรียนทั้งหมด</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{totalStudents.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{weightedAvg != null ? weightedAvg : '—'}</p>
              </div>
            </div>
          </section>

          <section
            id="academy-students-table"
            className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
            aria-label="ตารางสรุปห้องเรียนและคะแนนเฉลี่ย"
          >
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">ตารางสรุปรายห้อง</h4>
            <div className="mt-3 overflow-x-auto">
              <div className={classes.length > 5 ? academyPortalScrollList : undefined}>
                <table className="w-full min-w-[420px] text-left text-sm" aria-label="ตารางสรุปห้องเรียนและคะแนนเฉลี่ย">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                      <th scope="col" className="py-2 pr-3">
                        ห้อง
                      </th>
                      <th scope="col" className="py-2 pr-3">
                        จำนวนนักเรียน
                      </th>
                      <th scope="col" className="py-2">
                        คะแนนเฉลี่ยห้อง
                      </th>
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
            </div>
          </section>

          {hasAnyRoster ? (
            <section
              id="academy-students-roster"
              className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
              aria-label="รายชื่อนักเรียนตามห้อง"
            >
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายชื่อนักเรียนตามห้อง</h4>
              <div className="mt-3 space-y-3">
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
                          <span className="text-xs text-slate-400">
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
            </section>
          ) : (
            <p className="mt-4 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
              ยังไม่มีรายชื่อนักเรียนในสแนปช็อต — เพิ่มนักเรียนได้ที่{' '}
              <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบ" className={`rounded-sm text-fuchsia-400/90 underline hover:text-fuchsia-300 ${portalFocusRing}`}>
                ผู้ดูแล (Admin)
              </Link>{' '}
              (ข้อมูลมาจาก cram_students)
            </p>
          )}
        </>
      )}
    </div>
  )
}

function AcademyCoursesPage(props: { portalState: PortalDataState<AcademyPortalData> }) {
  const { data, loading, source } = props.portalState
  const schoolCourses = data.schoolCourses ?? []

  return (
    <div className="min-w-0 space-y-4">
      {!loading && schoolCourses.length > 0 ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
          aria-label="ข้ามไปยังส่วนของหน้าคอร์สเรียน"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#academy-courses-intro" className={academyJumpLinkClass}>
              หัวข้อ
            </a>
            <a href="#academy-courses-table" className={academyJumpLinkClass}>
              ตารางรายการ
            </a>
          </div>
        </nav>
      ) : null}

      <section id="academy-courses-intro" className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">คอร์สเรียน / กิจกรรม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจาก <code className="text-slate-400">school_activities</code> ที่เปิดใช้งาน (กองสมาคมหรือกวดวิชา — ไม่รวมกองโรงเรียนยุพราชที่ใช้ในหน้าบริจาคสมาชิก) — อัปเดตเมื่อโหลดพอร์ทัล
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
            <p className="mt-2 text-xs text-slate-400">
              เพิ่มผ่าน{' '}
              <Link to="/admin" aria-label="ไปหน้าแผงผู้ดูแลระบบส่วนคอร์สและกิจกรรม" className={`rounded-sm text-amber-400/90 underline hover:text-amber-300 ${portalFocusRing}`}>
                ผู้ดูแล (Admin) → คอร์ส/กิจกรรม
              </Link>{' '}
              หรือแก้ที่ตาราง <code className="text-slate-400">school_activities</code> ใน Supabase
            </p>
          </div>
        ) : null}
      </section>

      {!loading && schoolCourses.length > 0 ? (
        <section
          id="academy-courses-table"
          className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
          aria-label="ตารางคอร์สและกิจกรรมที่เปิดใช้งาน"
        >
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายการคอร์สทั้งหมด</h4>
          <div className="mt-3 overflow-x-auto">
            <div className={schoolCourses.length > 6 ? academyPortalScrollList : undefined}>
              <table className="w-full min-w-[480px] text-left text-sm" aria-label="ตารางคอร์สและกิจกรรมที่เปิดใช้งาน">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                    <th scope="col" className="py-2 pr-3">
                      หมวด
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      ชื่อคอร์ส
                    </th>
                    <th scope="col" className="py-2">
                      รายละเอียด
                    </th>
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
          </div>
        </section>
      ) : null}
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
    <div className="min-w-0 space-y-4">
      {!loading ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
          aria-label="ข้ามไปยังส่วนของหน้าสมัครเรียน"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#academy-enrollment-funnel" className={academyJumpLinkClass}>
              ฟันเนล
            </a>
            <a href="#academy-enrollment-shortcuts" className={academyJumpLinkClass}>
              ทางลัด
            </a>
          </div>
        </nav>
      ) : null}

      <section
        id="academy-enrollment-funnel"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
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
              <span className="text-slate-400">
                {' '}
                ({last.toLocaleString('th-TH')} / {first.toLocaleString('th-TH')})
              </span>
            </p>
          </>
        )}
      </section>

      {!loading ? (
        <div
          id="academy-enrollment-shortcuts"
          className="scroll-mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-4"
          role="group"
          aria-label="ลิงก์ทางลัดหน้ารายงานโรงเรียนกวดวิชา"
        >
          <Link
            to="/academy/courses"
            aria-label="ไปหน้ารายการคอร์สเรียน"
            className={`tap-target inline-flex items-center rounded-lg px-4 py-2 text-xs font-medium text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
          >
            ดูรายการคอร์ส
          </Link>
          <Link
            to="/academy/reports"
            aria-label="ไปหน้ารายงานสรุปโรงเรียนกวดวิชา"
            className={`tap-target inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            รายงานสรุป
          </Link>
        </div>
      ) : null}
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
      <section className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
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
    <div className="min-w-0 space-y-4">
      {!loading ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
          aria-label="ข้ามไปยังส่วนของหน้าสรุปผลการเรียน"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#academy-results-summary" className={academyJumpLinkClass}>
              สรุปตัวเลข
            </a>
            <a href="#academy-results-shortcuts" className={academyJumpLinkClass}>
              ทางลัด
            </a>
          </div>
        </nav>
      ) : null}

      <section
        id="academy-results-summary"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
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
          <div
            className="mt-4 grid gap-3 sm:grid-cols-2"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label="สรุปผลการเรียนรวมในสแนปช็อต"
          >
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">นักเรียน (รวมจากตารางห้อง)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{total.toLocaleString('th-TH')}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">{weighted != null ? weighted : '—'}</p>
            </div>
          </div>
        )}
      </section>

      {!loading ? (
        <div
          id="academy-results-shortcuts"
          className="scroll-mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-4"
          role="group"
          aria-label="ลิงก์ทางลัดหน้าสรุปผลการเรียน"
        >
          <Link
            to="/academy/students"
            aria-label="ไปหน้ารายห้องและรายชื่อนักเรียน"
            className={`tap-target inline-flex items-center rounded-lg px-4 py-2 text-xs font-medium text-white ${portalAccent.button} ${portalFocusRing}`}
          >
            ดูรายห้องและรายชื่อ
          </Link>
          <Link
            to="/academy/dashboard"
            aria-label="ไปหน้าแดชบอร์ดโรงเรียนกวดวิชา"
            className={`tap-target inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            แดชบอร์ด
          </Link>
        </div>
      ) : null}
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
    <div className="min-w-0 space-y-4">
      {!loading ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs xl:hidden"
          aria-label="ข้ามไปยังส่วนของหน้ารายงานสรุป Academy"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#academy-reports-metrics" className={academyJumpLinkClass}>
              ตัวชี้วัด
            </a>
            <a href="#academy-reports-funnel" className={academyJumpLinkClass}>
              ฟันเนล
            </a>
            {cramFinanceCards.length > 0 ? (
              <a href="#academy-reports-finance" className={academyJumpLinkClass}>
                การเงิน
              </a>
            ) : null}
            <a href="#academy-reports-shortcuts" className={academyJumpLinkClass}>
              ทางลัด
            </a>
          </div>
        </nav>
      ) : null}

      <section
        id="academy-reports-metrics"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
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
            <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">ตัวชี้วัดหลัก</p>
            <div className="mt-2">
              <MetricCards items={data.metricCards} />
            </div>
          </>
        )}
      </section>

      {!loading ? (
        <>

          <section id="academy-reports-funnel" className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ขั้นตอนสมัครเรียน (ฟันเนล Funnel)</p>
            <TrendBars items={data.enrollmentFunnel} color="cyan" />
          </section>

          {cramFinanceCards.length > 0 ? (
            <section
              id="academy-reports-finance"
              className="scroll-mt-4 rounded-lg border border-violet-900/40 bg-violet-950/15 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-violet-200">การเงินหน่วยงาน cram_school</p>
              <div className="mt-3">
                <MetricCards items={cramFinanceCards} />
              </div>
            </section>
          ) : null}

          <div
            id="academy-reports-shortcuts"
            className="scroll-mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-4"
            role="group"
            aria-label="ลิงก์ทางลัดหน้ารายงานโรงเรียนกวดวิชา"
          >
            <Link
              to="/academy/enrollment"
              aria-label="ไปหน้าขั้นตอนสมัครเรียนแบบฟันเนล"
              className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 ${portalFocusRing}`}
            >
              ขั้นตอนสมัคร (ฟันเนล Funnel)
            </Link>
            <Link
              to="/academy/students"
              aria-label="ไปหน้าห้องเรียนและรายชื่อนักเรียน"
              className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
            >
              ห้อง / นักเรียน
            </Link>
            <Link
              to="/academy/courses"
              aria-label="ไปหน้าคอร์สเรียนและกิจกรรม"
              className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
            >
              คอร์ส
            </Link>
          </div>
        </>
      ) : null}
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
    <div className="min-w-0 space-y-4">
      <nav
        className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs xl:hidden"
        aria-label="ข้ามไปยังส่วนของหน้าแดชบอร์ดโรงเรียนกวดวิชา"
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
        <div className="flex flex-wrap gap-2">
          <a href="#academy-dash-status" className={academyJumpLinkClass}>
            สรุปบทบาท
          </a>
          <a href="#academy-dash-metrics" className={academyJumpLinkClass}>
            ตัวชี้วัด
          </a>
          {cramFinanceCards.length > 0 ? (
            <a href="#academy-dash-finance" className={academyJumpLinkClass}>
              การเงิน
            </a>
          ) : null}
          <a href="#academy-dash-scores" className={academyJumpLinkClass}>
            คะแนนห้อง
          </a>
          <a href="#academy-dash-funnel" className={academyJumpLinkClass}>
            ฟันเนล
          </a>
          <a href="#academy-dash-role" className={academyJumpLinkClass}>
            มุมมองบทบาท
          </a>
        </div>
      </nav>

      <section
        id="academy-dash-status"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4"
        aria-busy={loading}
      >
        <PortalSnapshotStatusRow loading={loading} source={source}>
          <p className="text-sm text-slate-200" role="status" aria-live="polite" aria-atomic="true">
            {roleSummary}
          </p>
        </PortalSnapshotStatusRow>
      </section>

      <section id="academy-dash-metrics" className="scroll-mt-4 space-y-4">
        <MetricCards items={data.metricCards} />
        <MetricCards items={roleCards} />
      </section>

      {cramFinanceCards.length > 0 ? (
        <section
          id="academy-dash-finance"
          className="scroll-mt-4 rounded-lg border border-violet-900/40 bg-violet-950/20 p-4"
          aria-busy={loading}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-violet-200">การเงินโรงเรียนกวดวิชา (นิติบุคคล)</h3>
          <p className="mt-1 text-xs text-violet-300/80">ยอดจากสมุดรายวัน (journal) เดือนปัจจุบัน — แยกจากสมาคมศิษย์เก่า</p>
          <div className="mt-3">
            <MetricCards items={cramFinanceCards} />
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          id="academy-dash-scores"
          className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
          aria-busy={loading}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลคะแนนเฉลี่ยตามห้อง</h3>
          <p className="mt-2 text-sm text-slate-400">ดูคุณภาพการเรียนรายห้องเพื่อวางแผนเสริมจุดอ่อน</p>
          {data.classes.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
              ยังไม่มีข้อมูลห้องเรียนจากสแนปช็อต (เช่น ยังไม่มีข้อมูลห้องที่เปิดใช้งานใน `cram_classrooms`)
            </p>
          ) : (
            <div className={data.classes.length > 4 ? `mt-4 ${academyPortalScrollList}` : 'mt-4'}>
              <div className="space-y-2 text-sm" role="list" aria-label="ผลคะแนนเฉลี่ยรายห้อง">
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
            </div>
          )}
        </section>
        <section
          id="academy-dash-funnel"
          className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
          aria-busy={loading}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ขั้นตอนฟันเนลสมัครเรียน (Funnel)</h3>
          <TrendBars items={data.enrollmentFunnel} color="violet" />
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าฟันเนลและรายงาน">
            <Link
              to="/academy/enrollment"
              aria-label="ไปหน้าสมัครเรียน"
              className={`tap-target inline-flex items-center rounded px-3 py-1.5 text-xs text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
            >
              ไปหน้าสมัครเรียน
            </Link>
            <Link
              to="/academy/reports"
              aria-label="ไปหน้ารายงานทั้งหมดของโรงเรียนกวดวิชา"
              className={`tap-target inline-flex items-center rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
            >
              ดูรายงานทั้งหมด
            </Link>
          </div>
        </section>
      </div>

      <section
        id="academy-dash-role"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
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

