import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
} from './lineSession'
import { normalizeApiBase } from './lib/adminApi'
import { fetchLineOauthState } from './lib/fetchLineOauthState'
import { fetchSessionMember } from './lib/fetchSessionMember'
import { themeAccent, themeTapTarget } from './lib/themeTokens'
import { syncLineAppUser } from './lib/syncLineAppUser'

const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL ?? 'http://localhost:4000')

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
 * - dev: origin ปัจจุบัน (หรือ localhost)
 * - production: ใช้ `window.location.origin` เมื่อมี window — ลดปัญหามือถือ / โดเมนย่อยไม่ตรงกับค่า env
 * - fallback: `VITE_LINE_REDIRECT_URI` (เช่น build แบบไม่มี DOM)
 */
function getLineRedirectUri(): string {
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`
    }
    return 'http://localhost:5173/'
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/`
  }
  return (import.meta.env.VITE_LINE_REDIRECT_URI ?? '').trim()
}

/** มือถือบล็อก mixed content ถ้าเว็บ HTTPS แต่ API เป็น http:// (ยกเว้น localhost) */
function isInsecureApiOnHttpsPage(api: string): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.protocol !== 'https:') return false
  const b = api.trim().toLowerCase()
  if (b.startsWith('https://')) return false
  if (b.startsWith('http://localhost') || b.startsWith('http://127.0.0.1')) return false
  return b.startsWith('http://')
}

function formatLineOAuthApiError(j: Record<string, unknown>): string {
  const err = typeof j.error === 'string' ? j.error.trim() : ''
  if (err) {
    let out = err
    const allowed = j.allowed
    if (Array.isArray(allowed) && allowed.length && err.includes('redirect_uri')) {
      out += ` — อนุญาตบน API: ${allowed.map(String).join(', ')}`
    }
    const hint = typeof j.hint === 'string' ? j.hint.trim() : ''
    if (hint) out += ` (${hint})`
    const details = j.details as Record<string, unknown> | undefined
    if (details && typeof details === 'object') {
      const lineMsg =
        (typeof details.error_description === 'string' && details.error_description) ||
        (typeof details.error === 'string' && details.error)
      if (lineMsg) out += ` — LINE: ${String(lineMsg)}`
    }
    return out
  }
  return 'ล็อกอิน LINE ไม่สำเร็จ — ตรวจ redirect_uri / LINE_REDIRECT_URIS และ Callback URL ใน LINE Console'
}

