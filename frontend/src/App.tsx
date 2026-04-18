import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppRolesProvider } from './context/AppRolesProvider'
import { useAppRoles } from './context/useAppRoles'
import { enforceAppRbac, RBAC_NAV, rolesAllow } from './lib/appRoles'
import { RequireAppRoles } from './components/RequireAppRoles'
const AdminImportPanel = lazy(async () => {
  const m = await import('./components/AdminImportPanel')
  return { default: m.AdminImportPanel }
})
const AdminFinancePanel = lazy(async () => {
  const m = await import('./components/AdminFinancePanel')
  return { default: m.AdminFinancePanel }
})
const AdminCramPanel = lazy(async () => {
  const m = await import('./components/AdminCramPanel')
  return { default: m.AdminCramPanel }
})
const AdminSchoolActivitiesPanel = lazy(async () => {
  const m = await import('./components/AdminSchoolActivitiesPanel')
  return { default: m.AdminSchoolActivitiesPanel }
})
import { AdminHomePage, AdminLayout } from './components/AdminArea'
import { CramQrEntryPage } from './components/CramQrEntryPage'
import { MemberLinkPanel } from './components/MemberLinkPanel'
import { MemberRequestsPanel } from './components/MemberRequestsPanel'
import { PushOptIn } from './components/PushOptIn'
import { AcademyArea } from './portal/academyPages'
import { CommitteeArea } from './portal/committeePages'
import { MemberArea } from './portal/memberPages'
import {
  LINE_ENTRY_QUERY_PARAM,
  captureLineEntryFromSearchParams,
  isLineEntrySource,
  lineEntrySourceDescription,
  readLineEntrySource,
} from './lib/lineEntrySource'
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

const adminPanelSuspenseFallback = (
  <div
    className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400"
    role="status"
    aria-live="polite"
  >
    กำลังโหลดแผงผู้ดูแล…
  </div>
)
const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID ?? ''

/**
 * Callback URL สำหรับ LINE OAuth ต้องตรงกับที่ลงทะเบียนใน LINE Developers และกับ body `redirect_uri` ตอนแลก token
 * ใน dev ใช้ origin ปัจจุบันเสมอ — กันปัญหา `VITE_LINE_REDIRECT_URI` ชี้ Vercel แล้วหลังล็อกอินเบราว์เซอร์ไปโผล่ที่ production
 */
