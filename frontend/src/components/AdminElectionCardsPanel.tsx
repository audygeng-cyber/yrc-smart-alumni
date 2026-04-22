import { useCallback, useEffect, useRef, useState } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY, normalizeApiBase } from '../lib/adminApi'
import { formatFetchError, readApiJson } from '../lib/adminHttp'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing } from '../portal/portalLabels'

type ElectionEvent = {
  id: string
  slug: string
  title_th: string
  is_active: boolean
  claim_starts_at: string | null
  claim_ends_at: string | null
  created_at?: string
}

type StatsPayload = {
  ok: boolean
  claims_count: number
  active_members_total: number
  pct_of_active_members: number
  by_batch: { batch_label: string; claimed_count: number }[]
  slug?: string
  title_th?: string
}

type Props = { apiBase: string }

export function AdminElectionCardsPanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [events, setEvents] = useState<ElectionEvent[]>([])
  const [listMsg, setListMsg] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)

  const [newSlug, setNewSlug] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createMsg, setCreateMsg] = useState<string | null>(null)

  const [statsEventId, setStatsEventId] = useState('')
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsMsg, setStatsMsg] = useState<string | null>(null)
  const initialListFetched = useRef(false)

  useEffect(() => {
    const k = sessionStorage.getItem(ADMIN_UPLOAD_STORAGE_KEY) ?? ''
    setAdminKey(k)
    if (!k.trim() || initialListFetched.current) return
    initialListFetched.current = true
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      setListMsg(null)
      try {
        const r = await fetch(`${base}/api/admin/election-events`, {
          headers: { 'x-admin-key': k.trim() },
        })
        const { payload, rawText, ok } = await readApiJson(r)
        if (cancelled) return
        if (ok && payload && typeof payload === 'object' && 'events' in payload) {
          setEvents((payload as { events: ElectionEvent[] }).events ?? [])
        } else {
          setListMsg(formatFetchError('โหลดรายการงาน', r.status, payload, rawText))
        }
      } catch {
        if (!cancelled) setListMsg('เรียก API ไม่สำเร็จ')
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [base])

  const persistKey = useCallback((k: string) => {
    const t = k.trim()
    if (t) sessionStorage.setItem(ADMIN_UPLOAD_STORAGE_KEY, t)
    else sessionStorage.removeItem(ADMIN_UPLOAD_STORAGE_KEY)
  }, [])

  const loadEvents = useCallback(async () => {
    if (!adminKey.trim()) {
      setListMsg('ใส่ Admin key ก่อน')
      return
    }
    setListLoading(true)
    setListMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/election-events`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok && payload && typeof payload === 'object' && 'events' in payload) {
        setEvents((payload as { events: ElectionEvent[] }).events ?? [])
        setListMsg(null)
      } else {
        setListMsg(formatFetchError('โหลดรายการงาน', r.status, payload, rawText))
      }
    } catch {
      setListMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setListLoading(false)
    }
  }, [adminKey, base])

  async function createEvent() {
    if (!adminKey.trim()) {
      setCreateMsg('ใส่ Admin key ก่อน')
      return
    }
    setCreateLoading(true)
    setCreateMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/election-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.trim() },
        body: JSON.stringify({ slug: newSlug.trim(), title_th: newTitle.trim(), is_active: true }),
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok) {
        setCreateMsg('สร้างงานแล้ว')
        setNewSlug('')
        setNewTitle('')
        await loadEvents()
      } else {
        setCreateMsg(formatFetchError('สร้างงาน', r.status, payload, rawText))
      }
    } catch {
      setCreateMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setCreateLoading(false)
    }
  }

  async function toggleActive(ev: ElectionEvent, next: boolean) {
    if (!adminKey.trim()) return
    try {
      const r = await fetch(`${base}/api/admin/election-events/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey.trim() },
        body: JSON.stringify({ is_active: next }),
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (!ok) {
        setListMsg(formatFetchError('อัปเดตงาน', r.status, payload, rawText))
        return
      }
      await loadEvents()
    } catch {
      setListMsg('เรียก API ไม่สำเร็จ')
    }
  }

  async function loadStats() {
    if (!adminKey.trim() || !statsEventId.trim()) {
      setStatsMsg('เลือกงานและใส่ Admin key')
      return
    }
    setStatsLoading(true)
    setStatsMsg(null)
    setStats(null)
    try {
      const r = await fetch(`${base}/api/admin/election-events/${statsEventId.trim()}/stats`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok && payload && typeof payload === 'object') {
        setStats(payload as StatsPayload)
      } else {
        setStatsMsg(formatFetchError('โหลดสถิติ', r.status, payload, rawText))
      }
    } catch {
      setStatsMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setStatsLoading(false)
    }
  }

  return (
    <div className="space-y-8 text-sm text-slate-200">
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-white">รับบัตรเลือกตั้ง (QR สมาชิก)</h2>
        <p className="mt-2 text-xs text-slate-400">
          สร้างงาน (slug) เปิดรับบัตร — สมาชิกสแกน QR แล้วเลือกงานที่หน้า{' '}
          <code className="rounded bg-slate-950 px-1">/open/member-identity</code> — อ่าน flow ใน{' '}
          <code className="rounded bg-slate-950 px-1">docs/MEMBER_IDENTITY_QR_FLOW.md</code>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs text-slate-400">
            Admin key
            <input
              type="password"
              autoComplete="off"
              value={adminKey}
              onChange={(e) => {
                const v = e.target.value
                setAdminKey(v)
                persistKey(v)
              }}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100"
            />
          </label>
          <button
            type="button"
            disabled={listLoading}
            onClick={() => void loadEvents()}
            className={`${themeTapTarget} shrink-0 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            รีเฟรชรายการ
          </button>
        </div>
        {listMsg ? <p className="mt-2 text-xs text-amber-200/90">{listMsg}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-100">สร้างงานใหม่</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            slug (a-z 0-9 - เช่น agm-2026)
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-slate-400">
            ชื่องาน (ไทย)
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={createLoading}
          onClick={() => void createEvent()}
          className={`${themeTapTarget} mt-4 inline-flex rounded-lg px-4 py-2 text-sm text-white ${themeAccent.buttonPrimary} ${portalFocusRing}`}
        >
          สร้างงาน
        </button>
        {createMsg ? <p className="mt-2 text-xs text-slate-400">{createMsg}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-100">รายการงาน</h3>
        {events.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">ยังไม่มีงาน — สร้างด้านบน หรือรัน migration บน Supabase</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 border border-slate-800 rounded-lg">
            {events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-fuchsia-300">{ev.slug}</p>
                  <p className="text-sm text-slate-200">{ev.title_th}</p>
                  <p className="text-[10px] text-slate-500">{ev.is_active ? 'เปิดรับ' : 'ปิด'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive(ev, !ev.is_active)}
                  className={`shrink-0 rounded border border-slate-600 px-2 py-1 text-xs hover:bg-slate-800 ${portalFocusRing}`}
                >
                  {ev.is_active ? 'ปิดงาน' : 'เปิดงาน'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-100">สถิติการรับบัตร</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs text-slate-400">
            เลือกงาน (id)
            <select
              value={statsEventId}
              onChange={(e) => setStatsEventId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.slug} — {ev.title_th}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={statsLoading}
            onClick={() => void loadStats()}
            className={`${themeTapTarget} shrink-0 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            โหลดสถิติ
          </button>
        </div>
        {statsMsg ? <p className="mt-2 text-xs text-amber-200/90">{statsMsg}</p> : null}
        {stats?.ok ? (
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <p>
              ผู้รับบัตร: <span className="font-mono text-fuchsia-200">{stats.claims_count}</span> คน · สมาชิก Active
              ในทะเบียน: <span className="font-mono">{stats.active_members_total}</span> คน · คิดเป็น{' '}
              <span className="font-mono text-fuchsia-200">{stats.pct_of_active_members}%</span>
            </p>
            <div>
              <p className="font-medium text-slate-400">แยกตามรุ่น (จาก snapshot ตอนรับ)</p>
              <table className="mt-2 w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1 pr-2">รุ่น</th>
                    <th className="py-1">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_batch.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-2 text-slate-500">
                        ยังไม่มีผู้รับบัตร
                      </td>
                    </tr>
                  ) : (
                    stats.by_batch.map((row) => (
                      <tr key={row.batch_label} className="border-b border-slate-800/80">
                        <td className="py-1 pr-2">{row.batch_label}</td>
                        <td className="py-1 font-mono">{row.claimed_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
