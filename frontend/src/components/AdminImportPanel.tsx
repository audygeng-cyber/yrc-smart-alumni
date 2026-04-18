import { useEffect, useState } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY, normalizeApiBase } from '../lib/adminApi'
import { formatFetchError, readApiJson } from '../lib/adminHttp'
import { portalFocusRing } from '../portal/portalLabels'

const BATCH_ID_KEY = 'yrc_last_import_batch_id'

const IMPORT_FETCH_ERROR_OPTS = { maxRawLength: 800, include404ImportHint: true } as const

type Props = { apiBase: string }

export function AdminImportPanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lastImportBatchId, setLastImportBatchId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileStatusId = 'admin-import-file-status'
  const isErrorMsg = msg !== null && (msg.includes('ไม่สำเร็จ') || msg.includes('HTTP'))

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(ADMIN_UPLOAD_STORAGE_KEY) ?? '')
    setLastImportBatchId(sessionStorage.getItem(BATCH_ID_KEY))
  }, [])

  useEffect(() => {
    sessionStorage.setItem(ADMIN_UPLOAD_STORAGE_KEY, adminKey)
  }, [adminKey])

  useEffect(() => {
    if (lastImportBatchId) {
      sessionStorage.setItem(BATCH_ID_KEY, lastImportBatchId)
    } else {
      sessionStorage.removeItem(BATCH_ID_KEY)
    }
  }, [lastImportBatchId])

  async function upload() {
    if (!file || !adminKey.trim()) {
      setMsg('เลือกไฟล์ XLSX และใส่ Admin key')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${base}/api/admin/members/import`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey.trim() },
        body: fd,
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (!ok) {
        setMsg(formatFetchError('นำเข้า', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
        return
      }
      const j = payload as { importBatchId?: unknown; inserted?: unknown }
      setLastImportBatchId(typeof j.importBatchId === 'string' ? j.importBatchId : null)
      setMsg(`สำเร็จ: importBatchId=${String(j.importBatchId)} จำนวน ${String(j.inserted)} แถว`)
      setFile(null)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function wipeAll() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    if (!window.confirm('ลบสมาชิกทั้งหมดจากตาราง `members` — ยืนยัน?')) return
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/members/all`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok) {
        setLastImportBatchId(null)
        setMsg('ลบสมาชิกทั้งหมดแล้ว')
      } else {
        setMsg(formatFetchError('ลบสมาชิกทั้งหมด', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function summarizeImport() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }

    setLoading(true)
    setMsg(null)
    try {
      const q = new URLSearchParams()
      if (lastImportBatchId) {
        q.set('importBatchId', lastImportBatchId)
      }
      const url = `${base}/api/admin/members/summary${q.toString() ? `?${q.toString()}` : ''}`
      const r = await fetch(url, {
        method: 'GET',
        headers: { 'x-admin-key': adminKey.trim() },
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok) {
        setMsg(JSON.stringify(payload, null, 2))
      } else {
        setMsg(formatFetchError('ตรวจสอบหลังนำเข้า', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6" aria-busy={loading}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-200/90">
        Admin — นำเข้า / ล้างข้อมูลสมาชิก
      </h2>
      <p className="mt-2 text-xs text-slate-500">
        ใช้เฉพาะผู้ดูแลระบบ ห้าม commit Admin key; เก็บในเซสชันของเบราว์เซอร์เท่านั้น
      </p>
      <label className="mt-4 block text-sm text-slate-300">
        Admin key (x-admin-key)
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          aria-label="Admin key สำหรับนำเข้าหรือล้างข้อมูลสมาชิก"
          className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-amber-600 ${portalFocusRing}`}
          placeholder="ค่าเดียวกับ ADMIN_UPLOAD_KEY ใน backend/.env"
        />
      </label>
      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-400" role="group" aria-label="เครื่องมือดาวน์โหลดเทมเพลตนำเข้า">
        <p className="font-medium text-slate-300">เทมเพลตหัวตาราง (ครบทุกคอลัมน์)</p>
        <p className="mt-1 text-xs">
          ดาวน์โหลดแล้วกรอกข้อมูลในชีตแรก — คอลัมน์ที่ไม่มีข้อมูลเว้นว่างได้; ต้องมีอย่างน้อย{' '}
          <span className="text-amber-200/90">รุ่น · ชื่อ · นามสกุล</span> ตามที่ระบบตรวจตอนนำเข้า
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="ลิงก์ดาวน์โหลดเทมเพลตนำเข้า">
          <a
            href={`${base}/api/admin/members/import-template.xlsx`}
            aria-label="ดาวน์โหลดเทมเพลตไฟล์นำเข้าแบบ XLSX"
            className={`inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-slate-700 ${portalFocusRing}`}
            target="_blank"
            rel="noreferrer"
          >
            ดาวน์โหลด XLSX
          </a>
          <a
            href={`${base}/api/admin/members/import-template.csv`}
            aria-label="ดาวน์โหลดเทมเพลตไฟล์นำเข้าแบบ CSV"
            className={`inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
            target="_blank"
            rel="noreferrer"
          >
            ดาวน์โหลด CSV
          </a>
        </div>
      </div>
      <label className="mt-4 block text-sm text-slate-300">
        ไฟล์ XLSX (ชีตแรก)
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-label="เลือกไฟล์ XLSX สำหรับนำเข้าข้อมูลสมาชิก"
          aria-describedby={fileStatusId}
          className={`mt-1 block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-200 ${portalFocusRing}`}
        />
      </label>
      {!file ? (
        <p id={fileStatusId} className="mt-2 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          ยังไม่ได้เลือกไฟล์นำเข้า
        </p>
      ) : (
        <p id={fileStatusId} className="mt-2 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          เลือกไฟล์แล้ว: {file.name}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="เครื่องมือนำเข้าและจัดการข้อมูลสมาชิก">
        <button
          type="button"
          disabled={loading}
          onClick={upload}
          aria-label="อัปโหลดไฟล์และนำเข้าข้อมูลสมาชิก"
          className={`rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-500 disabled:opacity-50 ${portalFocusRing}`}
        >
          อัปโหลดนำเข้า
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={summarizeImport}
          aria-label="ตรวจสอบสรุปผลหลังนำเข้าข้อมูล"
          className={`rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
        >
          ตรวจสอบหลังนำเข้า
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={wipeAll}
          aria-label="ลบข้อมูลสมาชิกทั้งหมดในระบบ"
          className={`rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70 disabled:opacity-50 ${portalFocusRing}`}
        >
          ลบสมาชิกทั้งหมด
        </button>
      </div>
      {msg && (
        <pre
          className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300"
          role={isErrorMsg ? 'alert' : 'status'}
          aria-live={isErrorMsg ? undefined : 'polite'}
          aria-atomic="true"
        >
          {msg}
        </pre>
      )}
      {loading ? (
        <p className="mt-3 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          กำลังประมวลผลคำสั่งนำเข้าหรือสรุปผล...
        </p>
      ) : null}
    </section>
  )
}