function getLineRedirectUri(): string {
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`
    }
    return 'http://localhost:5173/'
  }
  return (import.meta.env.VITE_LINE_REDIRECT_URI ?? '').trim()
}

type RoleView = 'all' | 'member' | 'committee' | 'academy'

/** วงโฟกัสคีย์บอร์ด — ใช้ร่วมกับปุ่ม/ลิงก์ในแอปหลัก */
const appFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

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
  const [entrySourceVersion, setEntrySourceVersion] = useState(0)
  const [linkedMemberVersion, setLinkedMemberVersion] = useState(0)
  const [health, setHealth] = useState<string>('…')
  const [lineUid, setLineUid] = useState(readLineUid)
  const [lineUidFromOAuth, setLineUidFromOAuth] = useState(readLineFromOAuth)
  const [verifiedMember, setVerifiedMember] = useState<Record<string, unknown> | null>(getInitialVerifiedMember)
  const [restoringMemberSession, setRestoringMemberSession] = useState(false)
  const [roleView, setRoleView] = useState<RoleView>('all')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const raw = params.get(LINE_ENTRY_QUERY_PARAM)?.trim()
    if (raw && isLineEntrySource(raw)) {
      captureLineEntryFromSearchParams(location.search)
      setEntrySourceVersion((n) => n + 1)
      params.delete(LINE_ENTRY_QUERY_PARAM)
      const qs = params.toString()
      const next = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`
      navigate(next, { replace: true })
    }
  }, [location.search, location.pathname, location.hash, navigate])

  useEffect(() => {
    if (location.pathname === '/entry/cram-qr') {
      setEntrySourceVersion((n) => n + 1)
    }
  }, [location.pathname])

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
        setLinkedMemberVersion((n) => n + 1)
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
    const redirectUri = getLineRedirectUri()
    if (!code || !state || !redirectUri) return

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
            redirect_uri: redirectUri,
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
          setLinkedMemberVersion((n) => n + 1)
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
    const redirectUri = getLineRedirectUri()
    if (!lineChannelId || !redirectUri) return
    const st = crypto.randomUUID()
    sessionStorage.setItem(SS_OAUTH_STATE, st)
    const u = new URL('https://access.line.me/oauth2/v2.1/authorize')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('client_id', lineChannelId)
    u.searchParams.set('redirect_uri', redirectUri)
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
    setLinkedMemberVersion((n) => n + 1)
    navigate('/member', { replace: true })
  }

  const showMemberPortal = Boolean(lineUid && verifiedMember)
  const verifiedMemberName = useMemo(() => getMemberDisplayName(verifiedMember), [verifiedMember])

  return (
    <AppRolesProvider
      apiBase={apiBase}
      lineUid={lineUid}
      enforced={enforceAppRbac()}
      entrySourceVersion={entrySourceVersion}
      linkedMemberVersion={linkedMemberVersion}
    >
      <AppChrome
        health={health}
        apiBase={apiBase}
        lineUid={lineUid}
        lineUidFromOAuth={lineUidFromOAuth}
        restoringMemberSession={restoringMemberSession}
        verifiedMember={verifiedMember}
        verifiedMemberName={verifiedMemberName}
        showMemberPortal={showMemberPortal}
        roleView={roleView}
        setRoleView={setRoleView}
        lineChannelId={lineChannelId}
        lineRedirectUri={getLineRedirectUri()}
        onLineUidChange={handleLineUidManualChange}
        onClearLineSession={handleClearLineSession}
        onStartLineLogin={startLineLogin}
        onMemberVerified={handleMemberVerified}
        onMemberUpdated={(m) => {
          setVerifiedMember(m)
          setMemberSnapshot(m)
        }}
      />
    </AppRolesProvider>
  )
}

type AppChromeProps = {
  health: string
  apiBase: string
  lineUid: string
  lineUidFromOAuth: boolean
  restoringMemberSession: boolean
  verifiedMember: Record<string, unknown> | null
  verifiedMemberName: string
  showMemberPortal: boolean
  roleView: RoleView
  setRoleView: (v: RoleView) => void
  lineChannelId: string
  lineRedirectUri: string
  onLineUidChange: (v: string) => void
  onClearLineSession: () => void
  onStartLineLogin: () => void
  onMemberVerified: (m: Record<string, unknown>) => void
  onMemberUpdated: (m: Record<string, unknown>) => void
}

