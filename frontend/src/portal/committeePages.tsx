import { useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { themeAccent } from '../lib/themeTokens'
import { portalFocusRing, portalNotFoundScopeLabel } from './portalLabels'
import {
  MetricCards,
  PortalContentLoading,
  PortalNotFound,
  PortalSectionHeader,
  PortalShell,
  PortalSnapshotStatusRow,
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

/** จำกัดความสูงรายการยาวในพอร์ทัลคณะกรรมการ — เลื่อนในกรอบ ไม่ดันหน้าทั้งหมด */
const committeePortalScrollList =
  'max-h-[min(45dvh,22rem)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-width:thin]'

export function CommitteeArea(props: { apiBase: string; lineUid: string | null }) {
  const [roleView, setRoleView] = useState<CommitteeRoleView>('chair')
  const portalData = useCommitteePortalData(props.apiBase)
  const roleViewSummaryId = 'committee-role-view-summary'
  const navItems = [
    { to: '/committee/dashboard', label: 'แดชบอร์ด', shortLabel: 'แดชบอร์ด', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/members', label: 'ทะเบียนสมาชิก', shortLabel: 'ทะเบียน', roles: ['chair', 'member'] as CommitteeRoleView[] },
    { to: '/committee/finance', label: 'การเงินละเอียด', shortLabel: 'การเงิน', roles: ['chair'] as CommitteeRoleView[] },
    { to: '/committee/meetings', label: 'วาระ/รายงานประชุม', shortLabel: 'ประชุม', roles: ['chair', 'member'] as CommitteeRoleView[] },
    {
      to: '/committee/attendance',
      label: 'ลงทะเบียน/ลงชื่อประชุม',
      shortLabel: 'ลงชื่อ',
      roles: ['chair', 'member'] as CommitteeRoleView[],
    },
    { to: '/committee/voting', label: 'ลงมติ', shortLabel: 'ลงมติ', roles: ['chair', 'member'] as CommitteeRoleView[] },
  ]
  const visibleNavItems = navItems
    .filter((item) => item.roles.includes(roleView))
    .map((item) => ({ to: item.to, label: item.label, shortLabel: item.shortLabel }))
  const roleViewLabel = roleView === 'chair' ? 'ประธานคณะกรรมการ' : 'กรรมการ'

  return (
    <PortalShell
      title="พอร์ทัลคณะกรรมการ"
      subtitle="ทะเบียน การเงิน ประชุม ลงมติ — คณะกรรมการ 35 คน (เลือกเมนูด้านบนหรือแถบข้างบนจอใหญ่)"
      navItems={visibleNavItems}
    >
      <section className="mb-3 min-w-0 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-sm sm:mb-4 sm:p-3" aria-busy={portalData.loading}>
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">มุมมองบทบาท</span>
            <select
              value={roleView}
              onChange={(e) => setRoleView(e.target.value as CommitteeRoleView)}
              aria-label="เลือกมุมมองบทบาทในพอร์ทัลคณะกรรมการ"
              aria-describedby={roleViewSummaryId}
              className={`min-w-0 max-w-full flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200 sm:flex-none sm:py-1 sm:text-xs ${portalFocusRing}`}
            >
              <option value="chair">ประธานคณะกรรมการ</option>
              <option value="member">กรรมการ</option>
            </select>
          </div>
          <span className="hidden text-xs text-slate-500 md:inline">จำลองสิทธิ์เมนูภายในพอร์ทัลคณะกรรมการ</span>
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
        <Route path="dashboard" element={<CommitteeDashboardPage roleView={roleView} portalState={portalData} />} />
        <Route path="members" element={<CommitteeMembersPage portalState={portalData} />} />
        <Route path="finance" element={<CommitteeFinancePage roleView={roleView} portalState={portalData} />} />
        <Route path="meetings" element={<CommitteeMeetingsPage portalState={portalData} apiBase={props.apiBase} />} />
        <Route
          path="attendance"
          element={<CommitteeAttendancePage portalState={portalData} apiBase={props.apiBase} lineUid={props.lineUid} />}
        />
        <Route path="voting" element={<CommitteeVotingPage portalState={portalData} apiBase={props.apiBase} />} />
        <Route path="*" element={<PortalNotFound scopeLabel={portalNotFoundScopeLabel.committee} />} />
      </Routes>
    </PortalShell>
  )
}

function fmtThbAmount(n: number) {
  return `฿ ${Math.round(n).toLocaleString('th-TH')}`
}

function CommitteePlBlock(props: { title: string; entityHint: string; pl: CommitteeMonthlyPl | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{props.entityHint}</p>
      <h4 className="mt-1 text-base font-medium text-slate-100">{props.title}</h4>
      {!props.pl ? (
        <p className="mt-3 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          ไม่มีข้อมูลสมุดรายวัน (journal) ในช่วงเดือนนี้
        </p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">รายรับ</dt>
            <dd className="text-fuchsia-300">{fmtThbAmount(props.pl.revenue)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">รายจ่าย</dt>
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
      <div className="min-w-0 space-y-4">
        <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
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
            <ul className="mt-4 space-y-3 text-sm" role="list" aria-label="สรุปกำไรสุทธิแยกตามนิติบุคคล">
              <li className="rounded border border-slate-800 px-3 py-2" role="listitem">
                <span className="text-slate-400">นิติบุคคลสมาคม · กำไรสุทธิ</span>
                <p className="mt-1 font-medium text-slate-100">
                  {data.associationMonthlyPl ? fmtThbAmount(data.associationMonthlyPl.netIncome) : '— ไม่มีข้อมูล —'}
                </p>
              </li>
              <li className="rounded border border-slate-800 px-3 py-2" role="listitem">
                <span className="text-slate-400">โรงเรียนกวดวิชา · กำไรสุทธิ</span>
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
    <div className="min-w-0 space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
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
            <div
              className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label="จำนวนคำขอจ่ายเงินที่รอดำเนินการ"
            >
              <p className="text-amber-100">
                คำขอจ่ายที่รอดำเนินการ (สถานะ = pending):{' '}
                <span className="font-semibold tabular-nums">{data.paymentRequestsPending.toLocaleString('th-TH')}</span> รายการ
              </p>
            </div>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าแดชบอร์ดคณะกรรมการ">
          <Link to="/committee/dashboard" aria-label="ไปหน้าแดชบอร์ดคณะกรรมการ" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            แดชบอร์ด
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeMeetingsPage(props: { portalState: PortalDataState<CommitteePortalData>; apiBase: string }) {
  const { data, loading, source } = props.portalState
  const meetings = data.meetings
  const documents = data.meetingDocuments
  const recentMinutes = data.recentMinutes
  const closedAgendaResults = data.closedAgendaResults

  const jumpClass = `rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800 ${portalFocusRing}`

  return (
    <div className="min-w-0 space-y-4">
      {!loading ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
          aria-label="ข้ามไปยังส่วนของหน้าวาระและรอบประชุม"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#committee-meetings-sessions" className={jumpClass}>
              รายการประชุม
            </a>
            <a href="#committee-meetings-documents" className={jumpClass}>
              เอกสาร
            </a>
            <a href="#committee-meetings-minutes" className={jumpClass}>
              รายงาน
            </a>
            <a href="#committee-meetings-closed" className={jumpClass}>
              ผลมติ
            </a>
            <a href="#committee-meetings-shortcuts" className={jumpClass}>
              ทางลัด
            </a>
          </div>
        </nav>
      ) : null}

      <section
        id="committee-meetings-sessions"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">วาระและรอบประชุม</h3>
            <p className="mt-2 text-sm text-slate-400">
              รายการจากสแนปช็อต (<code className="text-slate-400">meeting_sessions</code> ล่าสุด) — อัปเดตเมื่อโหลดพอร์ทัล
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : meetings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            ยังไม่มีรายการประชุมในสแนปช็อต
          </p>
        ) : (
          <div className={meetings.length > 4 ? `mt-4 ${committeePortalScrollList}` : 'mt-4'}>
            <ul className="space-y-2 text-sm" role="list" aria-label="รายการวาระและรอบประชุมล่าสุด">
              {meetings.map((m, i) => (
                <li
                  key={`${m.topic}-${m.time}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 px-3 py-2.5"
                  role="listitem"
                >
                  <div>
                    <p className="font-medium text-slate-100">{m.topic}</p>
                    <p className="text-xs text-slate-400">เวลา {m.time}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      m.status === 'ready'
                        ? 'bg-fuchsia-900/40 text-fuchsia-200'
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
          </div>
        )}
      </section>

      {!loading ? (
        <>
          <section
            id="committee-meetings-documents"
            className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
            role="region"
            aria-label="เอกสารประชุมล่าสุด"
          >
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">เอกสารประชุมล่าสุด</h4>
            <p className="mt-1 text-xs text-slate-500">เอกสารที่เผยแพร่ในรอบสแนปช็อต — เลื่อนในกรอบเมื่อรายการยาว</p>
            {documents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีเอกสารประชุมที่เผยแพร่
              </p>
            ) : (
              <div className={documents.length > 3 ? `mt-3 ${committeePortalScrollList}` : 'mt-3'}>
                <ul className="space-y-2 text-xs" role="list" aria-label="รายการเอกสารประชุม">
                  {documents.map((doc) => (
                    <li key={doc.id} className="rounded border border-slate-800 px-2 py-1.5" role="listitem">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-200">{doc.title}</span>
                        <span className="text-slate-400">{doc.scope}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600">
                        อัปเดต {new Date(doc.updatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="คำสั่งเอกสารประชุม">
                        <a
                          href={`${props.apiBase}/api/portal/committee/documents/${encodeURIComponent(doc.id)}/download.txt`}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
                          aria-label={`ดาวน์โหลดเอกสาร ${doc.title}`}
                        >
                          ดาวน์โหลด .txt
                        </a>
                        {doc.documentUrl ? (
                          <a
                            href={doc.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`rounded border border-slate-700 px-2 py-0.5 text-[11px] text-fuchsia-300 hover:bg-slate-800 ${portalFocusRing}`}
                            aria-label={`เปิดลิงก์เอกสาร ${doc.title}`}
                          >
                            เปิดลิงก์
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section
            id="committee-meetings-minutes"
            className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
            role="region"
            aria-label="รายงานการประชุมล่าสุด"
          >
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายงานการประชุมล่าสุด</h4>
            {recentMinutes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีรายงานการประชุมที่เผยแพร่
              </p>
            ) : (
              <div className={recentMinutes.length > 3 ? `mt-3 ${committeePortalScrollList}` : 'mt-3'}>
                <ul className="space-y-2 text-xs" role="list" aria-label="รายการรายงานการประชุมล่าสุด">
                  {recentMinutes.map((m) => (
                    <li key={m.meetingSessionId} className="rounded border border-slate-800 px-2 py-1.5" role="listitem">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-200">{m.title}</span>
                        <span className="text-slate-400">
                          อัปเดต {new Date(m.updatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <a
                          href={`${props.apiBase}/api/portal/committee/meetings/${encodeURIComponent(m.meetingSessionId)}/minutes.txt`}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
                          aria-label={`ดาวน์โหลดรายงานการประชุม ${m.title}`}
                        >
                          ดาวน์โหลด minutes.txt
                        </a>
                        <span className="text-[11px] text-slate-600">ผู้บันทึก: {m.recordedBy ?? 'ไม่ระบุ'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section
            id="committee-meetings-closed"
            className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
            role="region"
            aria-label="ผลมติวาระที่ปิดแล้วล่าสุด"
          >
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">ผลมติวาระที่ปิดแล้วล่าสุด</h4>
            {closedAgendaResults.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีวาระที่ปิดพร้อมผลมติ
              </p>
            ) : (
              <div className={closedAgendaResults.length > 2 ? `mt-3 ${committeePortalScrollList}` : 'mt-3'}>
                <ul className="space-y-2 text-xs" role="list" aria-label="รายการผลมติวาระที่ปิดแล้ว">
                  {closedAgendaResults.map((row) => (
                    <li key={row.id} className="rounded border border-slate-800 px-2 py-1.5" role="listitem">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-200">{row.title}</span>
                        <span
                          className={`rounded px-2 py-0.5 ${
                            row.approvedByVote ? 'bg-fuchsia-900/40 text-fuchsia-200' : 'bg-rose-900/40 text-rose-200'
                          }`}
                        >
                          {row.resultLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {agendaScopeLabel(row.scope)} · ปิดเมื่อ{' '}
                        {new Date(row.closedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        เห็นชอบ {row.approve.toLocaleString('th-TH')} · ไม่เห็นชอบ {row.reject.toLocaleString('th-TH')} · งดออกเสียง{' '}
                        {row.abstain.toLocaleString('th-TH')} · รวม {row.totalVotes.toLocaleString('th-TH')} เสียง
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        ผู้เข้าร่วม {row.attendees.toLocaleString('th-TH')} · เสียงขั้นต่ำ {row.majorityRequired.toLocaleString('th-TH')} ·{' '}
                        {row.quorumRequired > 0
                          ? `องค์ประชุมขั้นต่ำ ${row.quorumRequired.toLocaleString('th-TH')} (${row.quorumMet ? 'ครบ' : 'ไม่ครบ'})`
                          : 'ไม่มีเงื่อนไของค์ประชุม'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      ) : null}

      <div
        id="committee-meetings-shortcuts"
        className="scroll-mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-4"
        role="group"
        aria-label="ลิงก์ทางลัดหน้าวาระและรอบประชุม"
      >
        <Link
          to="/committee/dashboard"
          aria-label="กลับไปหน้าแดชบอร์ดคณะกรรมการ"
          className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
        >
          กลับแดชบอร์ด
        </Link>
        <Link
          to="/committee/voting"
          aria-label="ไปหน้าลงมติคณะกรรมการ"
          className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
        >
          หน้าลงมติ (ตัวอย่าง)
        </Link>
      </div>
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
    <div className="min-w-0 space-y-4">
      <MetricCards items={data.metricCards.slice(0, 2)} />
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
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
              <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีข้อมูลรุ่นสำหรับแสดงกราฟ
              </p>
            ) : (
              <div className="mt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">สัดส่วนตามรุ่น (สูงสุด 8 รุ่น)</h4>
                <TrendBars items={data.memberBatchDistribution} color="fuchsia" />
              </div>
            )}
            <div className="mt-6">
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">ค้นหาในรายการตัวอย่าง</label>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="ค้นหารายชื่อสมาชิกตัวอย่าง"
                placeholder="ชื่อ, รุ่น, สถานะ หรือรหัสสมาชิก…"
                className={`mt-2 w-full max-w-md rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 ${portalFocusRing}`}
              />
            </div>
            {data.memberDirectoryPreview.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีรายชื่อในสแนปช็อต
              </p>
            ) : filtered.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ไม่พบรายการที่ตรงกับคำค้น
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-300" aria-label="ตารางรายชื่อสมาชิกตัวอย่าง">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th scope="col" className="px-3 py-2">ชื่อ-นามสกุล</th>
                      <th scope="col" className="px-3 py-2">รุ่น</th>
                      <th scope="col" className="px-3 py-2">สถานะ</th>
                      <th scope="col" className="px-3 py-2 font-mono">รหัส</th>
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
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าทะเบียนสมาชิก">
          <Link to="/committee/dashboard" aria-label="ไปหน้าแดชบอร์ดคณะกรรมการ" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            แดชบอร์ด
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeAttendancePage(props: {
  portalState: PortalDataState<CommitteePortalData>
  apiBase: string
  lineUid: string | null
}) {
  const { data, loading, source } = props.portalState
  const session = data.attendanceSession
  const rows = data.attendanceRows
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'no' | 'maybe'>('yes')
  const [rsvpMsg, setRsvpMsg] = useState<string | null>(null)
  const [rsvpBusy, setRsvpBusy] = useState(false)

  async function submitRsvp() {
    if (!props.lineUid?.trim() || !session?.id) {
      setRsvpMsg('ต้องเข้าสู่ระบบ LINE และมีรอบประชุมในระบบก่อนแจ้งความประสงค์')
      return
    }
    setRsvpBusy(true)
    setRsvpMsg(null)
    try {
      const r = await fetch(`${props.apiBase}/api/portal/committee/meetings/${encodeURIComponent(session.id)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_uid: props.lineUid.trim(), status: rsvpStatus }),
      })
      const body = (await r.json()) as { error?: string }
      if (!r.ok) {
        setRsvpMsg(body.error ?? `บันทึกไม่สำเร็จ (HTTP ${r.status})`)
        return
      }
      setRsvpMsg('บันทึกความประสงค์เข้าประชุมแล้ว — รีเฟรชแดชบอร์ดเพื่ออัปเดตตัวเลข')
      await props.portalState.refetch()
    } catch {
      setRsvpMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setRsvpBusy(false)
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ลงทะเบียนและลงชื่อประชุม</h3>
            <p className="mt-2 text-sm text-slate-400">
              ข้อมูลจากรอบประชุมล่าสุด (<code className="text-slate-400">meeting_sessions</code> /{' '}
              <code className="text-slate-400">meeting_attendance</code>)
            </p>
          </div>
        </PortalSectionHeader>

        {loading ? (
          <PortalContentLoading />
        ) : !session ? (
          <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            ยังไม่มีรอบประชุมในระบบ — เมื่อมีข้อมูลจะแสดงองค์ประชุม (quorum) และรายชื่อผู้ลงชื่อที่นี่
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm">
              <p className="font-medium text-slate-100">{session.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                กำหนดการ{' '}
                {session.scheduledAt
                  ? new Date(session.scheduledAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
                {' · '}
                องค์ประชุมตามธรรมนู: ต้องมีผู้เข้าประชุมไม่น้อยกว่า{' '}
                <span className="font-mono text-slate-300">{session.quorumRequiredCount.toLocaleString('th-TH')}</span> จากกรรมการเต็มชุด{' '}
                {session.expectedParticipants.toLocaleString('th-TH')} คน (สัดส่วน {session.quorumNumerator}/
                {session.quorumDenominator})
              </p>
              <p className="mt-2 text-xs text-slate-400">
                แจ้งความประสงค์ล่วงหน้า: เข้าร่วม {session.rsvpYes.toLocaleString('th-TH')} · ไม่เข้าร่วม{' '}
                {session.rsvpNo.toLocaleString('th-TH')} · ไม่แน่ใจ {session.rsvpMaybe.toLocaleString('th-TH')}
              </p>
              <p className="mt-2 text-slate-200">
                ลงชื่อเข้าประชุมแล้ว <span className="font-semibold text-fuchsia-300">{session.signedCount.toLocaleString('th-TH')}</span>{' '}
                คน
                <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {session.status === 'open' ? 'กำลังเปิดรับ' : 'ปิดรอบ'}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-800/80 pt-3">
                <label className="text-xs text-slate-400" htmlFor="committee-rsvp-status">
                  แจ้งความประสงค์เข้าประชุม (กรรมการ)
                </label>
                <select
                  id="committee-rsvp-status"
                  value={rsvpStatus}
                  onChange={(e) => setRsvpStatus(e.target.value as 'yes' | 'no' | 'maybe')}
                  disabled={rsvpBusy || !props.lineUid?.trim()}
                  className={`rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 ${portalFocusRing}`}
                  aria-label="เลือกความประสงค์เข้าประชุม"
                >
                  <option value="yes">ตั้งใจเข้าร่วม</option>
                  <option value="maybe">ยังไม่แน่ใจ</option>
                  <option value="no">ไม่เข้าร่วม</option>
                </select>
                <button
                  type="button"
                  disabled={rsvpBusy || !props.lineUid?.trim() || session.status !== 'open'}
                  onClick={() => void submitRsvp()}
                  className={`rounded bg-slate-700 px-3 py-1.5 text-xs text-white disabled:opacity-50 ${portalFocusRing}`}
                >
                  {rsvpBusy ? 'กำลังบันทึก…' : 'บันทึกความประสงค์'}
                </button>
              </div>
              {!props.lineUid?.trim() ? (
                <p className="mt-2 text-xs text-amber-200/90">เข้าสู่ระบบ LINE ก่อนจึงจะแจ้งความประสงค์ได้</p>
              ) : null}
              {rsvpMsg ? (
                <p className="mt-2 text-xs text-slate-400" role="status">
                  {rsvpMsg}
                </p>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                ยังไม่มีรายการลงชื่อในรอบนี้
              </p>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-300" aria-label="ตารางผู้เข้าร่วมที่ลงชื่อประชุม">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th scope="col" className="px-3 py-2">ชื่อผู้เข้าร่วม</th>
                      <th scope="col" className="px-3 py-2">บทบาท</th>
                      <th scope="col" className="px-3 py-2">ช่องทาง</th>
                      <th scope="col" className="px-3 py-2">เวลาลงชื่อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.attendeeName}-${i}`} className="border-t border-slate-800/80">
                        <td className="px-3 py-2 text-slate-100">{r.attendeeName}</td>
                        <td className="px-3 py-2 text-slate-400">{r.attendeeRoleCode}</td>
                        <td className="px-3 py-2 text-slate-400">{signedViaLabel(r.signedVia)}</td>
                        <td className="px-3 py-2 text-slate-400">{formatThaiSignedAt(r.signedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ทางลัดหน้าลงทะเบียนและลงชื่อประชุม">
          <Link to="/committee/voting" aria-label="ไปหน้าลงมติคณะกรรมการ" className={`rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}>
            ไปหน้าลงมติ
          </Link>
          <Link to="/committee/meetings" aria-label="ไปหน้าวาระและรายงานประชุม" className={`rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
            วาระ/รายงานประชุม
          </Link>
        </div>
      </section>
    </div>
  )
}

function CommitteeVotingPage(props: { portalState: PortalDataState<CommitteePortalData>; apiBase: string }) {
  const { data, loading, source } = props.portalState
  const agendas = data.openAgendas
  const [voterName, setVoterName] = useState('')
  const [voterRoleCode, setVoterRoleCode] = useState<'committee' | 'cram_executive'>('committee')
  const [voteChoice, setVoteChoice] = useState<'approve' | 'reject' | 'abstain'>('approve')
  const [submittingAgendaId, setSubmittingAgendaId] = useState<string | null>(null)
  const [voteMsg, setVoteMsg] = useState<string | null>(null)
  const [voteSummaryByAgenda, setVoteSummaryByAgenda] = useState<Record<string, { approve: number; reject: number; abstain: number; total: number }>>({})

  async function loadVoteSummary(agendaId: string) {
    try {
      const r = await fetch(`${props.apiBase}/api/portal/committee/agendas/${encodeURIComponent(agendaId)}/vote-summary`)
      const body = (await r.json()) as {
        summary?: { approve?: number; reject?: number; abstain?: number; total?: number }
      }
      if (!r.ok || !body?.summary) return
      setVoteSummaryByAgenda((prev) => ({
        ...prev,
        [agendaId]: {
          approve: Number(body.summary?.approve ?? 0),
          reject: Number(body.summary?.reject ?? 0),
          abstain: Number(body.summary?.abstain ?? 0),
          total: Number(body.summary?.total ?? 0),
        },
      }))
    } catch {
      // ignore summary fetch failures in UI
    }
  }

  async function submitVote(agendaId: string) {
    if (!voterName.trim()) {
      setVoteMsg('กรอกชื่อผู้ลงมติก่อน')
      return
    }
    setSubmittingAgendaId(agendaId)
    setVoteMsg(null)
    try {
      const r = await fetch(`${props.apiBase}/api/portal/committee/agendas/${encodeURIComponent(agendaId)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voter_name: voterName.trim(),
          voter_role_code: voterRoleCode,
          vote: voteChoice,
        }),
      })
      const body = (await r.json()) as {
        error?: string
        summary?: { approve?: number; reject?: number; abstain?: number; total?: number }
      }
      if (!r.ok) {
        setVoteMsg(body.error ?? `ลงมติไม่สำเร็จ (HTTP ${r.status})`)
        return
      }
      if (body.summary) {
        setVoteSummaryByAgenda((prev) => ({
          ...prev,
          [agendaId]: {
            approve: Number(body.summary?.approve ?? 0),
            reject: Number(body.summary?.reject ?? 0),
            abstain: Number(body.summary?.abstain ?? 0),
            total: Number(body.summary?.total ?? 0),
          },
        }))
      }
      setVoteMsg('บันทึกผลลงมติแล้ว')
      await props.portalState.refetch()
    } catch {
      setVoteMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setSubmittingAgendaId(null)
    }
  }

  const votingJumpClass = `rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800 ${portalFocusRing}`

  return (
    <div className="min-w-0 space-y-4">
      {!loading ? (
        <nav
          className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs lg:hidden"
          aria-label="ข้ามไปยังส่วนของหน้าการลงมติ"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
          <div className="flex flex-wrap gap-2">
            <a href="#committee-voting-agendas" className={votingJumpClass}>
              รายการวาระ
            </a>
            <a href="#committee-voting-form" className={votingJumpClass}>
              ฟอร์มลงมติ
            </a>
            <a href="#committee-voting-shortcuts" className={votingJumpClass}>
              ทางลัด
            </a>
          </div>
        </nav>
      ) : null}

      <section
        id="committee-voting-agendas"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">การลงมติ</h3>
            <p className="mt-2 text-sm text-slate-400">
              วาระที่เปิดรับการลงมติ (<code className="text-slate-400">meeting_agendas</code> สถานะ = open)
            </p>
          </div>
        </PortalSectionHeader>

        {loading ? (
          <PortalContentLoading />
        ) : agendas.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            ไม่มีวาระเปิดลงมติในขณะนี้
          </p>
        ) : (
          <div className={agendas.length > 2 ? `mt-4 ${committeePortalScrollList}` : 'mt-4'}>
            <ul className="space-y-2" role="list" aria-label="รายการวาระที่เปิดลงมติ">
            {agendas.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded border border-slate-800 px-3 py-2.5 text-sm"
                role="listitem"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-100">{a.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-600">{a.id}</p>
                  <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="คำสั่งลงมติของวาระนี้">
                    <button
                      type="button"
                      onClick={() => void submitVote(a.id)}
                      disabled={submittingAgendaId === a.id}
                      aria-label={`ลงมติในวาระ ${a.title}`}
                      className={`tap-target rounded px-2 py-1 text-xs text-white disabled:opacity-60 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
                    >
                      {submittingAgendaId === a.id ? 'กำลังบันทึก…' : 'ลงมติ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadVoteSummary(a.id)}
                      disabled={submittingAgendaId === a.id}
                      aria-label={`โหลดสรุปผลลงมติของวาระ ${a.title}`}
                      className={`tap-target rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
                    >
                      ดูสรุปโหวต
                    </button>
                  </div>
                  {voteSummaryByAgenda[a.id] ? (
                    <p className="mt-1 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
                      เห็นชอบ {voteSummaryByAgenda[a.id].approve.toLocaleString('th-TH')} · ไม่เห็นชอบ{' '}
                      {voteSummaryByAgenda[a.id].reject.toLocaleString('th-TH')} · งดออกเสียง{' '}
                      {voteSummaryByAgenda[a.id].abstain.toLocaleString('th-TH')}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  {agendaScopeLabel(a.scope)}
                </span>
              </li>
            ))}
            </ul>
          </div>
        )}
      </section>

      <section
        id="committee-voting-form"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-label="ฟอร์มลงมติ"
      >
        <div className="rounded border border-slate-800 bg-slate-900/40 p-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">ฟอร์มลงมติ</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              aria-label="ชื่อผู้ลงมติ"
              placeholder="ชื่อผู้ลงมติ"
              className={`rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
            />
            <select
              value={voterRoleCode}
              onChange={(e) => setVoterRoleCode(e.target.value as 'committee' | 'cram_executive')}
              aria-label="บทบาทผู้ลงมติ"
              className={`rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
            >
              <option value="committee">กรรมการ (committee)</option>
              <option value="cram_executive">ผู้บริหารกวดวิชา (cram_executive)</option>
            </select>
            <select
              value={voteChoice}
              onChange={(e) => setVoteChoice(e.target.value as 'approve' | 'reject' | 'abstain')}
              aria-label="ผลการลงมติ"
              className={`rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
            >
              <option value="approve">เห็นชอบ</option>
              <option value="reject">ไม่เห็นชอบ</option>
              <option value="abstain">งดออกเสียง</option>
            </select>
          </div>
          {voteMsg ? (
            <p className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
              {voteMsg}
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-600">
          เมื่อกดปุ่มลงมติ ระบบจะบันทึกลง <code className="text-slate-400">meeting_votes</code> และรีเฟรชรายการวาระอัตโนมัติ
        </p>
      </section>

      <div
        id="committee-voting-shortcuts"
        className="scroll-mt-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-4"
        role="group"
        aria-label="ลิงก์ทางลัดหน้าการลงมติ"
      >
        <Link
          to="/committee/attendance"
          aria-label="ไปหน้าลงชื่อและลงทะเบียนประชุม"
          className={`tap-target inline-flex items-center rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
        >
          ดูการลงชื่อประชุม
        </Link>
        <Link
          to="/committee/meetings"
          aria-label="ไปหน้าวาระและรายงานประชุม"
          className={`tap-target inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
        >
          วาระ/รายงานประชุม
        </Link>
      </div>
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
  const latestMinutes = data.recentMinutes[0] ?? null
  const latestClosedAgenda = data.closedAgendaResults[0] ?? null
  const openAgendaCount = data.meetingOverview.openAgendaCount
  const closedAgendaCount = data.meetingOverview.closedAgendaCount
  const publishedDocumentCount = data.meetingOverview.publishedDocumentCount
  const minutesPublishedCount = data.meetingOverview.minutesPublishedCount
  const payPending = data.paymentRequestsPending

  const dashJumpClass = `rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800 ${portalFocusRing}`

  return (
    <div className="min-w-0 space-y-4">
      <nav
        className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3 text-xs xl:hidden"
        aria-label="ข้ามไปยังส่วนของหน้าแดชบอร์ดคณะกรรมการ"
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">ในหน้านี้</span>
        <div className="flex flex-wrap gap-2">
          <a href="#committee-dash-trends" className={dashJumpClass}>
            แนวโน้มคำร้อง
          </a>
          <a href="#committee-dash-today" className={dashJumpClass}>
            งานด่วนวันนี้
          </a>
          <a href="#committee-dash-meetings" className={dashJumpClass}>
            สถานะประชุม
          </a>
        </div>
      </nav>
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4" aria-busy={loading}>
        <PortalSnapshotStatusRow loading={loading} source={source}>
          <p className="text-xs uppercase tracking-wide text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            สรุปสแนปช็อตแดชบอร์ด
          </p>
        </PortalSnapshotStatusRow>
      </section>
      <MetricCards items={data.metricCards} />
      <MetricCards items={data.roleCards[props.roleView]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          id="committee-dash-trends"
          className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
          aria-busy={loading}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">แนวโน้มคำร้อง 7 วัน</h3>
          <p className="mt-2 text-sm text-slate-400">
            จำนวนคำร้องใหม่ต่อวัน (UTC) จาก <code className="text-slate-400">member_update_requests</code> — ใช้ติดตามงานค้าง
          </p>
          <TrendBars items={data.requestTrend} />
        </section>
        <section
          id="committee-dash-today"
          className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
          aria-busy={loading}
        >
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">งานด่วนวันนี้</h3>
          <div className={`mt-3 ${committeePortalScrollList}`}>
          <ul className="space-y-2 text-sm" role="list" aria-label="รายการงานด่วนวันนี้">
            <li className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-100" role="listitem">
              {att
                ? `ลงชื่อประชุมล่าสุด ${att.signedCount.toLocaleString('th-TH')}/${att.expectedParticipants.toLocaleString('th-TH')} · ${att.title}`
                : 'ยังไม่มีรอบประชุมในสแนปช็อต — ตรวจองค์ประชุม (quorum) เมื่อเปิดรอบ'}
            </li>
            <li className="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-red-100" role="listitem">
              วาระเปิดลงมติ {openAgendaCount.toLocaleString('th-TH')} รายการ (meeting_agendas ที่สถานะ open)
            </li>
            <li className="rounded border border-indigo-900/40 bg-indigo-950/20 px-3 py-2 text-indigo-100" role="listitem">
              วาระที่ปิดแล้ว {closedAgendaCount.toLocaleString('th-TH')} รายการ · รายงานประชุมเผยแพร่{' '}
              {minutesPublishedCount.toLocaleString('th-TH')} ฉบับ
            </li>
            <li className="rounded border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-sky-100" role="listitem">
              คำขอจ่ายรอดำเนินการ {payPending.toLocaleString('th-TH')} รายการ (สถานะ pending)
            </li>
            <li className={`rounded px-3 py-2 text-fuchsia-100 ${themeAccent.panel}`} role="listitem">
              เอกสารประชุมเผยแพร่ {publishedDocumentCount.toLocaleString('th-TH')} รายการ
            </li>
            {latestMinutes ? (
              <li className="rounded border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-cyan-100" role="listitem">
                รายงานล่าสุด: {latestMinutes.title} ·{' '}
                {new Date(latestMinutes.updatedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
              </li>
            ) : null}
            {latestClosedAgenda ? (
              <li
                className={`rounded px-3 py-2 ${
                  latestClosedAgenda.approvedByVote
                    ? `${themeAccent.panel} text-fuchsia-100`
                    : 'border border-rose-900/40 bg-rose-950/20 text-rose-100'
                }`}
                role="listitem"
              >
                มติล่าสุด: {latestClosedAgenda.resultLabel} · {latestClosedAgenda.title} ({latestClosedAgenda.approve.toLocaleString('th-TH')}/
                {latestClosedAgenda.totalVotes.toLocaleString('th-TH')} เสียง)
              </li>
            ) : null}
          </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="ลิงก์งานด่วนสำหรับคณะกรรมการ">
            <Link
              to="/committee/voting"
              aria-label="ไปหน้าลงมติคณะกรรมการทันที"
              className={`tap-target inline-flex items-center rounded px-3 py-1.5 text-xs text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
            >
              เปิดหน้าลงมติ
            </Link>
            <Link to="/committee/attendance" aria-label="ไปหน้าเช็กชื่อประชุม" className={`tap-target inline-flex items-center rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}>
              เช็กชื่อประชุม
            </Link>
          </div>
        </section>
      </div>
      <section
        id="committee-dash-meetings"
        className="scroll-mt-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5"
        aria-busy={loading}
      >
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถานะประชุมวันนี้</h3>
        {data.meetings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            ยังไม่มีรายการประชุมในสแนปช็อต
          </p>
        ) : (
          <div className={data.meetings.length > 4 ? `mt-3 ${committeePortalScrollList}` : 'mt-3'}>
            <div className="space-y-2 text-sm" role="list" aria-label="สถานะประชุมล่าสุด">
              {data.meetings.map((meeting, mi) => (
                <div
                  key={`${meeting.topic}-${meeting.time}-${mi}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2"
                  role="listitem"
                >
                  <div>
                    <p className="text-slate-100">{meeting.topic}</p>
                    <p className="text-xs text-slate-400">เริ่ม {meeting.time}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      meeting.status === 'ready'
                        ? 'bg-fuchsia-900/40 text-fuchsia-200'
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
          </div>
        )}
      </section>
    </div>
  )
}

