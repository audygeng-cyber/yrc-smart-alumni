import { useEffect, useState } from 'react'

const STORAGE_KEY = 'yrc_admin_upload_key'

type Props = { apiBase: string }

export function AdminImportPanel({ apiBase }: Props) {
  const [adminKey, setAdminKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lastImportBatchId, setLastImportBatchId] = useState<string | null>(null)
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
      setLastImportBatchId(typeof j.importBatchId === 'string' ? j.importBatchId : null)
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

  async function summarizeImport() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key')
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const q = new URLSearchParams()
      if (lastImportBatchId) {
        q.set('importBatchId', lastImportBatchId)
      }
      const url = `${apiBase}/api/admin/members/summary${q.toString() ? `?${q.toString()}` : ''}`
      const r = await fetch(url, {
        method: 'GET',
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const j = await r.json().catch(() => ({}))
      setMsg(
        r.ok
          ? JSON.stringify(j, null, 2)
          : `ตรวจสอบหลังนำเข้าไม่สำเร็จ\n${JSON.stringify(j, null, 2)}`,
      )
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
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-400">
        <p className="font-medium text-slate-300">เทมเพลตหัวตาราง (ครบทุกคอลัมน์)</p>
        <p className="mt-1 text-xs">
          ดาวน์โหลดแล้วกรอกข้อมูลในชีตแรก — คอลัมน์ที่ไม่มีข้อมูลเว้นว่างได้; ต้องมีอย่างน้อย{' '}
          <span className="text-amber-200/90">รุ่น · ชื่อ · นามสกุล</span> ตามที่ระบบตรวจตอนนำเข้า
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={`${apiBase}/api/admin/members/import-template.xlsx`}
            className="inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-slate-700"
            target="_blank"
            rel="noreferrer"
          >
            ดาวน์โหลด .xlsx
          </a>
          <a
            href={`${apiBase}/api/admin/members/import-template.csv`}
            className="inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            target="_blank"
            rel="noreferrer"
          >
            ดาวน์โหลด .csv
          </a>
        </div>
      </div>
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
          onClick={summarizeImport}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-50"
        >
          ตรวจสอบหลังนำเข้า
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