function AppChrome(props: AppChromeProps) {
  const location = useLocation()
  const rbac = useAppRoles()
  const rbacGate = !rbac.enforced || !rbac.loading
  const canMember = !rbac.enforced || (rbacGate && rolesAllow(rbac.roles, RBAC_NAV.member))
  const canCommittee = !rbac.enforced || (rbacGate && rolesAllow(rbac.roles, RBAC_NAV.committee))
  const canAcademy = !rbac.enforced || (rbacGate && rolesAllow(rbac.roles, RBAC_NAV.academy))
  const canAdmin = !rbac.enforced || (rbacGate && rolesAllow(rbac.roles, RBAC_NAV.admin))
  const canRequests = !rbac.enforced || (rbacGate && rolesAllow(rbac.roles, RBAC_NAV.requests))

  const showMemberNav = (props.roleView === 'all' || props.roleView === 'member') && canMember
  const showCommitteeNav = (props.roleView === 'all' || props.roleView === 'committee') && canCommittee
  const showAcademyNav = (props.roleView === 'all' || props.roleView === 'academy') && canAcademy

  const roleViewSummaryId = 'app-role-view-summary'
  const roleViewLabel =
    props.roleView === 'all'
      ? 'ทุกพอร์ทัล'
      : props.roleView === 'member'
        ? 'เฉพาะสมาชิก'
        : props.roleView === 'committee'
          ? 'เฉพาะคณะกรรมการ'
          : 'เฉพาะโรงเรียนกวดวิชา'
  const visiblePortalCount = Number(showMemberNav) + Number(showCommitteeNav) + Number(showAcademyNav)

  const portalWidthClass = useMemo(() => {
    if (location.pathname.startsWith('/member')) return 'max-w-5xl'
    if (location.pathname.startsWith('/committee')) return 'max-w-5xl'
    if (location.pathname.startsWith('/academy')) return 'max-w-5xl'
    if (location.pathname.startsWith('/admin')) return 'max-w-5xl'
    if (location.pathname.startsWith('/entry')) return 'max-w-3xl'
    return 'max-w-2xl'
  }, [location.pathname])

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#app-main"
        className={`absolute left-4 top-0 z-[100] -translate-y-full rounded-b bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow transition focus-visible:translate-y-0 ${appFocusRing}`}
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight">YRC Smart Alumni</h1>
        <p className="mt-1 text-sm text-slate-400">พอร์ทัลสมาชิก · คณะกรรมการ · โรงเรียนกวดวิชา (Academy)</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">มุมมองบทบาท</span>
          <select
            value={props.roleView}
            onChange={(e) => props.setRoleView(e.target.value as RoleView)}
            aria-label="เลือกมุมมองบทบาทของพอร์ทัล"
            aria-describedby={roleViewSummaryId}
            className={`rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 ${appFocusRing}`}
          >
            <option value="all">ทุกพอร์ทัล</option>
            <option value="member">เฉพาะสมาชิก</option>
            <option value="committee">เฉพาะคณะกรรมการ</option>
            <option value="academy">เฉพาะโรงเรียนกวดวิชา (Academy)</option>
          </select>
          <span className="text-xs text-slate-500">จำลองการมองเห็นเมนูตามสิทธิ์</span>
          <span id={roleViewSummaryId} className="text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
            มุมมองปัจจุบัน: {roleViewLabel} · พอร์ทัลที่แสดง {visiblePortalCount.toLocaleString('th-TH')} หมวด
          </span>
        </div>
        {import.meta.env.DEV && !rbac.enforced ? (
          <p className="mt-2 text-xs text-slate-500">
            RBAC ปิดอยู่ — ตั้ง <code className="text-slate-400">VITE_ENFORCE_APP_RBAC=true</code> เพื่อกันเส้นทางตามบทบาทใน DB
          </p>
        ) : null}
        {rbac.enforced && rbac.rolesFetchFailed && !rbac.loading ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-300/90" role="alert">
            <span>โหลดสิทธิ์จากเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจว่า API ทำงานอยู่</span>
            <button
              type="button"
              onClick={() => rbac.refetchRoles()}
              className={`rounded-md border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-rose-100 hover:bg-rose-950/70 ${appFocusRing}`}
            >
              ลองอีกครั้ง
            </button>
          </div>
        ) : null}
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="เมนูหลัก">
          <NavPill to="/" label="หน้าหลัก" active={location.pathname === '/'} />
          <NavPill to="/auth/link" label="ผูกบัญชี" active={location.pathname.startsWith('/auth/link')} />
          {showMemberNav ? <NavPill to="/member/dashboard" label="สมาชิก" active={location.pathname.startsWith('/member')} /> : null}
          {showCommitteeNav ? <NavPill to="/committee/dashboard" label="คณะกรรมการ" active={location.pathname.startsWith('/committee')} /> : null}
          {showAcademyNav ? <NavPill to="/academy/dashboard" label="โรงเรียนกวดวิชา" active={location.pathname.startsWith('/academy')} /> : null}
          {canRequests ? <NavPill to="/requests" label="คำร้อง" active={location.pathname.startsWith('/requests')} /> : null}
          {canAdmin ? <NavPill to="/admin" label="ผู้ดูแล (Admin)" active={location.pathname.startsWith('/admin')} /> : null}
        </nav>
      </header>

      <main
        id="app-main"
        tabIndex={-1}
        className={`mx-auto px-6 py-10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/45 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${portalWidthClass}`}
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage health={props.health} apiBase={props.apiBase} />
            }
          />
          <Route path="/entry/cram-qr" element={<CramQrEntryPage />} />
          <Route
            path="/auth/link"
            element={
              <LinkPage
                apiBase={props.apiBase}
                lineUid={props.lineUid}
                lineUidFromOAuth={props.lineUidFromOAuth}
                restoringMemberSession={props.restoringMemberSession}
                verifiedMember={props.verifiedMember}
                verifiedMemberName={props.verifiedMemberName}
                onLineUidChange={props.onLineUidChange}
                onClearLineSession={props.onClearLineSession}
                onStartLineLogin={props.onStartLineLogin}
                lineLoginAvailable={Boolean(props.lineChannelId && props.lineRedirectUri)}
                onMemberVerified={props.onMemberVerified}
              />
            }
          />
          <Route
            path="/member/*"
            element={
              props.showMemberPortal ? (
                <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.member}>
                  <MemberArea
                    apiBase={props.apiBase}
                    lineUid={props.lineUid}
                    member={props.verifiedMember!}
                    onMemberUpdated={props.onMemberUpdated}
                    lineDisplayName={readLineName()}
                  />
                </RequireAppRoles>
              ) : (
                <MissingMemberSession />
              )
            }
          />
          <Route
            path="/committee/*"
            element={
              <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.committee}>
                <CommitteeArea apiBase={props.apiBase} />
              </RequireAppRoles>
            }
          />
          <Route
            path="/academy/*"
            element={
              <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.academy}>
                <AcademyArea apiBase={props.apiBase} />
              </RequireAppRoles>
            }
          />
          <Route
            path="/requests"
            element={
              <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.requests}>
                <MemberRequestsPanel apiBase={props.apiBase} />
              </RequireAppRoles>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.admin}>
                <AdminLayout />
              </RequireAppRoles>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route
              path="import"
              element={
                <Suspense fallback={adminPanelSuspenseFallback}>
                  <AdminImportPanel apiBase={props.apiBase} />
                </Suspense>
              }
            />
            <Route
              path="finance"
              element={
                <Suspense fallback={adminPanelSuspenseFallback}>
                  <AdminFinancePanel apiBase={props.apiBase} />
                </Suspense>
              }
            />
            <Route
              path="cram"
              element={
                <Suspense fallback={adminPanelSuspenseFallback}>
                  <AdminCramPanel apiBase={props.apiBase} />
                </Suspense>
              }
            />
            <Route
              path="school-activities"
              element={
                <Suspense fallback={adminPanelSuspenseFallback}>
                  <AdminSchoolActivitiesPanel apiBase={props.apiBase} />
                </Suspense>
              }
            />
          </Route>
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
      aria-label={`ไปหน้า ${label}`}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${appFocusRing} ${
        active ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {label}
    </Link>
  )
}

