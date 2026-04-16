import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_ADMIN = 'yrc_admin_upload_key'
const STORAGE_PRESIDENT = 'yrc_president_upload_key'
const STORAGE_AUTO_REFRESH = 'yrc_member_requests_auto_refresh'
const STORAGE_AUTO_REFRESH_MS = 'yrc_member_requests_auto_refresh_ms'
const STORAGE_LAST_PENDING = 'yrc_member_requests_last_pending'
const STORAGE_LAST_REQUEST_IDS = 'yrc_member_requests_last_ids'

type RequestRow = {
  id: string
  line_uid: string | null
  request_type: string
  requested_data: Record<string, unknown>
  status: string
  president_approved_by: string | null
  president_approved_at: string | null
  admin_approved_by: string | null
  admin_approved_at: string | null
  created_at: string
}

type QuickView = 'all' | 'new' | 'pending'
type SortMode = 'newest' | 'oldest' | 'pending_first'

type Props = { apiBase: string }

export function MemberRequestsPanel({ apiBase }: Props) {
  const [adminKey, setAdminKey] = useState('')
  const [presidentKey, setPresidentKey] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [autoRefreshMs, setAutoRefreshMs] = useState(30000)
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)
  const [pendingIncrease, setPendingIncrease] = useState(0)
  const [newRowIds, setNewRowIds] = useState<string[]>([])
  const [quickView, setQuickView] = useState<QuickView>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('newest')

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      pending_president: 0,
      pending_admin: 0,
      approved: 0,
      rejected: 0,
      other: 0,
    }

    for (const row of rows) {
      switch (row.status) {
        case 'pending_president':
          counts.pending_president += 1
          break
        case 'pending_admin':
          counts.pending_admin += 1
          break
        case 'approved':
          counts.approved += 1
          break
        case 'rejected':
          counts.rejected += 1
          break
        default:
          counts.other += 1
          break
      }
    }

    return counts
  }, [rows])

  const pendingTotal = summary.pending_president + summary.pending_admin
  const newRowIdSet = useMemo(() => new Set(newRowIds), [newRowIds])
  const searchQueryTrimmed = searchQuery.trim().toLowerCase()
  const filteredRows = useMemo(() => {
    let nextRows = rows

    if (quickView === 'new') {
      nextRows = nextRows.filter((row) => newRowIdSet.has(row.id))
    } else if (quickView === 'pending') {
      nextRows = nextRows.filter((row) => row.status === 'pending_president' || row.status === 'pending_admin')
    }

    if (!searchQueryTrimmed) return nextRows

    return nextRows.filter((row) => buildRequestSearchText(row).includes(searchQueryTrimmed))
  }, [newRowIdSet, quickView, rows, searchQueryTrimmed])
  const sortedRows = useMemo(() => {
    const nextRows = [...filteredRows]

    if (sortMode === 'oldest') {
      return nextRows.sort((a, b) => getCreatedAtMs(a) - getCreatedAtMs(b))
    }

    if (sortMode === 'pending_first') {
      return nextRows.sort((a, b) => {
        const pendingDiff = getPendingPriority(a.status) - getPendingPriority(b.status)
        if (pendingDiff !== 0) return pendingDiff
        return getCreatedAtMs(b) - getCreatedAtMs(a)
      })
    }

    return nextRows.sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
  }, [filteredRows, sortMode])

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_ADMIN) ?? '')
    setPresidentKey(sessionStorage.getItem(STORAGE_PRESIDENT) ?? '')
    setAutoRefresh(sessionStorage.getItem(STORAGE_AUTO_REFRESH) === 'true')

    const savedMs = Number(sessionStorage.getItem(STORAGE_AUTO_REFRESH_MS) ?? '30000')
    if (Number.isFinite(savedMs) && savedMs >= 5000) {
      setAutoRefreshMs(savedMs)
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_ADMIN, adminKey)
  }, [adminKey])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_PRESIDENT, presidentKey)
  }, [presidentKey])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_AUTO_REFRESH, autoRefresh ? 'true' : 'false')
  }, [autoRefresh])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_AUTO_REFRESH_MS, String(autoRefreshMs))
  }, [autoRefreshMs])

  useEffect(() => {
    const savedPending = Number(sessionStorage.getItem(STORAGE_LAST_PENDING) ?? '0')
    if (!Number.isFinite(savedPending) || savedPending < 0) return
    if (savedPending > 0 && pendingTotal > savedPending) {
      setPendingIncrease(pendingTotal - savedPending)
    }
    sessionStorage.setItem(STORAGE_LAST_PENDING, String(pendingTotal))
  }, [pendingTotal])

  useEffect(() => {
    const savedRaw = sessionStorage.getItem(STORAGE_LAST_REQUEST_IDS)
    const savedIds = savedRaw ? savedRaw.split(',').map((v) => v.trim()).filter(Boolean) : []
    const currentIds = rows.map((row) => row.id)

    if (savedIds.length === 0) {
      setNewRowIds([])
      if (currentIds.length > 0) sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
      return
    }

    const savedSet = new Set(savedIds)
    const incoming = currentIds.filter((id) => !savedSet.has(id))
    setNewRowIds(incoming)
    sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
  }, [rows])

  const load = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key ก่อน (เฉพาะ Admin ดูรายการได้)')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const q = filter.trim() ? `?status=${encodeURIComponent(filter.trim())}` : ''
      const r = await fetch(`${apiBase}/api/admin/member-requests${q}`, {
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const j = (await r.json().catch(() => ({}))) as { requests?: RequestRow[]; error?: string }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setRows(j.requests ?? [])
      setLastLoadedAt(new Date().toISOString())
    } catch {
      setMsg('โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminKey, filter])

  useEffect(() => {
    if (!autoRefresh || !adminKey.trim()) return

    const timer = window.setInterval(() => {
      void load()
    }, autoRefreshMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [adminKey, autoRefresh, autoRefreshMs, load])

  function headersAdminOnly(): Record<string, string> | null {
    if (!adminKey.trim()) return null
    return {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey.trim(),
    }
  }

  /** อนุมัติประธานรุ่น / ปฏิเสธ — ส่ง x-admin-key หรือ x-president-key อย่างใดอย่างหนึ่ง (หรือทั้งคู่) */
  function headersPresidentOrAdmin(): Record<string, string> | null {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (adminKey.trim()) h['x-admin-key'] = adminKey.trim()
    if (presidentKey.trim()) h['x-president-key'] = presidentKey.trim()
    if (!adminKey.trim() && !presidentKey.trim()) return null
    return h
  }

  async function callAction(
    path: string,
    body: Record<string, string | undefined>,
    auth: 'admin-only' | 'president-or-admin',
  ) {
    const headers =
      auth === 'admin-only' ? headersAdminOnly() : headersPresidentOrAdmin()
    if (!headers) {
      setMsg(
        auth === 'admin-only'
          ? 'ใส่ x-admin-key'
          : 'ใส่ x-admin-key หรือ x-president-key (ต้องตรงกับ backend)',
      )
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${apiBase}/api/admin/member-requests${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      setMsg(JSON.stringify(j, null, 2))
      if (r.ok) await load()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function markAllAsSeen() {
    const currentIds = rows.map((row) => row.id)
    sessionStorage.setItem(STORAGE_LAST_REQUEST_IDS, currentIds.join(','))
    sessionStorage.setItem(STORAGE_LAST_PENDING, String(pendingTotal))
    setNewRowIds([])
    setPendingIncrease(0)
    setMsg('ทำเครื่องหมายคำร้องปัจจุบันทั้งหมดว่าเห็นแล้ว')
  }

  return (
    <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-violet-200/90">
        คำร้องสมาชิก (ประธานรุ่น → Admin)
      </h2>
      {pendingIncrease > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100">
          <p>
            มีคำร้องที่รอดำเนินการเพิ่มขึ้น {pendingIncrease} รายการ และตอนนี้มี pending รวม {pendingTotal} รายการ
          </p>
          <button
            type="button"
            onClick={() => setPendingIncrease(0)}
            className="rounded border border-amber-700 px-3 py-1 text-xs text-amber-100 hover:bg-amber-900/30"
          >
            ซ่อนแจ้งเตือน
          </button>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-amber-900/40 px-2 py-1 text-amber-200">
          pending รวม: {pendingTotal}
        </span>
        <span className="rounded bg-slate-900 px-2 py-1 text-slate-300">
          last updated: {lastLoadedAt ? new Date(lastLoadedAt).toLocaleString() : '-'}
        </span>
        <span
          className={`rounded px-2 py-1 ${
            autoRefresh ? 'bg-emerald-900/40 text-emerald-200' : 'bg-slate-900 text-slate-300'
          }`}
        >
          auto refresh: {autoRefresh ? 'on' : 'off'}
        </span>
        <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-200">
          ใหม่: {newRowIds.length}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Admin ดูรายการด้วย x-admin-key — ประธานรุ่นอนุมัติขั้นแรกได้ด้วย x-president-key (ตั้ง PRESIDENT_UPLOAD_KEY
        ใน backend) หรือให้ Admin ใช้ x-admin-key แทนได้
      </p>

      <label className="mt-4 block text-sm text-slate-300">
        x-admin-key (ดูรายการ + อนุมัติ Admin)
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-violet-600"
        />
      </label>

      <label className="mt-4 block text-sm text-slate-300">
        x-president-key (อนุมัติประธานรุ่น / ปฏิเสธ — ไม่บังคับถ้าใช้ admin แทน)
        <input
          type="password"
          autoComplete="off"
          value={presidentKey}
          onChange={(e) => setPresidentKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-700"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300">
          กรอง status
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="เช่น pending_president"
            className="mt-1 block w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-violet-600"
          />
        </label>
        <label className="text-sm text-slate-300">
          ค้นหาในคำร้อง
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="line_uid / รุ่น / ชื่อ / นามสกุล"
            className="mt-1 block w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          />
        </label>
        <label className="text-sm text-slate-300">
          Auto refresh ทุก
          <select
            value={String(autoRefreshMs)}
            onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          >
            <option value="10000">10 วินาที</option>
            <option value="30000">30 วินาที</option>
            <option value="60000">60 วินาที</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          เรียงลำดับ
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-600"
          >
            <option value="newest">ใหม่สุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="pending_first">pending ก่อน</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          เปิด auto refresh
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          โหลดรายการ
        </button>
        <button
          type="button"
          disabled={loading || (newRowIds.length === 0 && pendingIncrease === 0)}
          onClick={markAllAsSeen}
          className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-950/30 disabled:opacity-50"
        >
          mark all as seen
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="ทั้งหมด" value={summary.total} tone="slate" />
        <SummaryCard label="รอประธานรุ่น" value={summary.pending_president} tone="amber" />
        <SummaryCard label="รอ Admin" value={summary.pending_admin} tone="violet" />
        <SummaryCard label="อนุมัติแล้ว" value={summary.approved} tone="emerald" />
        <SummaryCard label="ถูกปฏิเสธ" value={summary.rejected} tone="red" />
        {summary.other > 0 ? <SummaryCard label="สถานะอื่น" value={summary.other} tone="slate" /> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setQuickView('all')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'all'
              ? 'border-violet-700 bg-violet-900/40 text-violet-100'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          ทั้งหมดในรายการ
        </button>
        <button
          type="button"
          onClick={() => setQuickView('new')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'new'
              ? 'border-emerald-700 bg-emerald-900/40 text-emerald-100'
              : 'border-emerald-800 text-emerald-200 hover:bg-emerald-950/30'
          }`}
        >
          เฉพาะรายการใหม่ ({newRowIds.length})
        </button>
        <button
          type="button"
          onClick={() => setQuickView('pending')}
          className={`rounded border px-3 py-1.5 text-xs ${
            quickView === 'pending'
              ? 'border-amber-700 bg-amber-900/40 text-amber-100'
              : 'border-amber-800 text-amber-200 hover:bg-amber-950/30'
          }`}
        >
          เฉพาะ pending ({pendingTotal})
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('')}
          className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          ดูทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending_president')}
          className="rounded border border-amber-800 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/30"
        >
          รอประธานรุ่น
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending_admin')}
          className="rounded border border-violet-800 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/30"
        >
          รอ Admin
        </button>
        <button
          type="button"
          onClick={() => setFilter('approved')}
          className="rounded border border-emerald-800 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/30"
        >
          อนุมัติแล้ว
        </button>
        <button
          type="button"
          onClick={() => setFilter('rejected')}
          className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/30"
        >
          ถูกปฏิเสธ
        </button>
      </div>

      <ul className="mt-6 space-y-4">
        {sortedRows.map((r) => (
          <li
            key={r.id}
            className={`rounded-lg border p-4 text-left text-sm ${
              newRowIdSet.has(r.id)
                ? 'border-emerald-700/60 bg-emerald-950/20 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{r.id}</span>
                {newRowIdSet.has(r.id) ? (
                  <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">ใหม่</span>
                ) : null}
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  r.status === 'approved'
                    ? 'bg-emerald-900/50 text-emerald-200'
                    : r.status === 'rejected'
                      ? 'bg-red-900/40 text-red-200'
                      : 'bg-amber-900/40 text-amber-200'
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-slate-300">
              <span className="text-slate-500">line_uid:</span>{' '}
              <span className="break-all font-mono text-violet-200">{r.line_uid ?? '—'}</span>
            </p>
            <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-900/80 p-2 text-xs text-slate-400">
              {JSON.stringify(r.requested_data, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === 'pending_president' && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(`/${r.id}/president-approve`, { approved_by: 'ประธานรุ่น' }, 'president-or-admin')
                    }
                    className="rounded bg-amber-800 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
                  >
                    อนุมัติ (ประธานรุ่น)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/reject`,
                        { rejected_by: 'ประธานรุ่น', reason: 'ปฏิเสธ' },
                        'president-or-admin',
                      )
                    }
                    className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
              {r.status === 'pending_admin' && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(`/${r.id}/admin-approve`, { approved_by: 'Admin' }, 'admin-only')
                    }
                    className="rounded bg-emerald-800 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                  >
                    อนุมัติ (Admin)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(
                        `/${r.id}/reject`,
                        { rejected_by: 'Admin', reason: 'ปฏิเสธ' },
                        'president-or-admin',
                      )
                    }
                    className="rounded border border-red-800 px-3 py-1.5 text-xs text-red-300"
                  >
                    ปฏิเสธ
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {sortedRows.length === 0 && !loading && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {rows.length === 0
            ? 'ไม่มีรายการ (หรือยังไม่ได้กดโหลด)'
            : 'ไม่มีรายการที่ตรงกับ quick filter หรือคำค้นปัจจุบัน'}
        </p>
      )}

      {msg && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      )}
    </section>
  )
}

function buildRequestSearchText(row: RequestRow): string {
  const requested = row.requested_data ?? {}
  const rawParts = [
    row.id,
    row.line_uid ?? '',
    row.status,
    row.request_type,
    pickRequestedText(requested, 'batch'),
    pickRequestedText(requested, 'first_name'),
    pickRequestedText(requested, 'last_name'),
    JSON.stringify(requested),
  ]

  return rawParts.join(' ').toLowerCase()
}

function getCreatedAtMs(row: RequestRow): number {
  const time = Date.parse(row.created_at)
  return Number.isFinite(time) ? time : 0
}

function getPendingPriority(status: string): number {
  if (status === 'pending_president') return 0
  if (status === 'pending_admin') return 1
  return 2
}

function pickRequestedText(requested: Record<string, unknown>, key: string): string {
  const value = requested[key]
  return typeof value === 'string' ? value : ''
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'slate' | 'amber' | 'violet' | 'emerald' | 'red'
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-900/40 bg-amber-950/20 text-amber-100'
      : tone === 'violet'
        ? 'border-violet-900/40 bg-violet-950/20 text-violet-100'
        : tone === 'emerald'
          ? 'border-emerald-900/40 bg-emerald-950/20 text-emerald-100'
          : tone === 'red'
            ? 'border-red-900/40 bg-red-950/20 text-red-100'
            : 'border-slate-800 bg-slate-950/50 text-slate-100'

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
