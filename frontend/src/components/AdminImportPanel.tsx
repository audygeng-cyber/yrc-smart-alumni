import { useEffect, useState } from 'react'

const STORAGE_KEY = 'yrc_admin_upload_key'

type Props = { apiBase: string }

export function AdminImportPanel({ apiBase }: Props) {
  const [adminKey, setAdminKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(STORAGE_KEY) ?? '')
  }, [])

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, adminKey)
  }, [adminKey])

  async function upload() {
    if (!file || !adminKey.trim()) {
      setMsg('เลือกไฟล์ .xlsx และใส่ Admin key')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${apiBase}/api/admin/members/import`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim() },
        body: fd,
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setMsg(`สำเร็จ: importBatchId=${j.importBatchId} จำนวน ${j.inserted} แถว`)
      setFile(null)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function wipeAll() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key')
      return
    }
    if (!window.confirm('ลบสมาชิกทั้งหมดจากตาราง members — ยืนยัน?')) return
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${apiBase}/api/admin/members/all`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const j = await r.json().catch(() => ({}))
      setMsg(r.ok ? 'ลบสมาชิกทั้งหมดแล้ว' : JSON.stringify(j, null, 2))
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-200/90">
        Admin — นำเข้า / ล้างสมาชิก
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ใช้เฉพาะผู้ดูแลระบบ อย่า commit Admin key; เก็บใน session ของเบราว์เซอร์เท่านั้น
      </p>
      <label className="mt-4 block text-sm text-slate-300">
        x-admin-key
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-600"
          placeholder="ค่าเดียวกับ ADMIN_UPLOAD_KEY ใน backend/.env"
        />
      </label>
      <label className="mt-4 block text-sm text-slate-300">
        ไฟล์ .xlsx (ชีตแรก)
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-200"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={upload}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-500 disabled:opacity-50"
        >
          อัปโหลดนำเข้า
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={wipeAll}
          className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50"
        >
          ลบสมาชิกทั้งหมด
        </button>
      </div>
      {msg && (
        <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300">
          {msg}
        </pre>
      )}
    </section>
  )
}
