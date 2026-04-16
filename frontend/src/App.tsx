import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AdminImportPanel } from './components/AdminImportPanel'
import { AdminFinancePanel } from './components/AdminFinancePanel'
import { MemberLinkPanel } from './components/MemberLinkPanel'
import { MemberPortal } from './components/MemberPortal'
import { MemberRequestsPanel } from './components/MemberRequestsPanel'
import { PushOptIn } from './components/PushOptIn'
import {
  clearLineSession,
  readLineFromOAuth,
  readLineName,
  readLineUid,
  readMemberSnapshot,
  setLineSessionFromOAuth,
  setManualLineUid,
  setMemberSnapshot,
  SS_OAUTH_STATE,
} from './lineSession'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID ?? ''
const lineRedirectUri = import.meta.env.VITE_LINE_REDIRECT_URI ?? ''

function getInitialVerifiedMember(): Record<string, unknown> | null {
  const uid = readLineUid()
  const snap = readMemberSnapshot()
  if (uid && snap && String(snap.line_uid ?? '') === uid) return snap
  return null
}

function getMemberDisplayName(member: Record<string, unknown> | null): string {
  if (!member) return ''
  const first = member.first_name != null ? String(member.first_name) : ''
  const last = member.last_name != null ? String(member.last_name) : ''
  return `${first} ${last}`.trim()
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [health, setHealth] = useState<string>('…')
  const [lineUid, setLineUid] = useState(readLineUid)
  const [lineUidFromOAuth, setLineUidFromOAuth] = useState(readLineFromOAuth)
  const [verifiedMember, setVerifiedMember] = useState<Record<string, unknown> | null>(getInitialVerifiedMember)
  const [restoringMemberSession, setRestoringMemberSession] = useState(false)

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((j) => setHealth(JSON.stringify(j)))
      .catch(() =>
        setHealth(
          'ไม่สามารถเชื่อม API — ตรวจว่า backend รันอยู่ และบน production ตั้ง FRONTEND_ORIGINS บน Cloud Run ให้มี origin ของเว็บ (แก้ CORS)',
        ),
      )
  }, [])

  useEffect(() => {
    const uid = readLineUid()
    const snap = readMemberSnapshot()
    if (snap && uid && String(snap.line_uid ?? '') !== uid) {
      setVerifiedMember(null)
    }
    if (!uid) setVerifiedMember(null)
  }, [lineUid])

  useEffect(() => {
    if (!lineUid.trim() || verifiedMember) return

    let cancelled = false
    ;(async () => {
      setRestoringMemberSession(true)
      try {
        const r = await fetch(`${apiBase}/api/members/session-member`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line_uid: lineUid.trim() }),
        })
        const j = (await r.json().catch(() => ({}))) as { member?: Record<string, unknown> }
        if (cancelled || !r.ok || !j.member) return
        setMemberSnapshot(j.member)
        setVerifiedMember(j.member)
        navigate('/member', { replace: true })
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setRestoringMemberSession(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [lineUid, navigate, verifiedMember])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state || !lineRedirectUri) return

    const saved = sessionStorage.getItem(SS_OAUTH_STATE)
    if (!saved || saved !== state) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      return
    }

    sessionStorage.removeItem(SS_OAUTH_STATE)

    ;(async () => {
      try {
        const r = await fetch(`${apiBase}/api/auth/line/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: lineRedirectUri,
          }),
        })
        const j = (await r.json().catch(() => ({}))) as {
          line_uid?: string
          name?: string | null
          error?: string
        }
        if (!r.ok || !j.line_uid) {
          console.error('LINE token exchange failed', j)
          return
        }
        setLineSessionFromOAuth(j.line_uid, j.name ?? undefined)
        setLineUid(j.line_uid)
        setLineUidFromOAuth(true)
        const snap = readMemberSnapshot()
        if (snap && String(snap.line_uid ?? '') === j.line_uid) {
          setVerifiedMember(snap)
          navigate('/member', { replace: true })
        } else {
          navigate('/auth/link', { replace: true })
        }
      } catch (e) {
        console.error(e)
      } finally {
        window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      }
    })()
  }, [navigate])

  function startLineLogin() {
    if (!lineChannelId || !lineRedirectUri) return
    const st = crypto.randomUUID()
    sessionStorage.setItem(SS_OAUTH_STATE, st)
    const u = new URL('https://access.line.me/oauth2/v2.1/authorize')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', lineChannelId)
    u.searchParams.set('redirect_uri', lineRedirectUri)
    u.searchParams.set('state', st)
    u.searchParams.set('scope', 'openid profile')
    window.location.href = u.toString()
  }

  function handleClearLineSession() {
    clearLineSession()
    setLineUid('')
    setLineUidFromOAuth(false)
    setVerifiedMember(null)
  }

  function handleLineUidManualChange(v: string) {
    setLineUid(v)
    setManualLineUid(v)
    setLineUidFromOAuth(false)
  }

  function handleMemberVerified(member: Record<string, unknown>) {
    setMemberSnapshot(member)
    setVerifiedMember(member)
    navigate('/member', { replace: true })
  }

  const showMemberPortal = Boolean(lineUid && verifiedMember)
  const verifiedMemberName = useMemo(() => getMemberDisplayName(verifiedMember), [verifiedMember])
  const portalWidthClass = useMemo(() => {
    if (location.pathname.startsWith('/member')) return 'max-w-5xl'
    if (location.pathname.startsWith('/committee')) return 'max-w-5xl'
    if (location.pathname.startsWith('/academy')) return 'max-w-5xl'
    return 'max-w-2xl'
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight">YRC Smart Alumni</h1>
        <p className="mt-1 text-sm text-slate-400">Member · Committee · Academy portals</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          <NavPill to="/" label="หน้าหลัก" active={location.pathname === '/'} />
          <NavPill to="/auth/link" label="ผูกบัญชี" active={location.pathname.startsWith('/auth/link')} />
          <NavPill to="/member/dashboard" label="สมาชิก" active={location.pathname.startsWith('/member')} />
          <NavPill to="/committee/dashboard" label="คณะกรรมการ" active={location.pathname.startsWith('/committee')} />
          <NavPill to="/academy/dashboard" label="โรงเรียนกวดวิชา" active={location.pathname.startsWith('/academy')} />
          <NavPill to="/requests" label="คำร้อง" active={location.pathname.startsWith('/requests')} />
          <NavPill to="/admin" label="Admin" active={location.pathname.startsWith('/admin')} />
        </nav>
      </header>

      <main className={`mx-auto px-6 py-10 ${portalWidthClass}`}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage health={health} apiBase={apiBase} />
            }
          />
          <Route
            path="/auth/link"
            element={
              <LinkPage
                apiBase={apiBase}
                lineUid={lineUid}
                lineUidFromOAuth={lineUidFromOAuth}
                restoringMemberSession={restoringMemberSession}
                verifiedMember={verifiedMember}
                verifiedMemberName={verifiedMemberName}
                onLineUidChange={handleLineUidManualChange}
                onClearLineSession={handleClearLineSession}
                onStartLineLogin={startLineLogin}
                lineLoginAvailable={Boolean(lineChannelId && lineRedirectUri)}
                onMemberVerified={handleMemberVerified}
              />
            }
          />
          <Route
            path="/member/*"
            element={
              showMemberPortal ? (
                <MemberArea
                  apiBase={apiBase}
                  lineUid={lineUid}
                  member={verifiedMember!}
                  onMemberUpdated={(m) => {
                    setVerifiedMember(m)
                    setMemberSnapshot(m)
                  }}
                  lineDisplayName={readLineName()}
                />
              ) : (
                <MissingMemberSession />
              )
            }
          />
          <Route path="/committee/*" element={<CommitteeDashboard />} />
          <Route path="/academy/*" element={<AcademyDashboard />} />
          <Route path="/requests" element={<MemberRequestsPanel apiBase={apiBase} />} />
          <Route
            path="/admin"
            element={
              <>
                <AdminImportPanel apiBase={apiBase} />
                <AdminFinancePanel apiBase={apiBase} />
              </>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

function NavPill({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  )
}

function HomePage({ health, apiBase }: { health: string; apiBase: string }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Backend /health</h2>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-left text-sm text-emerald-300">{health}</pre>
      <p className="mt-4 text-sm text-slate-500">
        ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน <code className="text-slate-300">frontend/.env</code>{' '}
        และค่า LINE ใน <code className="text-slate-300">VITE_LINE_*</code> / backend <code className="text-slate-300">LINE_*</code>
      </p>
      <PushOptIn apiBase={apiBase} />
    </section>
  )
}

function LinkPage(props: {
  apiBase: string
  lineUid: string
  lineUidFromOAuth: boolean
  restoringMemberSession: boolean
  verifiedMember: Record<string, unknown> | null
  verifiedMemberName: string
  lineLoginAvailable: boolean
  onLineUidChange: (v: string) => void
  onClearLineSession: () => void
  onStartLineLogin: () => void
  onMemberVerified: (m: Record<string, unknown>) => void
}) {
  const hasMember = Boolean(props.verifiedMember && props.lineUid)
  return (
    <>
      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Member Session Status</p>
            {props.restoringMemberSession ? (
              <p className="mt-1 text-emerald-200">กำลังกู้ session สมาชิกจาก LINE UID...</p>
            ) : hasMember ? (
              <p className="mt-1 text-emerald-200">
                ผูกสมาชิกแล้ว: {props.verifiedMemberName || 'สมาชิกที่ผูกไว้'}{' '}
                {readLineName() ? `· LINE ${readLineName()}` : ''}
              </p>
            ) : props.lineUid ? (
              <p className="mt-1 text-amber-200">มี LINE UID แล้ว แต่ยังไม่ได้ผูกสมาชิกในรอบนี้</p>
            ) : (
              <p className="mt-1 text-slate-400">ยังไม่มี LINE session หรือ member session</p>
            )}
          </div>
          {hasMember ? (
            <Link to="/member/dashboard" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              ไปหน้าสมาชิก
            </Link>
          ) : null}
        </div>
      </section>
      {props.restoringMemberSession ? (
        <section className="mb-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-100/90">
          กำลังกู้ session สมาชิกจาก LINE UID...
        </section>
      ) : null}
      <MemberLinkPanel
        apiBase={props.apiBase}
        lineUid={props.lineUid}
        lineUidFromOAuth={props.lineUidFromOAuth}
        onLineUidChange={props.onLineUidChange}
        onClearLineSession={props.onClearLineSession}
        lineLoginAvailable={props.lineLoginAvailable}
        onStartLineLogin={props.onStartLineLogin}
        onMemberVerified={props.onMemberVerified}
      />
    </>
  )
}

function MissingMemberSession() {
  return (
    <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 text-sm text-amber-100/90">
      <p>ยังไม่มีข้อมูลสมาชิกในวาระนี้ — ไปที่หน้า &quot;ผูกบัญชี&quot; แล้วกด &quot;ตรวจสอบและผูก&quot; เมื่อพบในทะเบียน</p>
      <Link to="/auth/link" className="mt-4 inline-flex rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700">
        ไปหน้าผูกบัญชี
      </Link>
    </section>
  )
}

function MemberArea(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  lineDisplayName: string
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  const memberNav = [
    { to: '/member/dashboard', label: 'Dashboard' },
    { to: '/member/card', label: 'บัตรสมาชิก' },
    { to: '/member/profile', label: 'ข้อมูลส่วนตัว' },
    { to: '/member/statistics', label: 'สถิติสมาชิก' },
    { to: '/member/donations', label: 'สนับสนุนกิจกรรม' },
    { to: '/member/meetings', label: 'ประชุมและการเงิน' },
  ]

  return (
    <PortalShell
      title="Member Portal"
      subtitle="เมนูสมาชิก · บัตรสมาชิก · ข้อมูลส่วนตัว · สถิติ · การสนับสนุน"
      navItems={memberNav}
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <MemberPortal
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              onMemberUpdated={props.onMemberUpdated}
              lineDisplayName={props.lineDisplayName}
            />
          }
        />
        <Route path="card" element={<MemberCardPage member={props.member} />} />
        <Route path="profile" element={<MemberProfilePage member={props.member} />} />
        <Route path="statistics" element={<MemberStatisticsPage />} />
        <Route path="donations" element={<MemberDonationsPage />} />
        <Route path="meetings" element={<MemberMeetingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalShell>
  )
}

function CommitteeDashboard() {
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
        <Route path="members" element={<SectionPlaceholder title="ทะเบียนสมาชิก" description="ค้นหา/กรองสมาชิก, ดูข้อมูลเชิงลึก และสถิติสมาชิกสำหรับคณะกรรมการ" />} />
        <Route path="finance" element={<SectionPlaceholder title="การเงินแบบละเอียด" description="รายรับรายจ่ายสมาคมและโรงเรียนกวดวิชาแบบละเอียด พร้อมเอกสารประกอบ" />} />
        <Route path="meetings" element={<SectionPlaceholder title="วาระและรายงานการประชุม" description="จัดการวาระประชุม, รายงานการประชุม และสรุปผลแต่ละครั้ง" />} />
        <Route path="attendance" element={<SectionPlaceholder title="ลงทะเบียนและลงชื่อประชุม" description="ระบบลงทะเบียนเข้าร่วมประชุม, เช็กชื่อ, และติดตาม quorum" />} />
        <Route path="voting" element={<SectionPlaceholder title="การลงมติ" description="เปิดวาระลงมติ, ลงคะแนน, และดูผลการลงมติในแต่ละหัวข้อ" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalShell>
  )
}

function AcademyDashboard() {
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
        <Route path="students" element={<SectionPlaceholder title="ข้อมูลนักเรียนและห้องเรียน" description="ภาพรวมจำนวนนักเรียนรายห้อง, รายชื่อนักเรียนรายคน, และการกระจายระดับชั้น" />} />
        <Route path="courses" element={<SectionPlaceholder title="คอร์สเรียน" description="จัดการรายการคอร์สเรียน, รอบเรียน, และข้อมูลครูผู้สอนแต่ละคอร์ส" />} />
        <Route path="enrollment" element={<SectionPlaceholder title="สมัครเรียน" description="ระบบสมัครเรียน, ตรวจเอกสาร, และติดตามสถานะการสมัคร" />} />
        <Route path="results" element={<SectionPlaceholder title="ผลการเรียนและคะแนน" description="ผลการเรียนรายบุคคล, คะแนนรายวิชา, และสรุปผลสัมฤทธิ์" />} />
        <Route path="reports" element={<SectionPlaceholder title="รายงานเชิง infographic" description="dashboard สำหรับผู้บริหาร ครู นักเรียน และผู้ปกครองตามสิทธิ์การเข้าถึง" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PortalShell>
  )
}

function PortalShell(props: {
  title: string
  subtitle: string
  navItems: Array<{ to: string; label: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:p-5">
      <div className="mb-4 border-b border-slate-800 pb-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">{props.title}</h2>
        <p className="mt-2 text-sm text-slate-400">{props.subtitle}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">เมนูพอร์ทัล</p>
          <nav className="space-y-1.5">
            {props.navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 text-sm ${
                    isActive ? 'bg-emerald-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">{props.children}</div>
      </div>
    </section>
  )
}

function MetricCards(props: { items: Array<{ label: string; value: string; hint: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{item.value}</p>
          <p className="mt-2 text-xs text-slate-400">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}

function CommitteeDashboardPage() {
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
      <SectionPlaceholder
        title="Dashboard คณะกรรมการ"
        description="พื้นที่นี้เตรียมไว้สำหรับกราฟแนวโน้มสมาชิก, การเงินรายเดือน, attendance trend, และผลลงมติ"
      />
    </div>
  )
}

function AcademyDashboardPage() {
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
      <SectionPlaceholder
        title="Dashboard โรงเรียนกวดวิชา"
        description="พื้นที่นี้เตรียมไว้สำหรับ infographic แยกตาม role: ผู้บริหาร/ครู/นักเรียน/ผู้ปกครอง"
      />
    </div>
  )
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  const batch = props.member.batch != null ? String(props.member.batch) : '-'
  const lineUid = props.member.line_uid != null ? String(props.member.line_uid) : '-'
  return (
    <SectionPlaceholder
      title="บัตรสมาชิกดิจิทัล"
      description={`เตรียมหน้าบัตรสมาชิกสำหรับ ${fullName} · รุ่น ${batch} · LINE UID ${lineUid}`}
    />
  )
}

function MemberProfilePage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  return (
    <SectionPlaceholder
      title="ข้อมูลส่วนตัวสมาชิก"
      description={`เตรียมหน้าจัดการข้อมูลส่วนตัวและประวัติคำขอแก้ไขข้อมูลของ ${fullName}`}
    />
  )
}

function MemberStatisticsPage() {
  return (
    <div className="space-y-4">
      <MetricCards
        items={[
          { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'ภาพรวมทั้งสมาคมศิษย์เก่า' },
          { label: 'จำนวนรุ่น', value: '58', hint: 'รุ่นที่มีข้อมูลในทะเบียน' },
          { label: 'สมาชิก active', value: '1,019', hint: 'มี session/การใช้งานล่าสุด' },
          { label: 'คำร้องเดือนนี้', value: '42', hint: 'คำร้องอัปเดตข้อมูลทั้งหมด' },
        ]}
      />
      <SectionPlaceholder
        title="สถิติสมาชิก"
        description="พื้นที่นี้เตรียมสำหรับกราฟสมาชิกแยกรุ่น, สมาชิกใหม่รายเดือน, และการมีส่วนร่วมกิจกรรม"
      />
    </div>
  )
}

function MemberDonationsPage() {
  return (
    <SectionPlaceholder
      title="สนับสนุนกิจกรรมโรงเรียน"
      description="พื้นที่นี้เตรียมสำหรับบริจาคเงิน, แนบสลิป, และดูประวัติการสนับสนุนกิจกรรมของสมาชิก"
    />
  )
}

function MemberMeetingsPage() {
  return (
    <SectionPlaceholder
      title="สาระประชุมและรายรับรายจ่าย"
      description="พื้นที่นี้เตรียมสำหรับอ่านสาระการประชุม, รายงานประชุม, และรายรับรายจ่ายในระดับสมาชิก"
    />
  )
}

function SectionPlaceholder(props: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">{props.title}</h3>
      <p className="mt-3 text-sm text-slate-400">{props.description}</p>
    </section>
  )
}

function NotFound() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Not Found</h2>
      <p className="mt-3 text-sm text-slate-400">ไม่พบหน้านี้</p>
      <Link to="/" className="mt-4 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700">
        กลับหน้าหลัก
      </Link>
    </section>
  )
}
