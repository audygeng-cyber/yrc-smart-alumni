import { useEffect, useState } from 'react'
import { AdminImportPanel } from './components/AdminImportPanel'
import { MemberLinkPanel } from './components/MemberLinkPanel'
import { MemberRequestsPanel } from './components/MemberRequestsPanel'
import { PushOptIn } from './components/PushOptIn'
import {
  clearLineSession,
  readLineFromOAuth,
  readLineUid,
  setLineSessionFromOAuth,
  setManualLineUid,
  SS_OAUTH_STATE,
} from './lineSession'

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID ?? ''
const lineRedirectUri = import.meta.env.VITE_LINE_REDIRECT_URI ?? ''

type Tab = 'home' | 'link' | 'requests' | 'admin'

export default function App() {
  const [health, setHealth] = useState<string>('…')
  const [tab, setTab] = useState<Tab>('home')
  const [lineUid, setLineUid] = useState(readLineUid)
  const [lineUidFromOAuth, setLineUidFromOAuth] = useState(readLineFromOAuth)

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

  // LINE OAuth return: Vite env is stable; run once on mount when URL has ?code=&state=
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
        setTab('link')
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
  }

  function handleLineUidManualChange(v: string) {
    setLineUid(v)
    setManualLineUid(v)
    setLineUidFromOAuth(false)
  }

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

      <main className="mx-auto max-w-2xl px-6 py-10">
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
          <MemberLinkPanel
            apiBase={apiBase}
            lineUid={lineUid}
            lineUidFromOAuth={lineUidFromOAuth}
            onLineUidChange={handleLineUidManualChange}
            onClearLineSession={handleClearLineSession}
            lineLoginAvailable={Boolean(lineChannelId && lineRedirectUri)}
            onStartLineLogin={startLineLogin}
          />
        )}
        {tab === 'admin' && <AdminImportPanel apiBase={apiBase} />}
      </main>
    </div>
  )
}