function HomePage({ health, apiBase }: { health: string; apiBase: string }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">สถานะระบบ Backend (/health)</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-left text-sm text-emerald-300" role="status" aria-live="polite" aria-atomic="true">
          {health}
        </pre>
        <p className="mt-4 text-sm text-slate-500">
          ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน <code className="text-slate-300">frontend/.env</code>{' '}
          และค่า LINE ใน <code className="text-slate-300">VITE_LINE_*</code> / backend <code className="text-slate-300">LINE_*</code>
        </p>
        <PushOptIn apiBase={apiBase} />
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">ทางลัดพอร์ทัล (โหมดพัฒนา)</h2>
        <p className="mt-2 text-sm text-slate-500">เปิดสแนปช็อตแดชบอร์ดตามบทบาท — ใช้เมนูด้านบนหรือลิงก์ด้านล่าง</p>
        <ul className="mt-4 flex flex-wrap gap-2" role="list" aria-label="ทางลัดพอร์ทัลในโหมดพัฒนา">
          <li role="listitem">
            <Link
              to="/member/dashboard"
              aria-label="เปิดพอร์ทัลสมาชิก"
              className={`rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${appFocusRing}`}
            >
              สมาชิก
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/committee/dashboard"
              aria-label="เปิดพอร์ทัลคณะกรรมการ"
              className={`rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${appFocusRing}`}
            >
              คณะกรรมการ
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/academy/dashboard"
              aria-label="เปิดพอร์ทัลโรงเรียนกวดวิชา"
              className={`rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${appFocusRing}`}
            >
              พอร์ทัลโรงเรียนกวดวิชา (Academy)
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/auth/link"
              aria-label="ไปหน้าผูกบัญชีสมาชิก"
              className={`rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${appFocusRing}`}
            >
              ผูกบัญชี
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/entry/cram-qr"
              aria-label="หน้าปลายทาง QR โรงเรียนกวดวิชา"
              className={`rounded-lg border border-violet-800/50 bg-violet-950/40 px-3 py-2 text-sm text-violet-100 hover:bg-violet-950/70 ${appFocusRing}`}
            >
              ทดสอบหน้า QR กวดวิชา
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/?entry=alumni_url"
              aria-label="ทดสอบช่องทางเข้าศิษย์เก่าทาง URL"
              className={`rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${appFocusRing}`}
            >
              ทดสอบ entry ศิษย์เก่า (URL)
            </Link>
          </li>
        </ul>
      </section>
    </div>
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
  const lineEntry = readLineEntrySource()
  return (
    <>
      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm" role="status" aria-live="polite" aria-atomic="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">สถานะการเชื่อมสมาชิก</p>
            {props.restoringMemberSession ? (
              <p className="mt-1 text-emerald-200">กำลังกู้เซสชันสมาชิกจาก LINE UID...</p>
            ) : hasMember ? (
              <p className="mt-1 text-emerald-200">
                ผูกสมาชิกแล้ว: {props.verifiedMemberName || 'สมาชิกที่ผูกไว้'}{' '}
                {readLineName() ? `· LINE ${readLineName()}` : ''}
              </p>
            ) : props.lineUid ? (
              <p className="mt-1 text-amber-200">มี LINE UID แล้ว แต่ยังไม่ได้ผูกสมาชิกในรอบนี้</p>
            ) : (
              <p className="mt-1 text-slate-400">ยังไม่มี LINE เซสชัน หรือเซสชันสมาชิก</p>
            )}
          </div>
          {hasMember ? (
            <Link
              to="/member/dashboard"
              aria-label="ไปยังหน้าแดชบอร์ดสมาชิก"
              className={`rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700 ${appFocusRing}`}
            >
              ไปหน้าสมาชิก
            </Link>
          ) : null}
        </div>
        {lineEntry ? (
          <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
            ช่องทางเข้าระบบ (ใช้กับ LINE UID): {lineEntrySourceDescription(lineEntry)}
          </p>
        ) : null}
      </section>
      {props.restoringMemberSession ? (
        <section className="mb-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-100/90" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
          กำลังกู้เซสชันสมาชิกจาก LINE UID...
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
      <Link
        to="/auth/link"
        aria-label="ไปหน้าผูกบัญชีเพื่อผูกสมาชิก"
        className={`mt-4 inline-flex rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700 ${appFocusRing}`}
      >
        ไปหน้าผูกบัญชี
      </Link>
    </section>
  )
}

function NotFound() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">ไม่พบหน้า</h2>
      <p className="mt-3 text-sm text-slate-400">ไม่พบหน้านี้</p>
      <Link
        to="/"
        aria-label="กลับไปหน้าหลักของระบบ"
        className={`mt-4 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 ${appFocusRing}`}
      >
        กลับหน้าหลัก
      </Link>
    </section>
  )
}