type RoleView = 'all' | 'member' | 'committee' | 'academy'

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
  const [lineIdentitySyncMessage, setLineIdentitySyncMessage] = useState<{
    kind: 'ok' | 'err'
    text: string
    /** สรุป JSON จาก app-roles / session-member — ไล่บั๊กบนมือถือ */
    detail?: string
  } | null>(null)
  /** session-member 403 MEMBERSHIP_INACTIVE — แสดงบน LinkPage */
  const [sessionMemberBlockMessage, setSessionMemberBlockMessage] = useState<string | null>(null)

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
    if (!uid) {
      setVerifiedMember(null)
      setSessionMemberBlockMessage(null)
    }
  }, [lineUid])

  useEffect(() => {
    if (!lineUid.trim() || verifiedMember) return

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000)
    ;(async () => {
      setRestoringMemberSession(true)
      try {
        const result = await fetchSessionMember(apiBase, lineUid.trim(), controller.signal)
        if (cancelled) return
        if (!result.ok) {
          if (!cancelled && 'code' in result && result.code === 'MEMBERSHIP_INACTIVE') {
            setSessionMemberBlockMessage(
              'สมาชิกภาพในทะเบียนยังไม่ Active — หากส่งคำร้องสมัครใหม่ ต้องรอประธานรุ่นและ Admin อนุมัติครบก่อนจึงจะใช้พอร์ทัลได้ หรือติดต่อผู้ดูแลหากเป็นสมาชิกเดิม',
            )
          } else if (!cancelled) {
            setSessionMemberBlockMessage(null)
          }
          return
        }
        setSessionMemberBlockMessage(null)
        setMemberSnapshot(result.member)
        setVerifiedMember(result.member)
        setLinkedMemberVersion((n) => n + 1)
        navigate('/member', { replace: true })
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') console.error(e)
      } finally {
        window.clearTimeout(timeoutId)
        if (!cancelled) setRestoringMemberSession(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [lineUid, navigate, verifiedMember])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const redirectUri = getLineRedirectUri()
    if (!code || !state || !redirectUri) return

    // authorization code ใช้ได้ครั้งเดียว — ลบ query ก่อน async กัน React Strict / remount แลกซ้ำจน LINE ตอบ invalid_grant (มักเห็นบนมือถือหรือ dev)
    const pathOnly = window.location.pathname + window.location.hash
    window.history.replaceState({}, '', pathOnly)

    ;(async () => {
      try {
        if (isInsecureApiOnHttpsPage(apiBase)) {
          setLineIdentitySyncMessage({
            kind: 'err',
            text:
              'เว็บเปิดแบบ HTTPS แต่ VITE_API_URL ชี้ HTTP — มือถือบล็อก mixed content ตั้ง VITE_API_URL เป็น https://... ของ Cloud Run แล้ว build ใหม่',
          })
          return
        }
        const r = await fetch(`${apiBase}/api/auth/line/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            state,
          }),
        })
        const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & {
          line_uid?: string
          name?: string | null
        }
        if (!r.ok || !j.line_uid) {
          console.error('LINE token exchange failed', j)
          setLineIdentitySyncMessage({
            kind: 'err',
            text: `ล็อกอิน LINE ไม่สำเร็จ: ${formatLineOAuthApiError(j)}`,
          })
          return
        }
        const persisted = await syncLineAppUser(apiBase, j.line_uid)
        // โหลดสมาชิกที่ผูกแล้วก่อนตั้ง lineUid ใน state — กัน race กับ effect กู้เซสชัน (มือถือช้า / remount)
        const session = await fetchSessionMember(apiBase, j.line_uid)

        const detail = [
          'สรุปคำตอบจริงจาก API (ใช้ไล่บั๊ก):',
          '',
          'POST /api/members/app-roles',
          persisted.trace,
          '',
          'POST /api/members/session-member',
          session.trace,
        ].join('\n')

        if (persisted.ok === false) {
          setLineIdentitySyncMessage({
            kind: 'err',
            text: `บันทึก LINE UID ในระบบไม่สำเร็จ: ${persisted.error}${persisted.status != null ? ` (HTTP ${persisted.status})` : ''} — ตรวจ VITE_API_URL และ CORS`,
            detail,
          })
        } else if (!session.ok && 'code' in session && session.code === 'MEMBERSHIP_INACTIVE') {
          setSessionMemberBlockMessage(
            'สมาชิกภาพในทะเบียนยังไม่ Active — หากส่งคำร้องสมัครใหม่ ต้องรอประธานรุ่นและ Admin อนุมัติครบก่อนจึงจะใช้พอร์ทัลได้ หรือติดต่อผู้ดูแลหากเป็นสมาชิกเดิม',
          )
          setLineIdentitySyncMessage({
            kind: 'ok',
            text: 'ระบบได้รับ LINE UID และบันทึกใน app_users แล้ว — แต่ยังเข้าพอร์ทัลสมาชิกไม่ได้จนกว่าสมาชิกภาพในทะเบียนจะ Active',
            detail,
          })
        } else {
          const sessionHint = session.ok
            ? 'พบแถวสมาชิกที่ผูก LINE แล้ว — เปิดหน้าสมาชิกได้'
            : 'ยังไม่พบสมาชิกที่ผูก LINE นี้ในระบบ — ใช้ฟอร์มด้านล่างเพื่อตรวจและผูก (session-member อาจเป็น 404)'
          setSessionMemberBlockMessage(null)
          setLineIdentitySyncMessage({
            kind: 'ok',
            text: `ระบบได้รับ LINE UID และบันทึกใน app_users แล้ว — ${sessionHint}`,
            detail,
          })
        }
        if (session.ok) {
          setMemberSnapshot(session.member)
          setVerifiedMember(session.member)
          setLinkedMemberVersion((n) => n + 1)
        }
        setLineSessionFromOAuth(j.line_uid, j.name ?? undefined)
        setLineUid(j.line_uid)
        setLineUidFromOAuth(true)
        navigate('/member', { replace: true })
      } catch (e) {
        console.error(e)
        setLineIdentitySyncMessage({
          kind: 'err',
          text: `แลก LINE token ผิดพลาด — ${e instanceof Error ? e.message : 'unknown'}`,
        })
      }
    })()
  }, [navigate])

  async function startLineLogin() {
    const redirectUri = getLineRedirectUri()
    if (!lineChannelId || !redirectUri) return
    if (isInsecureApiOnHttpsPage(apiBase)) {
      setLineIdentitySyncMessage({
        kind: 'err',
        text:
          'เว็บเปิดแบบ HTTPS แต่ VITE_API_URL ชี้ HTTP — มือถือบล็อก mixed content ตั้ง VITE_API_URL เป็น https://... ของ Cloud Run แล้ว build ใหม่',
      })
      return
    }
    try {
      const oauth = await fetchLineOauthState(apiBase)
      if (oauth.ok === false) {
        const detail = oauth.detail
        const deployHint =
          oauth.status === 404
            ? ` (น่าจะยังไม่ได้ deploy API เวอร์ชันใหม่ที่มี /api/auth/line/oauth-state บน Cloud Run)${oauth.triedPost ? ' — ลอง POST แล้วยังไม่ได้' : ''}`
            : oauth.status === 500 && detail.includes('LINE_CHANNEL_SECRET')
              ? ' (ตรวจ env LINE_CHANNEL_SECRET บน Cloud Run)'
              : ''
        setLineIdentitySyncMessage({
          kind: 'err',
          text: `ไม่สามารถเริ่มล็อกอิน LINE — HTTP ${oauth.status}: ${detail}${deployHint}`,
        })
        return
      }
      const u = new URL('https://access.line.me/oauth2/v2.1/authorize')
      u.searchParams.set('response_type', 'code')
      u.searchParams.set('client_id', lineChannelId)
      u.searchParams.set('redirect_uri', redirectUri)
      u.searchParams.set('state', oauth.state)
      u.searchParams.set('scope', 'openid profile')
      window.location.href = u.toString()
    } catch (e) {
      setLineIdentitySyncMessage({
        kind: 'err',
        text: `เรียก API ก่อนไป LINE ไม่สำเร็จ — ตรวจเครือข่าย/CORS (${e instanceof Error ? e.message : 'unknown'})`,
      })
    }
  }

  function handleClearLineSession() {
    clearLineSession()
    setLineUid('')
    setLineUidFromOAuth(false)
    setVerifiedMember(null)
    setLineIdentitySyncMessage(null)
    setSessionMemberBlockMessage(null)
  }

  function handleLineUidManualChange(v: string) {
    setLineUid(v)
    setManualLineUid(v)
    setLineUidFromOAuth(false)
  }

  function handleMemberVerified(member: Record<string, unknown>) {
    setSessionMemberBlockMessage(null)
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
        lineIdentitySyncMessage={lineIdentitySyncMessage}
        onDismissLineIdentityMessage={() => setLineIdentitySyncMessage(null)}
        sessionMemberBlockMessage={sessionMemberBlockMessage}
        onDismissSessionMemberBlockMessage={() => setSessionMemberBlockMessage(null)}
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
  lineIdentitySyncMessage: { kind: 'ok' | 'err'; text: string; detail?: string } | null
  onDismissLineIdentityMessage: () => void
  sessionMemberBlockMessage: string | null
  onDismissSessionMemberBlockMessage: () => void
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
  const onMemberPortal = location.pathname.startsWith('/member')

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
        className={`${themeTapTarget} absolute left-[max(1rem,env(safe-area-inset-left,0px))] top-[max(0px,env(safe-area-inset-top,0px))] z-[100] -translate-y-full rounded-b px-4 py-2 text-sm font-medium shadow transition focus-visible:translate-y-0 ${themeAccent.buttonPrimary} ${themeAccent.focusRing}`}
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <header className="border-b border-slate-800 bg-slate-900/80 pb-3 backdrop-blur sm:pb-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-[max(1rem,env(safe-area-inset-top,0px))]">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">YRC Smart Alumni</h1>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400 sm:line-clamp-none">
          {onMemberPortal ? 'พอร์ทัลสมาชิก' : 'พอร์ทัลสมาชิก · คณะกรรมการ · Academy'}
        </p>
        {!onMemberPortal ? (
          <div
            className="mt-3 min-w-0 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2 sm:border-0 sm:bg-transparent sm:p-0"
            aria-label="มุมมองบทบาทและเมนูพอร์ทัล"
          >
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="shrink-0 text-xs uppercase tracking-wide text-slate-400">มุมมองบทบาท</span>
              <select
                value={props.roleView}
                onChange={(e) => props.setRoleView(e.target.value as RoleView)}
                aria-label="เลือกมุมมองบทบาทของพอร์ทัล"
                aria-describedby={roleViewSummaryId}
                className={`${themeTapTarget} min-w-0 w-full max-w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 sm:w-auto sm:max-w-md sm:py-1.5 sm:text-xs ${themeAccent.focusRing}`}
              >
                <option value="all">ทุกพอร์ทัล</option>
                <option value="member">เฉพาะสมาชิก</option>
                <option value="committee">เฉพาะคณะกรรมการ</option>
                <option value="academy">เฉพาะโรงเรียนกวดวิชา (Academy)</option>
              </select>
              <span className="hidden text-xs text-slate-500 sm:inline">จำลองการมองเห็นเมนูตามสิทธิ์</span>
            </div>
            <p id={roleViewSummaryId} className="mt-2 min-w-0 text-xs leading-snug text-slate-400 sm:mt-1" role="status" aria-live="polite" aria-atomic="true">
              <span className="sm:hidden">
                {roleViewLabel} · {visiblePortalCount.toLocaleString('th-TH')} หมวด
              </span>
              <span className="hidden sm:inline">
                มุมมองปัจจุบัน: {roleViewLabel} · พอร์ทัลที่แสดง {visiblePortalCount.toLocaleString('th-TH')} หมวด
              </span>
            </p>
          </div>
        ) : null}
        {import.meta.env.DEV && !rbac.enforced ? (
          <p className="mt-2 text-xs text-slate-400">
            RBAC ปิดอยู่ — ตั้ง <code className="text-slate-400">VITE_ENFORCE_APP_RBAC=true</code> เพื่อกันเส้นทางตามบทบาทใน DB
          </p>
        ) : null}
        {rbac.enforced && rbac.rolesFetchFailed && !rbac.loading ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-rose-300/90" role="alert">
            <span>โหลดสิทธิ์จากเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจว่า API ทำงานอยู่</span>
            <button
              type="button"
              onClick={() => rbac.refetchRoles()}
              className={`rounded-md border border-rose-800/60 bg-rose-950/40 px-2 py-0.5 text-rose-100 hover:bg-rose-950/70 ${themeAccent.focusRing}`}
            >
              ลองอีกครั้ง
            </button>
          </div>
        ) : null}
        <nav
          className="mt-4 -mx-1 min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
          aria-label="เมนูหลัก (เลื่อนแนวนอนบนจอแคบ)"
        >
          <div className="flex w-max min-w-full flex-nowrap gap-2">
            {onMemberPortal ? (
              <>
                <NavPill
                  to="/"
                  label="เข้าสู่ระบบ/ผูกบัญชี"
                  matchLabelOnNarrow
                  active={location.pathname === '/' || location.pathname.startsWith('/auth/link')}
                />
                {showMemberNav ? (
                  <NavPill
                    to="/member/dashboard"
                    label="สมาชิก"
                    matchLabelOnNarrow
                    active={location.pathname.startsWith('/member')}
                  />
                ) : null}
              </>
            ) : (
              <>
                <NavPill
                  to="/"
                  label="เข้าสู่ระบบ / ผูกบัญชี"
                  shortLabel="หลัก"
                  active={location.pathname === '/' || location.pathname.startsWith('/auth/link')}
                />
                {showMemberNav ? <NavPill to="/member/dashboard" label="สมาชิก" active={location.pathname.startsWith('/member')} /> : null}
                {showCommitteeNav ? (
                  <NavPill to="/committee/dashboard" label="คณะกรรมการ" active={location.pathname.startsWith('/committee')} />
                ) : null}
                {showAcademyNav ? (
                  <NavPill
                    to="/academy/dashboard"
                    label="โรงเรียนกวดวิชา"
                    shortLabel="Academy"
                    active={location.pathname.startsWith('/academy')}
                  />
                ) : null}
                {canRequests ? <NavPill to="/requests" label="คำร้อง" active={location.pathname.startsWith('/requests')} /> : null}
                {canAdmin ? (
                  <NavPill to="/admin" label="ผู้ดูแล (Admin)" shortLabel="Admin" active={location.pathname.startsWith('/admin')} />
                ) : null}
              </>
            )}
          </div>
        </nav>
      </header>

      <main
        id="app-main"
        tabIndex={-1}
        className={`mx-auto min-w-0 scroll-mt-2 pt-6 outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600/45 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:scroll-mt-0 sm:pt-10 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] ${portalWidthClass}`}
      >
        <Routes>
          <Route
            path="/"
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
                lineIdentitySyncMessage={props.lineIdentitySyncMessage}
                onDismissLineIdentityMessage={props.onDismissLineIdentityMessage}
                sessionMemberBlockMessage={props.sessionMemberBlockMessage}
                onDismissSessionMemberBlockMessage={props.onDismissSessionMemberBlockMessage}
              />
            }
          />
          <Route path="/auth/link" element={<Navigate to="/" replace />} />
          {import.meta.env.DEV ? (
            <Route path="/dev" element={<HomePage health={props.health} apiBase={props.apiBase} />} />
          ) : null}
          <Route path="/entry/cram-qr" element={<CramQrEntryPage />} />
          <Route
            path="/member/*"
            element={
              !props.lineUid.trim() ? (
                <Navigate to="/" replace />
              ) : props.verifiedMember ? (
                <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.member}>
                  <MemberArea
                    apiBase={props.apiBase}
                    lineUid={props.lineUid}
                    member={props.verifiedMember}
                    onMemberUpdated={props.onMemberUpdated}
                    lineDisplayName={readLineName()}
                  />
                </RequireAppRoles>
              ) : (
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
                  lineIdentitySyncMessage={props.lineIdentitySyncMessage}
                  onDismissLineIdentityMessage={props.onDismissLineIdentityMessage}
                  sessionMemberBlockMessage={props.sessionMemberBlockMessage}
                  onDismissSessionMemberBlockMessage={props.onDismissSessionMemberBlockMessage}
                />
              )
            }
          />
          <Route
            path="/committee/*"
            element={
              <RequireAppRoles lineUid={props.lineUid} allow={RBAC_NAV.committee}>
                <CommitteeArea apiBase={props.apiBase} lineUid={props.lineUid} />
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
                <div className="min-w-0">
                  <MemberRequestsPanel apiBase={props.apiBase} />
                </div>
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
                  <Navigate to="/admin/finance/accounting" replace />
                </Suspense>
              }
            />
            <Route
              path="finance/:tab"
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

function NavPill(props: {
  to: string
  label: string
  shortLabel?: string
  active: boolean
  /** บนจอแคบให้ข้อความเหมือนจอใหญ่ (พอร์ทัลสมาชิก) */
  matchLabelOnNarrow?: boolean
}) {
  const { to, label, shortLabel, active, matchLabelOnNarrow } = props
  return (
    <Link
      to={to}
      aria-label={`ไปหน้า ${label}`}
      aria-current={active ? 'page' : undefined}
      className={`${themeTapTarget} inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium ${themeAccent.focusRing} ${
        active ? themeAccent.navItemActive : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {matchLabelOnNarrow ? (
        <span>{label}</span>
      ) : (
        <>
          <span className="sm:hidden">{shortLabel ?? label}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </Link>
  )
}

function HomePage({ health, apiBase }: { health: string; apiBase: string }) {
  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-xl border border-fuchsia-900/35 bg-fuchsia-950/20 p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fuchsia-200/90">เข้าสู่ระบบด้วย LINE</h2>
        <p className="mt-2 break-words text-sm text-slate-400">
          หลังล็อกอิน LINE ระบบจะได้รับ UID จาก LINE (ค่า <code className="text-slate-300">sub</code>) เก็บในเบราว์เซอร์
          และบันทึกแถวใน <code className="text-slate-300">app_users</code> ผ่าน API — จากนั้นจึงผูกกับทะเบียนสมาชิกได้ที่หน้าผูกบัญชี
        </p>
        <Link
          to="/"
          className={`${themeTapTarget} mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ${themeAccent.buttonPrimaryStrong} ${themeAccent.focusRing}`}
        >
          ไปล็อกอิน LINE / ผูกบัญชี
        </Link>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">สถานะระบบ Backend (/health)</h2>
        <pre
          className="mt-3 max-w-full overflow-x-auto overscroll-x-contain rounded-lg bg-slate-950 p-3 text-left text-sm text-fuchsia-300 sm:p-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {health}
        </pre>
        <p className="mt-4 break-words text-sm text-slate-400">
          ตั้งค่า <code className="text-slate-300">VITE_API_URL</code> ใน <code className="text-slate-300">frontend/.env</code>{' '}
          และค่า LINE ใน <code className="text-slate-300">VITE_LINE_*</code> / backend <code className="text-slate-300">LINE_*</code>
        </p>
        <PushOptIn apiBase={apiBase} />
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">ทางลัดพอร์ทัล (โหมดพัฒนา)</h2>
        <p className="mt-2 text-sm text-slate-400">เปิดสแนปช็อตแดชบอร์ดตามบทบาท — ใช้เมนูด้านบนหรือลิงก์ด้านล่าง</p>
        <nav
          className="mt-4 -mx-1 min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
          aria-label="ทางลัดพอร์ทัลในโหมดพัฒนา (เลื่อนแนวนอน)"
        >
        <ul className="flex w-max min-w-full flex-nowrap gap-2" role="list">
          <li role="listitem">
            <Link
              to="/member/dashboard"
              aria-label="เปิดพอร์ทัลสมาชิก"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${themeAccent.focusRing}`}
            >
              สมาชิก
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/committee/dashboard"
              aria-label="เปิดพอร์ทัลคณะกรรมการ"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${themeAccent.focusRing}`}
            >
              คณะกรรมการ
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/academy/dashboard"
              aria-label="เปิดพอร์ทัลโรงเรียนกวดวิชา"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${themeAccent.focusRing}`}
            >
              พอร์ทัลโรงเรียนกวดวิชา (Academy)
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/"
              aria-label="ไปหน้าผูกบัญชีสมาชิก"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${themeAccent.focusRing}`}
            >
              ผูกบัญชี
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/entry/cram-qr"
              aria-label="หน้าปลายทาง QR โรงเรียนกวดวิชา"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-violet-800/50 bg-violet-950/40 px-3 py-2 text-sm text-violet-100 hover:bg-violet-950/70 ${themeAccent.focusRing}`}
            >
              ทดสอบหน้า QR กวดวิชา
            </Link>
          </li>
          <li role="listitem">
            <Link
              to="/?entry=alumni_url"
              aria-label="ทดสอบช่องทางเข้าศิษย์เก่าทาง URL"
              className={`${themeTapTarget} inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 ${themeAccent.focusRing}`}
            >
              ทดสอบ entry ศิษย์เก่า (URL)
            </Link>
          </li>
        </ul>
        </nav>
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
  lineIdentitySyncMessage: { kind: 'ok' | 'err'; text: string; detail?: string } | null
  onDismissLineIdentityMessage: () => void
  sessionMemberBlockMessage: string | null
  onDismissSessionMemberBlockMessage: () => void
}) {
  const hasMember = Boolean(props.verifiedMember && props.lineUid)
  const lineEntry = readLineEntrySource()
  return (
    <div className="min-w-0">
      {props.lineIdentitySyncMessage ? (
        <section
          className={`mb-4 rounded-xl border p-4 text-sm ${
            props.lineIdentitySyncMessage.kind === 'ok'
              ? 'border-fuchsia-800/60 bg-fuchsia-950/30 text-fuchsia-100/95'
              : 'border-rose-800/60 bg-rose-950/30 text-rose-100/95'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="min-w-0 break-words">{props.lineIdentitySyncMessage.text}</p>
              {props.lineIdentitySyncMessage.detail ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-700/80 bg-slate-950/70 p-2 text-[11px] leading-snug text-slate-300">
                  {props.lineIdentitySyncMessage.detail}
                </pre>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => props.onDismissLineIdentityMessage()}
              className={`${themeTapTarget} w-full shrink-0 rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/80 sm:w-auto ${themeAccent.focusRing}`}
            >
              ปิด
            </button>
          </div>
        </section>
      ) : null}
      {props.sessionMemberBlockMessage ? (
        <section
          className="mb-4 rounded-xl border border-amber-800/55 bg-amber-950/25 p-4 text-sm text-amber-100/95"
          role="alert"
          aria-live="polite"
        >
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <p className="min-w-0 flex-1 break-words">{props.sessionMemberBlockMessage}</p>
            <button
              type="button"
              onClick={() => props.onDismissSessionMemberBlockMessage()}
              className={`${themeTapTarget} w-full shrink-0 rounded-md border border-amber-800/60 px-3 py-2 text-xs text-amber-100 hover:bg-amber-950/50 sm:w-auto ${themeAccent.focusRing}`}
            >
              ปิด
            </button>
          </div>
        </section>
      ) : null}
      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm" role="status" aria-live="polite" aria-atomic="true">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">สถานะการเชื่อมสมาชิก</p>
            {props.restoringMemberSession ? (
              <p className="mt-1 text-fuchsia-200">กำลังกู้เซสชันสมาชิกจาก LINE UID...</p>
            ) : hasMember ? (
              <p className="mt-1 break-words text-fuchsia-200">
                ผูกสมาชิกแล้ว: {props.verifiedMemberName || 'สมาชิกที่ผูกไว้'}{' '}
                {readLineName() ? `· LINE ${readLineName()}` : ''}
              </p>
            ) : props.lineUid ? (
              <p className="mt-1 text-amber-200">
                มี LINE UID แล้ว แต่ยังไม่ได้ผูกสมาชิกในรอบนี้ — ตรวจสอบว่ากรอกรุ่น · ชื่อ · นามสกุล ตรงทะเบียน แล้วกด &quot;ตรวจสอบและผูก&quot;
              </p>
            ) : (
              <p className="mt-1 text-slate-400">
                ยังไม่มี LINE เซสชัน หรือเซสชันสมาชิก — กรอกรุ่น · ชื่อ · นามสกุล แล้วกดเข้าสู่ระบบ LINE ด้านล่างฟอร์ม
              </p>
            )}
          </div>
          {hasMember ? (
            <Link
              to="/member/dashboard"
              aria-label="ไปยังหน้าแดชบอร์ดสมาชิก"
              className={`${themeTapTarget} inline-flex w-full shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm sm:w-auto ${themeAccent.buttonPrimary} ${themeAccent.focusRing}`}
            >
              ไปหน้าสมาชิก
            </Link>
          ) : null}
        </div>
        {lineEntry ? (
          <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
            ช่องทางเข้าระบบ (ใช้กับ LINE UID): {lineEntrySourceDescription(lineEntry)}
          </p>
        ) : null}
      </section>
      {props.restoringMemberSession ? (
        <section className="mb-4 rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/20 p-4 text-sm text-fuchsia-100/90" role="status" aria-live="polite" aria-atomic="true" aria-busy="true">
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
    </div>
  )
}

function NotFound() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">ไม่พบหน้า</h2>
      <p className="mt-3 text-sm text-slate-400">
        ตรวจสอบที่อยู่ (URL) หรือเลือกจากเมนูด้านบน — ถ้ายังไม่พบ ให้กลับหน้าหลักแล้วเริ่มใหม่
      </p>
      <Link
        to="/"
        aria-label="กลับไปหน้าหลักของระบบ"
        className={`${themeTapTarget} mt-4 inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 ${themeAccent.focusRing}`}
      >
        กลับหน้าหลัก
      </Link>
    </section>
  )
}
