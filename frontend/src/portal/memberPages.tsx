import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { MemberPortal } from '../components/MemberPortal'
import { portalFocusRing, portalNotFoundScopeLabel } from './portalLabels'
import {
  DonationCampaignCard,
  MeetingReportRow,
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
  type MemberPortalData,
  type MemberRoleView,
  type PortalDataState,
  useMemberPortalData,
} from './dataAdapter'
import { memberDonationHistoryMock } from './mockData'

export function MemberArea(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  lineDisplayName: string
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  const [roleView, setRoleView] = useState<MemberRoleView>('member')
  const portalData = useMemberPortalData(props.apiBase)
  const roleViewSummaryId = 'member-role-view-summary'
  const memberNav = [
    { to: '/member/dashboard', label: 'แดชบอร์ด', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/card', label: 'บัตรสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/profile', label: 'ข้อมูลส่วนตัว', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/statistics', label: 'สถิติสมาชิก', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/donations', label: 'สนับสนุนกิจกรรม', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/meetings', label: 'ประชุมและการเงิน', roles: ['member', 'staff'] as MemberRoleView[] },
    { to: '/member/documents', label: 'ข้อมูลเชิงกำกับดูแล', roles: ['staff'] as MemberRoleView[] },
  ]
  const visibleNavItems = memberNav.filter((item) => item.roles.includes(roleView)).map((item) => ({ to: item.to, label: item.label }))
  const roleViewLabel = roleView === 'member' ? 'สมาชิกทั่วไป' : 'เจ้าหน้าที่สมาคม'

  return (
    <PortalShell
      title="พอร์ทัลสมาชิก"
      subtitle="เมนูสมาชิก · บัตรสมาชิก · ข้อมูลส่วนตัว · สถิติ · การสนับสนุน"
      navItems={visibleNavItems}
    >
      <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm" aria-busy={portalData.loading}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">มุมมองบทบาท</span>
          <select
            value={roleView}
            onChange={(e) => setRoleView(e.target.value as MemberRoleView)}
            aria-label="เลือกมุมมองบทบาทในพอร์ทัลสมาชิก"
            aria-describedby={roleViewSummaryId}
            className={`tap-target rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 ${portalFocusRing}`}
          >
            <option value="member">สมาชิกทั่วไป</option>
            <option value="staff">เจ้าหน้าที่สมาคม</option>
          </select>
          <span className="text-xs text-slate-400">จำลองสิทธิ์เมนูภายในพอร์ทัลสมาชิก</span>
          <span id={roleViewSummaryId} className="text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            บทบาทปัจจุบัน: {roleViewLabel} · เมนูที่เข้าถึงได้ {visibleNavItems.length.toLocaleString('th-TH')} รายการ
          </span>
          <PortalSnapshotToolbar loading={portalData.loading} source={portalData.source} onRefresh={portalData.refetch} />
        </div>
      </section>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <>
              <MemberDashboardSnapshotBar portalState={portalData} />
              <MemberPortal
                apiBase={props.apiBase}
                lineUid={props.lineUid}
                member={props.member}
                onMemberUpdated={props.onMemberUpdated}
                lineDisplayName={props.lineDisplayName}
              />
            </>
          }
        />
        <Route path="card" element={<MemberCardPage member={props.member} />} />
        <Route path="profile" element={<MemberProfilePage member={props.member} />} />
        <Route path="statistics" element={<MemberStatisticsPage roleView={roleView} portalState={portalData} />} />
        <Route
          path="donations"
          element={
            <MemberDonationsPage
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              portalState={portalData}
            />
          }
        />
        <Route path="meetings" element={<MemberMeetingsPage portalState={portalData} />} />
        <Route
          path="documents"
          element={
            roleView === 'staff' ? <MemberStaffDocumentsPage /> : <PortalNotFound scopeLabel={portalNotFoundScopeLabel.member} />
          }
        />
        <Route path="*" element={<PortalNotFound scopeLabel={portalNotFoundScopeLabel.member} />} />
      </Routes>
    </PortalShell>
  )
}

