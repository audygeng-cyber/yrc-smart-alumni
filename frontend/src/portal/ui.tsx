import { useId, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { themeTapTarget } from '../lib/themeTokens'
import { portalAccent, portalFocusRing } from './portalLabels'

function portalNavLinkClass(isActive: boolean, layout: 'sidebar' | 'strip') {
  const base = `${themeTapTarget} text-sm ${portalFocusRing} `
  if (layout === 'sidebar') {
    return `${base}block rounded px-3 py-2 ${isActive ? portalAccent.button : 'text-slate-300 hover:bg-slate-800'}`
  }
  return `${base}inline-flex max-w-[min(100%,18rem)] items-center justify-center rounded-lg px-3 py-2 whitespace-normal text-center sm:max-w-none sm:whitespace-nowrap ${
    isActive ? portalAccent.button : 'border border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-800'
  }`
}

export function PortalShell(props: {
  title: string
  subtitle: string
  navItems: Array<{ to: string; label: string }>
  children: React.ReactNode
}) {
  const titleId = useId()
  const navHeadingId = useId()
  const mobileNavId = useId()
  return (
    <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50 p-4 md:p-5" aria-labelledby={titleId}>
      <div className="mb-4 border-b border-slate-800 pb-4">
        <h2 id={titleId} className="text-sm font-medium uppercase tracking-wide text-slate-300">
          {props.title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">{props.subtitle}</p>
      </div>

      {/* มือถือ/แท็บเล็ต: เมนูพอร์ทัลแนวนอนเลื่อนได้ — ลดการเลื่อนยาวจากรายการเมนูแนวตั้งเต็มความกว้าง */}
      <div className="mb-4 min-w-0 max-w-full lg:hidden">
        <p id={mobileNavId} className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          เมนูพอร์ทัล
        </p>
        <nav
          className="-mx-1 flex min-w-0 max-w-full touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
          aria-labelledby={mobileNavId}
          aria-label="เมนูพอร์ทัล (เลื่อนแนวนอน มือถือ)"
        >
          <ul className="flex w-max gap-2" role="list">
            {props.navItems.map((item) => (
              <li key={item.to} role="listitem" className="shrink-0">
                <NavLink
                  to={item.to}
                  aria-label={`ไปหน้า ${item.label}`}
                  className={({ isActive }) => portalNavLinkClass(isActive, 'strip')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-lg border border-slate-800 bg-slate-950/50 p-3 lg:block">
          <p id={navHeadingId} className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            เมนูพอร์ทัล
          </p>
          <nav className="space-y-1.5" aria-labelledby={navHeadingId} aria-label="รายการเมนูในพอร์ทัล">
            <ul role="list" aria-label="ลิงก์เมนูพอร์ทัลทั้งหมด">
              {props.navItems.map((item) => (
                <li key={item.to} role="listitem" className="mt-1.5 first:mt-0">
                  <NavLink
                    to={item.to}
                    aria-label={`ไปหน้า ${item.label}`}
                    className={({ isActive }) => portalNavLinkClass(isActive, 'sidebar')}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">{props.children}</div>
      </div>
    </section>
  )
}

export function MetricCards(props: { items: Array<{ label: string; value: string; hint: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="list" aria-label="การ์ดสรุปตัวชี้วัด">
      {props.items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4" role="listitem">
          <p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100" aria-label={`${item.label} มีค่า ${item.value}`}>
            {item.value}
          </p>
          <p className="mt-2 text-xs text-slate-400">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}

/** ปุ่มโหลดสแนปช็อตพอร์ทัลจาก API ใหม่ — ใช้คู่กับ PortalDataSourceBadge */
export function PortalSnapshotRefreshButton(props: {
  loading: boolean
  onRefresh: () => void | Promise<void>
}) {
  return (
    <button
      type="button"
      disabled={props.loading}
      aria-busy={props.loading}
      aria-label="โหลดสแนปช็อตพอร์ทัลจากเซิร์ฟเวอร์ใหม่"
      onClick={() => void props.onRefresh()}
      className={`${themeTapTarget} rounded border border-slate-600 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${portalFocusRing}`}
    >
      รีเฟรชสแนปช็อต
    </button>
  )
}

/** แสดงว่าสแนปช็อตมาจาก API หรือข้อมูลจำลอง (ตอนโหลดไม่สำเร็จ) */
export function PortalDataSourceBadge(props: { loading: boolean; source: 'api' | 'mock' }) {
  const dataLabel = props.loading ? 'กำลังโหลด…' : props.source === 'api' ? 'API' : 'จำลอง'
  return (
    <span
      role="status"
      aria-live="polite"
      aria-busy={props.loading}
      aria-atomic="true"
      className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400"
      title="แหล่งข้อมูลของสแนปช็อตพอร์ทัล (API = จากเซิร์ฟเวอร์, จำลอง = ข้อมูลสำรองเมื่อโหลดไม่สำเร็จ)"
    >
      data: {dataLabel}
    </span>
  )
}

/** ปุ่มรีเฟรช + badge แหล่งข้อมูล — ใช้ในแถบ Role view ของแต่ละพอร์ทัล */
export function PortalSnapshotToolbar(props: {
  loading: boolean
  source: 'api' | 'mock'
  onRefresh: () => void | Promise<void>
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="เครื่องมือสแนปช็อตพอร์ทัล">
      <PortalSnapshotRefreshButton loading={props.loading} onRefresh={props.onRefresh} />
      <PortalDataSourceBadge loading={props.loading} source={props.source} />
    </div>
  )
}

/** หัวข้อ/คำอธิบาย (children) + badge แหล่งสแนปช็อต — ใช้ในหน้าย่อยของพอร์ทัล */
export function PortalSectionHeader(props: {
  loading: boolean
  source: 'api' | 'mock'
  children: ReactNode
  /** แทนที่คลาสของแถว (ค่าเริ่มต้น: flex flex-wrap items-start justify-between gap-3) */
  className?: string
}) {
  const rowClass = props.className ?? 'flex flex-wrap items-start justify-between gap-3'
  return (
    <div className={rowClass} aria-busy={props.loading}>
      {props.children}
      <PortalDataSourceBadge loading={props.loading} source={props.source} />
    </div>
  )
}

/** แถบสรุปสแนปช็อตบนแดชบอร์ด (เนื้อหาซ้าย + ข้อความโหลด + badge ตัวเลือก + เนื้อหาท้ายแถว) */
export function PortalSnapshotStatusRow(props: {
  loading: boolean
  source: 'api' | 'mock'
  children: ReactNode
  /** ปิดเมื่อมี badge ที่แถบ Role แล้ว (เช่น Member dashboard) */
  showBadge?: boolean
  /** ปุ่มหรือลิงก์เพิ่มทางขวา — ต่อท้ายข้อความโหลด / badge */
  endExtra?: ReactNode
}) {
  const showBadge = props.showBadge !== false
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {props.children}
      <div className="flex flex-wrap items-center gap-2">
        {props.loading ? (
          <span className="text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
            กำลังโหลดสแนปช็อต…
          </span>
        ) : null}
        {showBadge ? <PortalDataSourceBadge loading={props.loading} source={props.source} /> : null}
        {props.endExtra}
      </div>
    </div>
  )
}

/** ข้อความโหลดเนื้อหาหลักใต้หัว section พอร์ทัล */
export function PortalContentLoading(props: { className?: string }) {
  return (
    <p className={props.className ?? 'mt-4 text-sm text-slate-400'} aria-live="polite" aria-atomic="true" role="status">
      กำลังโหลด…
    </p>
  )
}

/** หน้าไม่พบ route ภายในพอร์ทัล (404 ใน shell เดียวกัน) */
export function PortalNotFound(props: { scopeLabel: string }) {
  return (
    <section
      className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-slate-300">ไม่พบหน้าที่ร้องขอภายในพอร์ทัล{props.scopeLabel}</p>
      <p className="mt-3">
        เลือกหน้าจากเมนูพอร์ทัล (ด้านข้างบนจอใหญ่ หรือแถบเลื่อนแนวนอนบนมือถือ) หรือกลับไปหน้าหลักของระบบ
      </p>
      <Link
        to="/"
        className={`${themeTapTarget} mt-4 inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
      >
        กลับหน้าหลัก
      </Link>
    </section>
  )
}

export function SectionPlaceholder(props: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label={props.title}>
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">{props.title}</h3>
      <p className="mt-3 text-sm text-slate-400">{props.description}</p>
    </section>
  )
}

export function TrendBars(props: { items: Array<{ label: string; value: number }>; color?: 'fuchsia' | 'violet' | 'cyan' }) {
  const max = Math.max(...props.items.map((item) => item.value), 1)
  const tone =
    props.color === 'violet' ? 'bg-violet-500/80' : props.color === 'cyan' ? 'bg-cyan-500/80' : 'bg-fuchsia-500/80'
  const toneLabel = props.color === 'violet' ? 'ม่วง' : props.color === 'cyan' ? 'ฟ้า' : 'บานเย็น'
  return (
    <div
      className="mt-4 space-y-2"
      role="list"
      aria-label={`กราฟแท่งแนวโน้มสี${toneLabel}`}
    >
      {props.items.map((item) => (
        <div key={item.label} className="grid grid-cols-[64px_1fr_48px] items-center gap-3 text-sm" role="listitem">
          <span className="text-slate-400">{item.label}</span>
          <div className="h-2 rounded bg-slate-800" role="presentation" aria-hidden="true">
            <div className={`h-full rounded ${tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="text-right text-slate-300" aria-label={`${item.label} มีค่า ${item.value}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DonationCampaignCard(props: {
  title: string
  progress: number
  target: string
  raised: string
  /** รายละเอียดจาก Admin — school_activities.description */
  description?: string | null
}) {
  const progress = Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0))
  const desc = props.description != null && String(props.description).trim() ? String(props.description).trim() : ''
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-100">{props.title}</p>
      {desc ? (
        <p className="mt-1 line-clamp-3 text-xs text-slate-500" title={desc}>
          {desc}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate-400">
        สะสม {props.raised} / เป้าหมาย {props.target}
      </p>
      <div
        className="mt-3 h-2 rounded bg-slate-800"
        role="progressbar"
        aria-label={`ความคืบหน้าโครงการ ${props.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}%`}
      >
        <div className="h-full rounded bg-fuchsia-500/80" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-fuchsia-200">คืบหน้า {progress}%</p>
    </div>
  )
}

export function MeetingReportRow(props: { title: string; date: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2" role="listitem">
      <p className="text-slate-100">{props.title}</p>
      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{props.date}</span>
    </div>
  )
}
