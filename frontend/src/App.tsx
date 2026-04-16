import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
          <NavPill to="/member" label="สมาชิก" active={location.pathname.startsWith('/member')} />
          <NavPill to="/committee" label="คณะกรรมการ" active={location.pathname.startsWith('/committee')} />
          <NavPill to="/academy" label="โรงเรียนกวดวิชา" active={location.pathname.startsWith('/academy')} />
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
                <MemberPortal
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
            <Link to="/member" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700">
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

function CommitteeDashboard() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Committee Portal</h2>
      <p className="mt-3 text-sm text-slate-400">
        หน้านี้คือโครงสำหรับคณะกรรมการ (dashboard/ทะเบียนสมาชิก/การเงิน/ประชุม/ลงมติ) — ขั้นถัดไปเราจะเติมเมนู sidebar และหน้าจริงตาม sitemap
      </p>
    </section>
  )
}

function AcademyDashboard() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Academy Portal</h2>
      <p className="mt-3 text-sm text-slate-400">
        หน้านี้คือโครงสำหรับโรงเรียนกวดวิชา (admin/teacher/student/parent dashboards) — ขั้นถัดไปเราจะทำ role-based menu และ infographic widgets
      </p>
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
