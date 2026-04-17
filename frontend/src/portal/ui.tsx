import { NavLink } from 'react-router-dom'

export function PortalShell(props: {
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

export function MetricCards(props: { items: Array<{ label: string; value: string; hint: string }> }) {
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

/** แสดงว่า snapshot มาจาก API หรือข้อมูลจำลอง (ตอนโหลดไม่สำเร็จ) */
export function PortalDataSourceBadge(props: { loading: boolean; source: 'api' | 'mock' }) {
  return (
    <span
      className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400"
      title="แหล่งข้อมูลของ snapshot พอร์ทัล"
    >
      data: {props.loading ? 'loading...' : props.source}
    </span>
  )
}

export function SectionPlaceholder(props: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">{props.title}</h3>
      <p className="mt-3 text-sm text-slate-400">{props.description}</p>
    </section>
  )
}

export function TrendBars(props: { items: Array<{ label: string; value: number }>; color?: 'emerald' | 'violet' | 'cyan' }) {
  const max = Math.max(...props.items.map((item) => item.value), 1)
  const tone =
    props.color === 'violet' ? 'bg-violet-500/80' : props.color === 'cyan' ? 'bg-cyan-500/80' : 'bg-emerald-500/80'
  return (
    <div className="mt-4 space-y-2">
      {props.items.map((item) => (
        <div key={item.label} className="grid grid-cols-[64px_1fr_48px] items-center gap-3 text-sm">
          <span className="text-slate-400">{item.label}</span>
          <div className="h-2 rounded bg-slate-800">
            <div className={`h-full rounded ${tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="text-right text-slate-300">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function DonationCampaignCard(props: { title: string; progress: number; target: string; raised: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-100">{props.title}</p>
      <p className="mt-1 text-xs text-slate-400">
        สะสม {props.raised} / เป้าหมาย {props.target}
      </p>
      <div className="mt-3 h-2 rounded bg-slate-800">
        <div className="h-full rounded bg-emerald-500/80" style={{ width: `${Math.min(100, props.progress)}%` }} />
      </div>
      <p className="mt-2 text-xs text-emerald-200">คืบหน้า {props.progress}%</p>
    </div>
  )
}

export function MeetingReportRow(props: { title: string; date: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-3 py-2">
      <p className="text-slate-100">{props.title}</p>
      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{props.date}</span>
    </div>
  )
}
