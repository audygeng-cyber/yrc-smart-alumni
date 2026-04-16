import { useEffect, useState } from 'react'
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

type Tab = 'home' | 'link' | 'member' | 'requests' | 'admin'

function getInitialVerifiedMember(): Record<string, unknown> | null {
  const uid = readLineUid()
  const snap = readMemberSnapshot()
  if (uid && snap && String(snap.line_uid ?? '') === uid) return snap
  return null
}

function getInitialTab(): Tab {
  if (getInitialVerifiedMember()) return 'member'
  return 'home'
}

function getMemberDisplayName(member: Record<string, unknown> | null): string {
  if (!member) return ''
  const first = member.first_name != null ? String(member.first_name) : ''
  const last = member.last_name != null ? String(member.last_name) : ''
  return `${first} ${last}`.trim()
}

export default function App() {
  const [health, setHealth] = useState<string>('…')
  const [tab, setTab] = useState<Tab>(getInitialTab)
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
        setTab('member')
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setRestoringMemberSession(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [lineUid, verifiedMember])

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
          setTab('member')
        } else {
          setTab('link')
        }
      } catch (e) {
        console.error(e)
      } finally {
        window.history.replaceState({}, '', window.location.pathname + window.location.hash)
      }
    })()
  }, [])

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
    setTab('member')
  }

  const showMemberTab = Boolean(lineUid && verifiedMember)
  const mainClass = tab === 'member' ? 'max-w-5xl' : 'max-w-2xl'
  const verifiedMemberName = getMemberDisplayName(verifiedMember)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight">YRC Smart Alumni</h1>
        <p className="mt-1 text-sm text-slate-400">สมาชิก · นำเข้า · LINE Login · ผูกบัญชี</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['home', 'หน้าหลัก'],
              ['link', 'ผูกบัญชี'],
              ...(showMemberTab ? ([['member', 'หน้าสมาชิก']] as const) : []),
              ['requests', 'คำร้อง'],
              ['admin', 'Admin'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === id
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className={`mx-auto px-6 py-10 ${mainClass}`}>
        {tab === 'home' && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Backend /health</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 text-left text-sm text-emerald-300">
              {health}
            </pre>
            <p className="mt-4 text-sm text-slate-500">
              ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน{' '}
              <code className="text-slate-300">frontend/.env</code> และค่า LINE ใน{' '}
              <code className="text-slate-300">VITE_LINE_*</code> / backend <code className="text-slate-300">LINE_*</code>
            </p>
            <PushOptIn apiBase={apiBase} />
          </section>
        )}

        {tab === 'requests' && <MemberRequestsPanel apiBase={apiBase} />}

        {tab === 'link' && (
          <>
            <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Member Session Status</p>
                  {restoringMemberSession ? (
                    <p className="mt-1 text-emerald-200">กำลังกู้ session สมาชิกจาก LINE UID...</p>
                  ) : verifiedMember && lineUid ? (
                    <p className="mt-1 text-emerald-200">
                      ผูกสมาชิกแล้ว: {verifiedMemberName || 'สมาชิกที่ผูกไว้'} {readLineName() ? `· LINE ${readLineName()}` : ''}
                    </p>
                  ) : lineUid ? (
                    <p className="mt-1 text-amber-200">มี LINE UID แล้ว แต่ยังไม่ได้ผูกสมาชิกในรอบนี้</p>
                  ) : (
                    <p className="mt-1 text-slate-400">ยังไม่มี LINE session หรือ member session</p>
                  )}
                </div>
                {verifiedMember && lineUid ? (
                  <button
                    type="button"
                    onClick={() => setTab('member')}
                    className="rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  >
                    ไปหน้าสมาชิก
                  </button>
                ) : null}
              </div>
            </section>
            {restoringMemberSession ? (
              <section className="mb-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-100/90">
                กำลังกู้ session สมาชิกจาก LINE UID...
              </section>
            ) : null}
            <MemberLinkPanel
              apiBase={apiBase}
              lineUid={lineUid}
              lineUidFromOAuth={lineUidFromOAuth}
              onLineUidChange={handleLineUidManualChange}
              onClearLineSession={handleClearLineSession}
              lineLoginAvailable={Boolean(lineChannelId && lineRedirectUri)}
              onStartLineLogin={startLineLogin}
              onMemberVerified={handleMemberVerified}
            />
          </>
        )}

        {tab === 'member' &&
          (verifiedMember && lineUid ? (
            <MemberPortal
              apiBase={apiBase}
              lineUid={lineUid}
              member={verifiedMember}
              onMemberUpdated={(m) => {
                setVerifiedMember(m)
                setMemberSnapshot(m)
              }}
              lineDisplayName={readLineName()}
            />
          ) : (
            <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 text-sm text-amber-100/90">
              <p>ยังไม่มีข้อมูลสมาชิกในวาระนี้ — ไปที่แท็บ &quot;ผูกบัญชี&quot; แล้วกด &quot;ตรวจสอบและผูก&quot; เมื่อพบในทะเบียน</p>
              <button
                type="button"
                onClick={() => setTab('link')}
                className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700"
              >
                ไปแท็บผูกบัญชี
              </button>
            </section>
          ))}

        {tab === 'admin' && (
          <>
            <AdminImportPanel apiBase={apiBase} />
            <AdminFinancePanel apiBase={apiBase} />
          </>
        )}
      </main>
    </div>
  )
}
