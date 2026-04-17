import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { formatThbShort, totalStudentsInClasses, weightedAverageFromClasses } from './academyMath'
import { type AcademyPortalData, type AcademyRoleView, type PortalDataState, useAcademyPortalData } from './dataAdapter'
import { MetricCards, PortalDataSourceBadge, PortalShell, SectionPlaceholder, TrendBars } from './ui'

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
          <PortalDataSourceBadge loading={portalData.loading} source={portalData.source} />
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AcademyDashboardPage roleView={roleView} portalData={portalData.data} />} />
        <Route
          path="students"
          element={<AcademyStudentsPage roleView={roleView} portalState={portalData} />}
        />
        <Route path="courses" element={<AcademyCoursesPage portalState={portalData} />} />
        <Route path="enrollment" element={<AcademyEnrollmentPage portalState={portalData} />} />
        <Route path="results" element={<AcademyResultsPage roleView={roleView} portalState={portalData} />} />
        <Route path="reports" element={<AcademyReportsPage roleView={roleView} portalState={portalData} />} />
        <Route path="*" element={<NotFoundInline />} />
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">นักเรียนและห้องเรียน</h3>
        <p className="mt-3 text-sm text-slate-400">
          หน้านี้จัดไว้สำหรับผู้บริหารและครูเป็นหลัก หากต้องการดูข้อมูลส่วนตัวหรือของบุตรหลาน ให้ใช้เมนูที่เกี่ยวข้องเมื่อระบบเชื่อมบัญชีแล้ว
        </p>
        <Link to="/academy/dashboard" className="mt-4 inline-block rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700">
          กลับไปหน้าแดชบอร์ด
        </Link>
      </section>
    )
  }

  const totalStudents = totalStudentsInClasses(classes)
  const weightedAvg = weightedAverageFromClasses(classes)

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ห้องเรียนและจำนวนนักเรียน</h3>
            <p className="mt-2 text-sm text-slate-400">
              สรุปจากฐานข้อมูลห้องที่เปิดใช้งานและนักเรียนในระบบ — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : classes.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400">
            <p>ยังไม่มีข้อมูลห้องจากระบบ (หรือใช้ข้อมูลจำลองที่ไม่มีรายการห้อง)</p>
            <p className="mt-2">
              ผู้ดูแลสามารถเพิ่มห้องและนักเรียนได้ที่{' '}
              <Link to="/admin" className="text-emerald-400 underline hover:text-emerald-300">
                Admin
              </Link>{' '}
              หลังรัน migration และตั้งค่า API
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">จำนวนห้อง</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{classes.length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">นักเรียนทั้งหมด</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{totalStudents}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{weightedAvg != null ? weightedAvg : '—'}</p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">ห้อง</th>
                    <th className="py-2 pr-3">จำนวนนักเรียน</th>
                    <th className="py-2">คะแนนเฉลี่ยห้อง</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((row, i) => (
                    <tr key={`${row.room}-${i}`} className="border-b border-slate-800/90">
                      <td className="py-2.5 pr-3 text-slate-100">{row.room}</td>
                      <td className="py-2.5 pr-3 text-slate-300">{row.students}</td>
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
                      className="group rounded-lg border border-slate-800 bg-slate-950/40 open:border-slate-700"
                    >
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center justify-between gap-2">
                          <span>{row.room}</span>
                          <span className="text-xs text-slate-500">
                            {roster.length} คน · คลิกเพื่อขยาย
                          </span>
                        </span>
                      </summary>
                      <ul className="border-t border-slate-800 px-3 py-2 text-sm">
                        {roster.map((s, j) => (
                          <li
                            key={`${row.room}-${s.name}-${j}`}
                            className="flex items-center justify-between gap-3 border-b border-slate-800/80 py-2 last:border-0"
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
              <p className="mt-4 text-xs text-slate-500">
                ยังไม่มีรายชื่อนักเรียนใน snapshot — เพิ่มนักเรียนได้ที่{' '}
                <Link to="/admin" className="text-emerald-400/90 underline hover:text-emerald-300">
                  Admin
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">คอร์สเรียน / กิจกรรม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจาก <code className="text-slate-500">school_activities</code> ที่เปิดใช้งาน — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : schoolCourses.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-400">
            <p>ยังไม่มีรายการคอร์สในฐานข้อมูล (หรือใช้ข้อมูลจำลองที่ไม่มีรายการ)</p>
            <p className="mt-2 text-xs text-slate-500">
              เพิ่มผ่าน{' '}
              <Link to="/admin" className="text-amber-400/90 underline hover:text-amber-300">
                Admin → คอร์ส/กิจกรรม
              </Link>{' '}
              หรือแก้ที่ตาราง <code className="text-slate-400">school_activities</code> ใน Supabase
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">หมวด</th>
                  <th className="py-2 pr-3">ชื่อคอร์ส</th>
                  <th className="py-2">รายละเอียด</th>
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สมัครเรียน (funnel)</h3>
            <p className="mt-2 text-sm text-slate-400">
              สรุปจำนวนตามขั้นจาก snapshot — ใช้เป็นภาพรวมก่อนมี workflow สมัครจริงในระบบ
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : (
          <>
            <TrendBars items={funnel} color="violet" />
            <p className="mt-4 text-sm text-slate-400">
              อัตราแปลงโดยประมาณจากขั้นแรกถึงขั้นสุดใน funnel:{' '}
              <span className="font-medium text-violet-200">{conversionPct}%</span>
              <span className="text-slate-500"> ({last.toLocaleString('en-US')} / {first.toLocaleString('en-US')})</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/academy/courses"
                className="rounded-lg bg-violet-800 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700"
              >
                ดูรายการคอร์ส
              </Link>
              <Link
                to="/academy/reports"
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ผลการเรียนและคะแนน</h3>
            <p className="mt-3 text-sm text-slate-400">
              มุมมองรายบุคคลและรายวิชาจะเชื่อมกับบัญชีนักเรียน/ผู้ปกครองเมื่อระบบพร้อม — ตอนนี้ดูภาพรวมได้จากแดชบอร์ดและเมนูที่เกี่ยวข้อง
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        <Link to="/academy/dashboard" className="mt-4 inline-block rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700">
          ไปแดชบอร์ด
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สรุปผลการเรียน (จาก snapshot)</h3>
            <p className="mt-2 text-sm text-slate-400">
              ค่าเฉลี่ยถ่วงน้ำหนักและจำนวนนักเรียนตามห้อง — รายละเอียดรายห้องและรายชื่ออยู่ที่เมนูนักเรียน/ห้องเรียน
            </p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">นักเรียน (รวมจากตารางห้อง)</p>
                <p className="mt-1 text-2xl font-semibold text-slate-100">{total.toLocaleString('en-US')}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">คะแนนเฉลี่ยรวม (ถ่วงน้ำหนัก)</p>
                <p className="mt-1 text-2xl font-semibold text-cyan-200">{weighted != null ? weighted : '—'}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/academy/students"
                className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
              >
                ดูรายห้องและรายชื่อ
              </Link>
              <Link
                to="/academy/dashboard"
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">รายงานสรุป</h3>
            <p className="mt-2 text-sm text-slate-400">{roleHint}</p>
          </div>
          <PortalDataSourceBadge loading={loading} source={source} />
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">กำลังโหลด…</p>
        ) : (
          <>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">ตัวชี้วัดหลัก</p>
              <div className="mt-2">
                <MetricCards items={data.metricCards} />
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Funnel สมัครเรียน</p>
              <TrendBars items={data.enrollmentFunnel} color="cyan" />
            </div>
            {cramFinanceCards.length > 0 ? (
              <div className="mt-6 rounded-lg border border-violet-900/40 bg-violet-950/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-200">การเงิน cram_school</p>
                <div className="mt-3">
                  <MetricCards items={cramFinanceCards} />
                </div>
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/academy/enrollment" className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700">
                Funnel สมัคร
              </Link>
              <Link to="/academy/students" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                ห้อง / นักเรียน
              </Link>
              <Link to="/academy/courses" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                คอร์ส
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
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
  const cramPl = props.portalData.cramSchoolMonthlyPl
  const cramFinanceCards =
    cramPl !== null
      ? [
          {
            label: 'รายรับ (cram_school)',
            value: formatThbShort(cramPl.revenue),
            hint: 'จากบัญชีแยกประเภท — journal เดือนนี้',
          },
          {
            label: 'รายจ่าย (cram_school)',
            value: formatThbShort(cramPl.expense),
            hint: 'จากบัญชีแยกประเภท — journal เดือนนี้',
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
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-sm text-slate-200">{roleSummary}</p>
      </section>
      <MetricCards items={props.portalData.metricCards} />
      <MetricCards items={roleCards} />
      {cramFinanceCards.length > 0 ? (
        <section className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-violet-200">การเงินโรงเรียนกวดวิชา (นิติบุคคล)</h3>
          <p className="mt-1 text-xs text-violet-300/80">ยอดจาก journal เดือนปัจจุบัน — แยกจากสมาคมศิษย์เก่า</p>
          <div className="mt-3">
            <MetricCards items={cramFinanceCards} />
          </div>
        </section>
      ) : null}
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
