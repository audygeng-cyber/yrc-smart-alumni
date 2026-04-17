import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
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
import {
  type CommitteeMonthlyPl,
  type CommitteePortalData,
  type CommitteeRoleView,
  type PortalDataState,
  useCommitteePortalData,
} from './dataAdapter'

function committeeMeetingStatusLabel(s: 'ready' | 'pending_vote' | 'in_review') {
  return s === 'ready' ? 'พร้อม' : s === 'pending_vote' ? 'รอลงมติ' : 'ตรวจสอบ'
}

export function CommitteeArea(props: { apiBase: string }) {
  const [roleView, setRoleView] = useState<CommitteeRoleView>('chair')
  const portalData = useCommitteePortalData(props.apiBase)
  const navItems = [
    { to: '/committee/dashboard', label: 'แดชบอร์ด', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/members', label: 'ทะเบียนสมาชิก', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/finance', label: 'การเงินละเอียด', roles: ['chair'] as CommitteeRoleView[] },
    { to: '/committee/meetings', label: 'วาระ/รายงานประชุม', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/attendance', label: 'ลงทะเบียน/ลงชื่อประชุม', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/voting', label: 'ลงมติ', roles: ['chair', 'member'] as CommitteeRoleView[] },
  ]
  const visibleNavItems = navItems.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))

  return (
    <PortalShell
      title="พอร์ทัลคณะกรรมการ"
      subtitle="คณะกรรมการ 35 คน · ทะเบียนสมาชิก · การเงินละเอียด · ประชุม · ลงมติ"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">มุมมองบทบาท</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as CommitteeRoleView)}
            className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 ${portalFocusRing}`}
          >
            <option value="chair">ประธานคณะกรรมการ</option>
            <option value="member">กรรมการ</option>
          </select>
          <span className="text-xs text-slate-500">จำลองสิทธิ์เมนูภายในพอร์ทัลคณะกรรมการ</span>
          <PortalSnapshotToolbar loading={portalData.loading} source={portalData.source} onRefresh={portalData.refetch} />
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CommitteeDashboardPage roleView={roleView} portalState={portalData} />} />
        <Route path="members" element={<CommitteeMembersPage portalState={portalData} />} />
        <Route path="finance" element={<CommitteeFinancePage roleView={roleView} portalState={portalData} />} />
        <Route path="meetings" element={<CommitteeMeetingsPage portalState={portalData} />} />
        <Route path="attendance" element={<CommitteeAttendancePage portalState={portalData} />} />
        <Route path="voting" element={<CommitteeVotingPage portalState={portalData} />} />
        <Route path="*" element={<PortalNotFound scopeLabel={portalNotFoundScopeLabel.committee} />} />
      </Routes>
    </PortalShell>
  )
}

function fmtThbAmount(n: number) {
  return `฿ ${Math.round(n).toLocaleString('en-US')}`
}

function CommitteePlBlock(props: { title: string; entityHint: string; pl: CommitteeMonthlyPl | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{props.entityHint}</p>
      <h4 className="mt-1 text-base font-medium text-slate-100">{props.title}</h4>
      {!props.pl ? (
        <p className="mt-3 text-sm text-slate-500">ไม่มีข้อมูลสมุดรายวัน (journal) ในช่วงเดือนนี้</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">รายรับ</dt>
            <dd className="text-emerald-300">{fmtThbAmount(props.pl.revenue)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">รายจ่าย</dt>
            <dd className="text-amber-200">{fmtThbAmount(props.pl.expense)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-2">
            <dt className="text-slate-400">กำไรสุทธิ</dt>
            <dd className="font-medium text-slate-100">{fmtThbAmount(props.pl.netIncome)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function CommitteeFinancePage(props: {
  roleView: CommitteeRoleView
  portalState: PortalDataState<CommitteePortalData>
}) {
  const { data, loading, source } = props.portalState
  const monthLabel = new Date().toLocaleString('th-TH', { month: 'long', year: 'numeric' })

  if (props.roleView === 'member') {
    return (
      <div className="space-y-4">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <PortalSectionHeader loading={loading} source={source}>
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">การเงิน (สรุป)</h3>
              <p className="mt-2 text-sm text-slate-400">
                มุมมองกรรมการแสดงเฉพาะกำไรสุทธิโดยสังเขป — รายละเอียดบัญชีเต็มสำหรับประธาน/ผู้ได้รับมอบหมาย
              </p>
            </div>
          </PortalSectionHeader>
          {loading ? (
            <PortalContentLoading />
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              <li className="rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-500">นิติบุคคลสมาคม · กำไรสุทธิ</span>
                <p className="mt-1 font-medium text-slate-100">
                  {data.associationMonthlyPl ? fmtThbAmount(data.associationMonthlyPl.netIncome) : '— ไม่มีข้อมูล —'}
                </p>
              </li>
              <li className="rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-500">โรงเรียนกวดวิชา · กำไรสุทธิ</span>
                <p className="mt-1 font-medium text-slate-100">
                  {data.cramSchoolMonthlyPl ? fmtThbAmount(data.cramSchoolMonthlyPl.netIncome) : '— ไม่มีข้อมูล —'}
                </p>
              </li>
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-600">ช่วงอ้างอิง: {monthLabel} (ตามสมุดรายวัน journal ในระบบ)</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">การเงินละเอียด</h3>
            <p className="mt-2 text-sm text-slate-400">
              สรุป P/L เดือนปัจจุบันจากบัญชีแยกประเภท (journal) แยกนิติบุคคล — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
            <p className="mt-1 text-xs text-slate-600">ช่วงเดือน: {monthLabel}</p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <CommitteePlBlock entityHint="legal_entities.code = association" title="นิติบุคคลสมาคม" pl={data.associationMonthlyPl} />
              <CommitteePlBlock entityHint="legal_entities.code = cram_school" title="โรงเรียนกวดวิชา" pl={data.cramSchoolMonthlyPl} />
            </div>
            <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm">
              <p className="text-amber-100">
                คำขอจ่ายที่รอดำเนินการ (status = pending):{' '}
                <span className="font-semibold tabular-nums">{data.paymentRequestsPending}</span> รายการ
              </p>
            </div>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/committee/dashboard" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            แดชบอร์ด
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeMeetingsPage(props: { portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const meetings = data.meetings

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">วาระและรอบประชุม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจากสแนปช็อต (<code className="text-slate-500">meeting_sessions</code> ล่าสุด) — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : meetings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">ยังไม่มีรายการประชุมในสแนปช็อต</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {meetings.map((m, i) => (
              <li
                key={`${m.topic}-${m.time}-${i}`}
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
                  {committeeMeetingStatusLabel(m.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/committee/dashboard" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            กลับแดชบอร์ด
          </Link>
          <Link to="/committee/voting" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            หน้าลงมติ (ตัวอย่าง)
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeMembersPage(props: { portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.memberDirectoryPreview
    return data.memberDirectoryPreview.filter((row) => {
      const name = `${row.firstName} ${row.lastName}`.toLowerCase()
      const batch = (row.batch ?? '').toLowerCase()
      const st = row.membershipStatus.toLowerCase()
      return name.includes(q) || batch.includes(q) || st.includes(q) || row.id.toLowerCase().includes(q)
    })
  }, [data.memberDirectoryPreview, query])

  return (
    <div className="space-y-4">
      <MetricCards items={data.metricCards.slice(0, 2)} />
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ทะเบียนสมาชิก</h3>
            <p className="mt-2 text-sm text-slate-400">
              สัดส่วนตามรุ่นและรายชื่ออัปเดตล่าสุดจากสแนปช็อต — ค้นหาด้านล่างกรองเฉพาะรายการในรอบนี้ (สูงสุด 40 คน)
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            {data.memberBatchDistribution.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">ยังไม่มีข้อมูลรุ่นสำหรับแสดงกราฟ</p>
            ) : (
              <div className="mt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">สัดส่วนตามรุ่น (สูงสุด 8 รุ่น)</h4>
                <TrendBars items={data.memberBatchDistribution} color="emerald" />
              </div>
            )}
            <div className="mt-6">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">ค้นหาในรายการตัวอย่าง</label>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ชื่อ, รุ่น, สถานะ หรือรหัสสมาชิก…"
                className="mt-2 w-full max-w-md rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
            {data.memberDirectoryPreview.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">ยังไม่มีรายชื่อในสแนปช็อต</p>
            ) : filtered.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">ไม่พบรายการที่ตรงกับคำค้น</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">ชื่อ-นามสกุล</th>
                      <th className="px-3 py-2">รุ่น</th>
                      <th className="px-3 py-2">สถานะ</th>
                      <th className="px-3 py-2 font-mono">รหัส</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.id} className="border-t border-slate-800/80">
                        <td className="px-3 py-2 text-slate-100">
                          {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{row.batch ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-400">{row.membershipStatus}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{row.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/committee/dashboard" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            แดชบอร์ด
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeAttendancePage(props: { portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const session = data.attendanceSession
  const rows = data.attendanceRows

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ลงทะเบียนและลงชื่อประชุม</h3>
            <p className="mt-2 text-sm text-slate-400">
              ข้อมูลจากรอบประชุมล่าสุด (<code className="text-slate-500">meeting_sessions</code> /{' '}
              <code className="text-slate-500">meeting_attendance</code>)
            </p>
          </div>
        </PortalSectionHeader>

        {loading ? (
          <PortalContentLoading />
        ) : !session ? (
          <p className="mt-4 text-sm text-slate-400">ยังไม่มีรอบประชุมในระบบ — เมื่อมีข้อมูลจะแสดง quorum และรายชื่อผู้ลงชื่อที่นี่</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
              <p className="font-medium text-slate-100">{session.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                กำหนดการ{' '}
                {session.scheduledAt
                  ? new Date(session.scheduledAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
                {' · '}
                quorum {session.quorumNumerator}/{session.quorumDenominator} ของผู้เข้าร่วมที่คาด ({session.expectedParticipants}{' '}
                คน)
              </p>
              <p className="mt-2 text-slate-200">
                ลงชื่อแล้ว <span className="font-semibold text-emerald-300">{session.signedCount}</span> /{' '}
                {session.expectedParticipants}
                <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {session.status === 'open' ? 'กำลังเปิดรับ' : 'ปิดรอบ'}
                </span>
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">ยังไม่มีรายการลงชื่อในรอบนี้</p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">ชื่อผู้เข้าร่วม</th>
                      <th className="px-3 py-2">บทบาท</th>
                      <th className="px-3 py-2">ช่องทาง</th>
                      <th className="px-3 py-2">เวลาลงชื่อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.attendeeName}-${i}`} className="border-t border-slate-800/80">
                        <td className="px-3 py-2 text-slate-100">{r.attendeeName}</td>
                        <td className="px-3 py-2 text-slate-400">{r.attendeeRoleCode}</td>
                        <td className="px-3 py-2 text-slate-400">{signedViaLabel(r.signedVia)}</td>
                        <td className="px-3 py-2 text-slate-500">{formatThaiSignedAt(r.signedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/committee/voting" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            ไปหน้าลงมติ
          </Link>
          <Link to="/committee/meetings" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            วาระ/รายงานประชุม
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeVotingPage(props: { portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const agendas = data.openAgendas

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">การลงมติ</h3>
            <p className="mt-2 text-sm text-slate-400">
              วาระที่เปิดรับการลงมติ (<code className="text-slate-500">meeting_agendas</code> status = open)
            </p>
          </div>
        </PortalSectionHeader>

        {loading ? (
          <PortalContentLoading />
        ) : agendas.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">ไม่มีวาระเปิดลงมติในขณะนี้</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {agendas.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded border border-slate-800 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-100">{a.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-600">{a.id}</p>
                </div>
                <span className="shrink-0 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  {agendaScopeLabel(a.scope)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-slate-600">
          การลงคะแนนจริงเชื่อมกับบัญชีผู้ใช้และตาราง <code className="text-slate-500">meeting_votes</code> — หน้านี้แสดงรายการวาระจากสแนปช็อต
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/committee/attendance" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            ดูการลงชื่อประชุม
          </Link>
          <Link to="/committee/meetings" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            วาระ/รายงานประชุม
          </Link>
        </div>
      </section>
    </div>
  )
}

function formatThaiSignedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function agendaScopeLabel(scope: string) {
  if (scope === 'cram_school') return 'โรงเรียนกวดวิชา'
  if (scope === 'association') return 'สมาคม'
  return scope
}

function signedViaLabel(v: string) {
  if (v === 'line') return 'LINE'
  if (v === 'manual') return 'ลงชื่อมือ'
  return v
}

function CommitteeDashboardPage(props: { roleView: CommitteeRoleView; portalState: PortalDataState<CommitteePortalData> }) {
  const { data, loading, source } = props.portalState
  const att = data.attendanceSession
  const openAgendaCount = data.openAgendas.length
  const payPending = data.paymentRequestsPending

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <PortalSnapshotStatusRow loading={loading} source={source}>
          <p className="text-xs uppercase tracking-wide text-slate-500">สรุปสแนปช็อตแดชบอร์ด</p>
        </PortalSnapshotStatusRow>
      </section>
      <MetricCards items={data.metricCards} />
      <MetricCards items={data.roleCards[props.roleView]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">แนวโน้มคำร้อง 7 วัน</h3>
          <p className="mt-2 text-sm text-slate-400">
            จำนวนคำร้องใหม่ต่อวัน (UTC) จาก <code className="text-slate-500">member_update_requests</code> — ใช้ติดตามงานค้าง
          </p>
          <TrendBars items={data.requestTrend} />
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">งานด่วนวันนี้</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-100">
              {att
                ? `ลงชื่อประชุมล่าสุด ${att.signedCount}/${att.expectedParticipants} · ${att.title}`
                : 'ยังไม่มีรอบประชุมในสแนปช็อต — ตรวจ quorum เมื่อเปิดรอบ'}
            </li>
            <li className="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-red-100">
              วาระเปิดลงมติ {openAgendaCount} รายการ (meeting_agendas open)
            </li>
            <li className="rounded border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-sky-100">
              คำขอจ่ายรอดำเนินการ {payPending} รายการ (pending)
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/committee/voting" className={`rounded bg-emerald-800 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 ${portalFocusRing}`}>
              เปิดหน้าลงมติ
            </Link>
            <Link to="/committee/attendance" className={`rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
              เช็กชื่อประชุม
            </Link>
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถานะประชุมวันนี้</h3>
        {data.meetings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">ยังไม่มีรายการประชุมในสแนปช็อต</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            {data.meetings.map((meeting, mi) => (
              <div key={`${meeting.topic}-${meeting.time}-${mi}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2">
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
                  {committeeMeetingStatusLabel(meeting.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