function MemberDashboardSnapshotBar(props: { portalState: PortalDataState<MemberPortalData> }) {
  const { loading, source } = props.portalState
  return (
    <section className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm" aria-busy={loading}>
      <PortalSnapshotStatusRow
        loading={loading}
        source={source}
        showBadge={false}
        endExtra={
          <Link
            to="/member/statistics"
            aria-label="ไปหน้า สถิติสมาชิก"
            className={`tap-target rounded-lg bg-fuchsia-900/50 px-2.5 py-1 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-800/60 ${portalFocusRing}`}
          >
            ไปสถิติสมาชิก
          </Link>
        }
      >
        <p className="text-xs text-slate-400">
          สถิติสมาคมจากสแนปช็อต — กราฟคำร้อง 7 วันและสัดส่วนรุ่นอยู่ที่เมนูสถิติ (แหล่งข้อมูล: แถบบทบาทด้านบน)
        </p>
      </PortalSnapshotStatusRow>
    </section>
  )
}

function MemberStaffDocumentsPage() {
  const links = [
    {
      to: '/admin',
      title: 'แผงผู้ดูแล (Admin)',
      description: 'นำเข้าสมาชิก การเงิน กิจกรรมโรงเรียน — จุดทำงานหลักของเจ้าหน้าที่',
    },
    {
      to: '/requests',
      title: 'คำร้องสมาชิก',
      description: 'อนุมัติและติดตามคำร้องลงทะเบียน/แก้ไขข้อมูล',
    },
    {
      to: '/committee/dashboard',
      title: 'พอร์ทัลคณะกรรมการ',
      description: 'สรุปการประชุม การเงิน ทะเบียน และวาระลงมติ',
    },
    {
      to: '/academy/dashboard',
      title: 'พอร์ทัลโรงเรียนกวดวิชา (Academy)',
      description: 'โรงเรียนกวดวิชา — ห้องเรียน คอร์ส และขั้นตอนสมัคร (Funnel)',
    },
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="ลิงก์สำหรับงานเชิงกำกับดูแล">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลเชิงกำกับดูแล</h3>
        <p className="mt-2 text-sm text-slate-400">
          ศูนย์ลิงก์สำหรับเจ้าหน้าที่สมาคม — รายงานปิดงบ หลักฐานการเงิน และบันทึกร่องรอย (audit trail) อยู่ในขั้นตอนงานการเงิน (workflow)
          ของผู้ดูแล (Admin) และบัญชีแยกประเภท
          ในระบบหลังบ้าน
        </p>
        <ul className="mt-5 space-y-3" role="list" aria-label="ลิงก์ทางลัดสำหรับเจ้าหน้าที่สมาคม">
          {links.map((item) => (
            <li key={item.to} role="listitem">
              <Link
                to={item.to}
                aria-label={`ไปหน้า ${item.title}`}
                className={`block rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 transition hover:border-fuchsia-800/60 hover:bg-slate-900/70 ${portalFocusRing}`}
              >
                <p className="font-medium text-fuchsia-200">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-slate-400">
          หมายเหตุ: การเข้าถึงข้อมูลส่วนบัญชีอาจต้องใช้คีย์หรือสิทธิ์ตามที่กำหนดในแผงผู้ดูแล (Admin)
        </p>
      </section>
    </div>
  )
}

function memberStr(m: Record<string, unknown>, key: string): string {
  const v = m[key]
  if (v == null || v === '') return ''
  return String(v).trim()
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || 'สมาชิก'
  const batch = memberStr(props.member, 'batch') || '—'
  const code = memberStr(props.member, 'member_code')
  const status = memberStr(props.member, 'membership_status') || '—'
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl border border-fuchsia-800/50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-xl ring-1 ring-fuchsia-500/20">
          <div className="bg-fuchsia-950/50 px-6 py-4 text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-fuchsia-400">YRC Smart Alumni</p>
            <p className="mt-1 text-xs text-slate-400">บัตรสมาชิกดิจิทัล</p>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="text-xl font-semibold text-white">{fullName}</p>
            <p className="mt-2 text-sm text-slate-400">รุ่น {batch}</p>
            <div className="mt-6 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/80 text-[10px] text-slate-400">
                QR
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-left text-sm">
              <div className="flex justify-between gap-4 border-t border-slate-800 pt-3">
                <dt className="text-slate-400">รหัสสมาชิก</dt>
                <dd className="font-mono text-xs text-slate-300">{code || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">สถานะ</dt>
                <dd className="text-slate-200">{status}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          to="/member/profile"
          aria-label="ไปหน้า ข้อมูลส่วนตัวสมาชิก"
          className={`rounded-lg bg-fuchsia-800 px-4 py-2 text-sm text-white hover:bg-fuchsia-700 ${portalFocusRing}`}
        >
          ข้อมูลส่วนตัว
        </Link>
        <Link
          to="/member/dashboard"
          aria-label="กลับไปหน้า แดชบอร์ดสมาชิก"
          className={`rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
        >
          แดชบอร์ด
        </Link>
      </div>
    </div>
  )
}

function MemberProfilePage(props: { member: Record<string, unknown> }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'ชื่อ', value: [memberStr(props.member, 'first_name'), memberStr(props.member, 'last_name')].filter(Boolean).join(' ') || '—' },
    { label: 'รุ่น', value: memberStr(props.member, 'batch') || '—' },
    { label: 'รหัสสมาชิก', value: memberStr(props.member, 'member_code') || '—' },
    { label: 'สถานะสมาชิก', value: memberStr(props.member, 'membership_status') || '—' },
    { label: 'อีเมล', value: memberStr(props.member, 'email') || '—' },
    { label: 'โทรศัพท์', value: memberStr(props.member, 'phone') || '—' },
    { label: 'จังหวัด', value: memberStr(props.member, 'province') || '—' },
  ]
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="ข้อมูลส่วนตัวสมาชิกแบบอ่านอย่างเดียว">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">ข้อมูลส่วนตัว</h3>
        <p className="mt-2 text-sm text-slate-400">ข้อมูลจากบัญชีที่ลงทะเบียนแล้ว — แก้ไขผ่านคำร้องอัปเดตข้อมูล</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2" role="list" aria-label="รายการข้อมูลส่วนตัวสมาชิก">
          {rows.map((r) => (
            <div key={r.label} className="rounded border border-slate-800/80 bg-slate-900/30 px-3 py-2" role="listitem">
              <dt className="text-xs text-slate-400">{r.label}</dt>
              <dd className="mt-0.5 text-sm text-slate-100">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          หากข้อมูลไม่ครบหรือต้องแก้ไข ใช้ flow คำร้องในแอปหลักหลังเชื่อม LINE
        </p>
      </section>
    </div>
  )
}

function MemberStatisticsPage(props: { roleView: MemberRoleView; portalState: PortalDataState<MemberPortalData> }) {
  const { data, loading, source } = props.portalState
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4" aria-busy={loading}>
        <PortalSectionHeader
          loading={loading}
          source={source}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">ข้อมูลสแนปช็อต</p>
        </PortalSectionHeader>
      </section>
      {loading ? (
        <PortalContentLoading className="text-sm text-slate-400" />
      ) : (
        <>
          <MetricCards items={data.statsCards} />
          <MetricCards items={data.roleCards[props.roleView]} />
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">คำร้องใหม่ 7 วัน (UTC)</h3>
            <p className="mt-2 text-sm text-slate-400">
              จำนวนคำร้องต่อวันจาก <code className="text-slate-400">member_update_requests</code> — เทียบกับแนวโน้มในพอร์ทัลคณะกรรมการ
            </p>
            <TrendBars items={data.requestTrend} color="cyan" />
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สัดส่วนสมาชิกตามรุ่น</h3>
            <TrendBars items={data.batchDistribution} color="fuchsia" />
          </section>
        </>
      )}
    </div>
  )
}

type MemberDonationHistoryRow = {
  id: string
  amount: number
  createdAt: string | null
  /** เวลาโอนที่สมาชิกระบุ (ถ้ามี) — แยกจากเวลาที่ระบบบันทึก */
  transferAt?: string | null
  activityId: string | null
  activityTitle: string | null
  activityCategory: string | null
  fundScope: string | null
  slipFileUrl: string | null
  note: string | null
}

function formatThDateTime(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim()) return '—'
  const d = new Date(String(iso))
  return Number.isFinite(d.getTime()) ? d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function fundScopeLabelTh(scope: string | null): string {
  if (scope === 'yupparaj_school') return 'กองโรงเรียนยุพราช'
  if (scope === 'association') return 'สมาคม'
  if (scope === 'cram_school') return 'กวดวิชา'
  return '—'
}

function MemberDonationsPage(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  portalState: PortalDataState<MemberPortalData>
}) {
  const { data, loading, source } = props.portalState
  const portalMockMode = !loading && source === 'mock'
  const [activityId, setActivityId] = useState('')
  const [amount, setAmount] = useState('')
  const [transferAt, setTransferAt] = useState('')
  const [slipUrl, setSlipUrl] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const [history, setHistory] = useState<MemberDonationHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyErr, setHistoryErr] = useState<string | null>(null)

  const donorName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '—'
  const donorBatch = props.member.batch != null ? String(props.member.batch) : '—'
  const donorBatchName = props.member.batch_name != null ? String(props.member.batch_name) : '—'

  const loadDonationHistory = useCallback(async () => {
    if (!props.lineUid.trim()) {
      setHistory([])
      return
    }
    if (!props.portalState.loading && props.portalState.source === 'mock') {
      setHistory(memberDonationHistoryMock.map((r) => ({ ...r })))
      setHistoryErr(null)
      setHistoryLoading(false)
      return
    }
    if (props.portalState.loading) return
    setHistoryLoading(true)
    setHistoryErr(null)
    try {
      const r = await fetch(`${props.apiBase.replace(/\/$/, '')}/api/members/donations/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_uid: props.lineUid.trim() }),
      })
      const j = (await r.json().catch(() => ({}))) as {
        error?: string
        ok?: boolean
        donations?: MemberDonationHistoryRow[]
      }
      if (!r.ok) {
        setHistoryErr(j.error ?? `ไม่สำเร็จ (HTTP ${r.status})`)
        setHistory([])
        return
      }
      setHistory(Array.isArray(j.donations) ? j.donations : [])
    } catch {
      setHistoryErr('เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [props.apiBase, props.lineUid, props.portalState.loading, props.portalState.source])

  useEffect(() => {
    if (props.portalState.loading) return
    if (props.portalState.source === 'mock') {
      if (!props.lineUid.trim()) {
        setHistory([])
        return
      }
      setHistory(memberDonationHistoryMock.map((r) => ({ ...r })))
      setHistoryErr(null)
      setHistoryLoading(false)
      return
    }
    void loadDonationHistory()
  }, [loadDonationHistory, props.lineUid, props.portalState.loading, props.portalState.source])

  const submitDonation = useCallback(async () => {
    if (!props.lineUid.trim()) {
      setFormMsg('ต้องลงชื่อเข้าใช้ด้วย LINE และผูกสมาชิกก่อนบริจาค')
      return
    }
    if (!activityId.trim()) {
      setFormMsg('เลือกกิจกรรม/โครงการ')
      return
    }
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      setFormMsg('กรอกจำนวนเงินที่มากกว่า 0')
      return
    }
    setSubmitting(true)
    setFormMsg(null)
    try {
      const body: Record<string, unknown> = {
        line_uid: props.lineUid.trim(),
        activity_id: activityId.trim(),
        amount: n,
      }
      if (transferAt.trim()) body.transfer_at = new Date(transferAt).toISOString()
      if (slipUrl.trim()) body.slip_file_url = slipUrl.trim()
      if (note.trim()) body.note = note.trim()
      const r = await fetch(`${props.apiBase.replace(/\/$/, '')}/api/members/donations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!r.ok) {
        setFormMsg(j.error ?? `ไม่สำเร็จ (HTTP ${r.status})`)
        return
      }
      setFormMsg('บันทึกการบริจาคแล้ว ขอบคุณที่สนับสนุน')
      setAmount('')
      setSlipUrl('')
      setNote('')
      void props.portalState.refetch()
      void loadDonationHistory()
    } catch {
      setFormMsg('เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }, [activityId, amount, loadDonationHistory, note, props.apiBase, props.lineUid, props.portalState, slipUrl, transferAt])

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย</h3>
            <p className="mt-2 text-sm text-slate-400">
              เลือกโครงการ (เช่น ทุนอาหารกลางวัน ทุนการศึกษา) กรอกยอดโอน และแนบลิงก์สลิป — ยอดกองนี้แยกจากรายรับของสมาคมศิษย์เก่าและโรงเรียนกวดวิชา
            </p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <>
            <div
              className="mt-4 rounded border border-slate-800/80 bg-slate-900/30 p-3 text-sm text-slate-300"
              aria-label="ข้อมูลผู้บริจาคจากทะเบียนสมาชิก"
            >
              <p>
                <span className="text-slate-400">ผู้บริจาค:</span> {donorName}{' '}
                <span className="text-slate-400">· รุ่น</span> {donorBatch}{' '}
                <span className="text-slate-400">· ชื่อรุ่น</span> {donorBatchName}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2" role="list" aria-label="โครงการโรงเรียนยุพราช (กองแยกจากนิติบุคคลสมาคม/กวดวิชา)">
              {data.yupparajDonationActivities.length === 0 ? (
                <p className="text-sm text-amber-200/90 md:col-span-2">
                  ยังไม่มีรายการกิจกรรมประเภทโรงเรียนยุพราชในระบบ — ผู้ดูแลสามารถเพิ่มที่ Admin → คอร์ส/กิจกรรม และตั้งค่าเป็น &quot;กองโรงเรียนยุพราช&quot;
                </p>
              ) : (
                data.yupparajDonationActivities.map((a) => {
                  const pct =
                    a.targetAmount != null && a.targetAmount > 0
                      ? Math.min(100, Math.round((a.raisedAmount / a.targetAmount) * 100))
                      : 0
                  return (
                    <div key={a.id} role="listitem">
                      <DonationCampaignCard
                        title={`${a.title} (${a.category})`}
                        progress={pct}
                        target={a.targetAmount != null ? Math.round(a.targetAmount).toLocaleString('th-TH') : '—'}
                        raised={Math.round(a.raisedAmount).toLocaleString('th-TH')}
                      />
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-6 space-y-3 rounded-lg border border-fuchsia-900/40 bg-fuchsia-950/15 p-4" aria-label="ฟอร์มบันทึกการบริจาค">
              <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-200/90">บันทึกการโอน</p>
              <label className="block text-xs text-slate-400">
                เลือกโครงการ
                <select
                  value={activityId}
                  onChange={(e) => setActivityId(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                >
                  <option value="">— เลือก —</option>
                  {data.yupparajDonationActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-400">
                จำนวนเงิน (บาท)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                  placeholder="เช่น 500"
                />
              </label>
              <label className="block text-xs text-slate-400">
                วันเวลาโอน (ถ้ามี)
                <input
                  type="datetime-local"
                  value={transferAt}
                  onChange={(e) => setTransferAt(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                />
              </label>
              <label className="block text-xs text-slate-400">
                ลิงก์แนบสลิป (URL รูปภาพหรือไฟล์ที่อัปโหลดแล้ว)
                <input
                  type="url"
                  value={slipUrl}
                  onChange={(e) => setSlipUrl(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                  placeholder="https://..."
                />
              </label>
              <label className="block text-xs text-slate-400">
                หมายเหตุ (ถ้ามี)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                />
              </label>
              {formMsg ? (
                <p className={`text-sm ${formMsg.includes('แล้ว') ? 'text-fuchsia-300' : 'text-amber-300'}`} role="status">
                  {formMsg}
                </p>
              ) : null}
              <button
                type="button"
                disabled={submitting || data.yupparajDonationActivities.length === 0}
                onClick={() => void submitDonation()}
                aria-label="ส่งข้อมูลการบริจาค"
                className={`rounded bg-fuchsia-800 px-4 py-2 text-sm text-white hover:bg-fuchsia-700 disabled:opacity-50 ${portalFocusRing}`}
              >
                {submitting ? 'กำลังส่ง…' : 'ยืนยันการบริจาค'}
              </button>
            </div>
            <div
              className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/20 p-4"
              aria-busy={historyLoading}
              aria-label="ประวัติการบริจาคของคุณ"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ประวัติการบริจาคล่าสุด</p>
                <button
                  type="button"
                  onClick={() => void loadDonationHistory()}
                  disabled={historyLoading || !props.lineUid.trim()}
                  className={`tap-target rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 ${portalFocusRing}`}
                >
                  {historyLoading ? 'กำลังโหลด…' : 'รีเฟรช'}
                </button>
              </div>
              {portalMockMode ? (
                <p className="mt-1 text-xs text-slate-400">ตัวอย่าง — พอร์ทัลโหลดจาก snapshot (ไม่มี API)</p>
              ) : null}
              {historyErr ? (
                <p className="mt-2 text-sm text-amber-300" role="status">
                  {historyErr}
                </p>
              ) : history.length === 0 && !historyLoading ? (
                <p className="mt-2 text-sm text-slate-400">ยังไม่มีรายการบริจาคที่บันทึกผ่านพอร์ทัล</p>
              ) : null}
              {history.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-sm text-slate-200">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3 font-medium">บันทึก</th>
                        <th className="py-2 pr-3 font-medium">โอน</th>
                        <th className="py-2 pr-3 font-medium">โครงการ</th>
                        <th className="py-2 pr-3 font-medium">กอง</th>
                        <th className="py-2 pr-3 text-right font-medium">จำนวน</th>
                        <th className="py-2 font-medium">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => {
                        const title =
                          h.activityTitle != null && h.activityTitle !== '—'
                            ? h.activityCategory
                              ? `${h.activityTitle} (${h.activityCategory})`
                              : h.activityTitle
                            : '—'
                        return (
                          <tr key={h.id} className="border-b border-slate-800/60">
                            <td className="py-2 pr-3 align-top text-slate-400">{formatThDateTime(h.createdAt)}</td>
                            <td className="py-2 pr-3 align-top text-slate-400">{formatThDateTime(h.transferAt)}</td>
                            <td className="py-2 pr-3 align-top">{title}</td>
                            <td className="py-2 pr-3 align-top text-slate-400">{fundScopeLabelTh(h.fundScope)}</td>
                            <td className="py-2 pr-3 align-top text-right tabular-nums">
                              {Math.round(h.amount).toLocaleString('th-TH')} ฿
                            </td>
                            <td className="py-2 align-top text-slate-400">
                              {h.slipFileUrl ? (
                                <a
                                  href={h.slipFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-fuchsia-400 underline hover:text-fuchsia-300"
                                >
                                  สลิป
                                </a>
                              ) : null}
                              {h.note ? (
                                <span className={h.slipFileUrl ? ' ml-2' : ''}>{h.note}</span>
                              ) : null}
                              {!h.slipFileUrl && !h.note ? '—' : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 opacity-90" role="list" aria-label="ภาพรวมเดโม (แคมเปญอื่น)">
              {data.donationCampaigns.map((campaign) => (
                <div key={campaign.title} role="listitem">
                  <DonationCampaignCard title={campaign.title} progress={campaign.progress} target={campaign.target} raised={campaign.raised} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function MemberMeetingsPage(props: { portalState: PortalDataState<MemberPortalData> }) {
  const { data, loading, source } = props.portalState
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
        <PortalSectionHeader loading={loading} source={source}>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สาระประชุมและรายรับรายจ่าย</h3>
            <p className="mt-2 text-sm text-slate-400">ข้อมูลที่สมาชิกเข้าถึงได้: สรุปรายงานประชุมและภาพรวมทางการเงิน</p>
          </div>
        </PortalSectionHeader>
        {loading ? (
          <PortalContentLoading />
        ) : (
          <div className="mt-4 space-y-2 text-sm" role="list" aria-label="รายการรายงานประชุมล่าสุด">
            {data.meetingReports.map((meeting) => (
              <MeetingReportRow key={meeting.title} title={meeting.title} date={meeting.date} />
            ))}
          </div>
        )}
      </section>
      {!loading ? <MetricCards items={data.financeCards} /> : null}
    </div>
  )
}

