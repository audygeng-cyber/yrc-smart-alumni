import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'yrc_admin_upload_key'

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

type Props = { apiBase: string }

export function MemberRequestsPanel({ apiBase }: Props) {
  const [adminKey, setAdminKey] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_KEY) ?? '')
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, adminKey)
  }, [adminKey])

  const load = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key ก่อน')
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
    } catch {
      setMsg('โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminKey, filter])

  async function callAction(
    path: string,
    body: Record<string, string | undefined>,
  ) {
    if (!adminKey.trim()) {
      setMsg('ใส่ x-admin-key')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${apiBase}/api/admin/member-requests${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
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

  return (
    <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-violet-200/90">
        คำร้องสมาชิก (ประธานรุ่น → Admin)
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ใช้คีย์เดียวกับแท็บ Admin นำเข้า — ลำดับ: อนุมัติประธานรุ่น → อนุมัติ Admin (สมัครใหม่จะสร้างแถวใน members)
      </p>

      <label className="mt-4 block text-sm text-slate-300">
        x-admin-key
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-violet-600"
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
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          โหลดรายการ
        </button>
      </div>

      <ul className="mt-6 space-y-4">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-left text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-slate-500">{r.id}</span>
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
                      void callAction(`/${r.id}/president-approve`, { approved_by: 'ประธานรุ่น' })
                    }
                    className="rounded bg-amber-800 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
                  >
                    อนุมัติ (ประธานรุ่น)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(`/${r.id}/reject`, { rejected_by: 'ประธานรุ่น', reason: 'ปฏิเสธ' })
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
                    onClick={() => void callAction(`/${r.id}/admin-approve`, { approved_by: 'Admin' })}
                    className="rounded bg-emerald-800 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                  >
                    อนุมัติ (Admin)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      void callAction(`/${r.id}/reject`, { rejected_by: 'Admin', reason: 'ปฏิเสธ' })
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

      {rows.length === 0 && !loading && (
        <p className="mt-6 text-center text-sm text-slate-500">ไม่มีรายการ (หรือยังไม่ได้กดโหลด)</p>
      )}

      {msg && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      )}
    </section>
  )
}
