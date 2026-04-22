import { useEffect, useRef, useState } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY, normalizeApiBase } from '../lib/adminApi'
import { formatFetchError, readApiJson } from '../lib/adminHttp'
import { themeAccent } from '../lib/themeTokens'
import { portalFocusRing } from '../portal/portalLabels'

const BATCH_ID_KEY = 'yrc_last_import_batch_id'

const IMPORT_FETCH_ERROR_OPTS = { maxRawLength: 800, include404ImportHint: true } as const

type DirectoryViewMode = 'person' | 'batch' | 'batch_presidents' | 'outstanding' | 'committee'

type DistinctionRow = { id: string; member_id: string; code: string; mark_key: string; label_th: string | null }

type DirectoryRow = {
  id: string
  batch: string | null
  batch_name: string | null
  first_name: string | null
  last_name: string | null
  title: string | null
  nickname: string | null
  membership_status: string | null
  line_uid: string | null
  phone: string | null
  email: string | null
  member_code: string | null
  student_id: string | null
  batch_president: boolean
  outstanding_alumni: boolean
  distinction_summary: string
  distinctions: DistinctionRow[]
  committee_role: boolean
}

type Props = { apiBase: string }

export function AdminImportPanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lastImportBatchId, setLastImportBatchId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [roleMemberId, setRoleMemberId] = useState('')
  const [committeeRole, setCommitteeRole] = useState(false)
  const [paymentApproverRole, setPaymentApproverRole] = useState(false)
  const [roleMsg, setRoleMsg] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)
  const [dirView, setDirView] = useState<DirectoryViewMode>('person')
  const [dirQ, setDirQ] = useState('')
  const [dirBatch, setDirBatch] = useState('')
  const [dirLoading, setDirLoading] = useState(false)
  const [dirError, setDirError] = useState<string | null>(null)
  const [dirRows, setDirRows] = useState<DirectoryRow[]>([])
  const [dirCount, setDirCount] = useState<number | null>(null)
  const [flagMemberId, setFlagMemberId] = useState('')
  const [flagBatchPresident, setFlagBatchPresident] = useState(false)
  const [flagOutstanding, setFlagOutstanding] = useState(false)
  const [flagLoading, setFlagLoading] = useState(false)
  const [flagMsg, setFlagMsg] = useState<string | null>(null)
  const [syncDryRun, setSyncDryRun] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const fileStatusId = 'admin-import-file-status'
  const directorySectionRef = useRef<HTMLDivElement | null>(null)
  const isErrorMsg = msg !== null && (msg.includes('ไม่สำเร็จ') || msg.includes('HTTP'))

  useEffect(() => {
    if (window.location.hash === '#admin-member-directory' && directorySectionRef.current) {
      directorySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

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

  async function saveMemberAppRoles() {
    if (!adminKey.trim()) {
      setRoleMsg('ใส่ Admin key ก่อน')
      return
    }
    const mid = roleMemberId.trim()
    if (!mid) {
      setRoleMsg('กรอก UUID สมาชิก (members.id)')
      return
    }
    setRoleLoading(true)
    setRoleMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/members/app-roles/${encodeURIComponent(mid)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({
          committee: committeeRole,
          payment_approver: paymentApproverRole,
        }),
      })
      const text = await r.text()
      let payload: unknown = null
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        payload = text
      }
      if (!r.ok) {
        setRoleMsg(formatFetchError('บันทึกบทบาท', r.status, payload, text))
        return
      }
      setRoleMsg(typeof text === 'string' ? text : JSON.stringify(payload, null, 2))
    } catch {
      setRoleMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setRoleLoading(false)
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

  async function loadDirectory() {
    if (!adminKey.trim()) {
      setDirError('ใส่ Admin key ก่อน')
      return
    }
    setDirLoading(true)
    setDirError(null)
    setDirRows([])
    setDirCount(null)
    try {
      const q = new URLSearchParams()
      q.set('view', dirView)
      if (dirView === 'person' && dirQ.trim()) q.set('q', dirQ.trim())
      if ((dirView === 'batch' || dirView === 'batch_presidents') && dirBatch.trim()) q.set('batch', dirBatch.trim())
      const url = `${base}/api/admin/members/directory?${q.toString()}`
      const r = await fetch(url, { headers: { 'x-admin-key': adminKey.trim() } })
      const { payload, rawText, ok } = await readApiJson(r)
      if (!ok) {
        setDirError(formatFetchError('ค้นหาทะเบียน', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
        return
      }
      const body = payload as { members?: unknown; count?: unknown }
      const members = Array.isArray(body.members)
        ? (body.members as DirectoryRow[]).map((m) => ({
            ...m,
            distinction_summary: typeof m.distinction_summary === 'string' ? m.distinction_summary : '—',
            distinctions: Array.isArray(m.distinctions) ? m.distinctions : [],
            batch_president: Boolean(m.batch_president),
            outstanding_alumni: Boolean(m.outstanding_alumni),
            committee_role: Boolean(m.committee_role),
          }))
        : []
      setDirRows(members)
      setDirCount(typeof body.count === 'number' ? body.count : members.length)
    } catch {
      setDirError('เรียก API ไม่สำเร็จ')
    } finally {
      setDirLoading(false)
    }
  }

  async function saveDirectoryFlags() {
    if (!adminKey.trim()) {
      setFlagMsg('ใส่ Admin key ก่อน')
      return
    }
    const mid = flagMemberId.trim()
    if (!mid) {
      setFlagMsg('กรอก UUID สมาชิก (members.id)')
      return
    }
    setFlagLoading(true)
    setFlagMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/members/${encodeURIComponent(mid)}/directory-flags`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({
          batch_president: flagBatchPresident,
          outstanding_alumni: flagOutstanding,
        }),
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (!ok) {
        setFlagMsg(formatFetchError('บันทึกแฟล็กทะเบียน', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
        return
      }
      setFlagMsg(JSON.stringify(payload, null, 2))
    } catch {
      setFlagMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setFlagLoading(false)
    }
  }

  async function syncRegistryPresidents() {
    if (!adminKey.trim()) {
      setSyncMsg('ใส่ Admin key ก่อน')
      return
    }
    setSyncLoading(true)
    setSyncMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/members/sync-registry-presidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim(),
        },
        body: JSON.stringify({ dryRun: syncDryRun }),
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (!ok) {
        setSyncMsg(formatFetchError('ซิงก์ประธานรุ่นจาก ENV', r.status, payload, rawText, IMPORT_FETCH_ERROR_OPTS))
        return
      }
      setSyncMsg(JSON.stringify(payload, null, 2))
    } catch {
      setSyncMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setSyncLoading(false)
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
      <p className="mt-2 text-xs text-slate-400">
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
            className={`inline-flex rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-fuchsia-300 hover:bg-slate-700 ${portalFocusRing}`}
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

      <div
        ref={directorySectionRef}
        id="admin-member-directory"
        className="mt-6 scroll-mt-4 rounded-lg border border-slate-700 bg-slate-950/40 p-4"
        role="region"
        aria-label="ค้นหาและรายชื่อทะเบียนสมาชิก"
      >
        <h3 className="text-sm font-medium text-slate-200">ค้นหาและรายชื่อทะเบียน</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          รายชื่อกรรมการมาจากบทบาท <code className="text-slate-400">committee</code> ในระบบ (หลังผูก LINE และซิงก์แอป) — ประธานรุ่น/ศิษย์เก่าดีเด่นตั้งได้จากคอลัมน์ในเทมเพลตนำเข้า หรือแก้ด้านล่าง
        </p>
        <div
          className="mt-3 rounded-md border border-slate-800/80 bg-slate-950/60 p-3 text-xs text-slate-400"
          role="group"
          aria-label="ซิงก์ประธานรุ่นกับ PRESIDENT_KEYS_JSON"
        >
          <p className="font-medium text-slate-300">ซิงก์ประธานรุ่นกับ backend/.env</p>
          <p className="mt-1 leading-relaxed">
            ตั้ง <code className="text-slate-500">PRESIDENT_KEYS_JSON</code> แบบมี{' '}
            <code className="text-slate-500">member_id</code> เช่น{' '}
            <code className="break-all text-[10px] text-slate-500">
              {`{"2520":{"key":"รหัสลับ","member_id":"uuid-members.id"}}`}
            </code>
            — รีสตาร์ท API หลังแก้ env แล้วกดปุ่มด้านล่าง (ลอง dry run ก่อน)
          </p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-slate-300">
            <input type="checkbox" checked={syncDryRun} onChange={(e) => setSyncDryRun(e.target.checked)} />
            dry run (ไม่เขียน DB — แค่ตรวจและสรุป)
          </label>
          <button
            type="button"
            disabled={syncLoading}
            onClick={() => void syncRegistryPresidents()}
            className={`mt-2 rounded-lg bg-fuchsia-900/50 px-3 py-2 text-xs font-medium text-fuchsia-100 hover:bg-fuchsia-900/70 disabled:opacity-50 ${portalFocusRing}`}
            aria-label="ซิงก์ batch president จาก PRESIDENT_KEYS_JSON"
          >
            {syncLoading ? 'กำลังซิงก์…' : 'ซิงก์ประธานรุ่นจาก PRESIDENT_KEYS_JSON'}
          </button>
          {syncMsg ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-left text-[10px] text-slate-400" role="status">
              {syncMsg}
            </pre>
          ) : null}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[12rem] flex-1 text-xs text-slate-400">
            มุมมอง
            <select
              value={dirView}
              onChange={(e) => setDirView(e.target.value as DirectoryViewMode)}
              className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-100 ${portalFocusRing}`}
              aria-label="เลือกมุมมองการค้นหาทะเบียน"
            >
              <option value="person">รายคน (ค้นข้อความในชื่อ รุ่น เบอร์ อีเมล ฯลฯ)</option>
              <option value="batch">รายชื่อทั้งรุ่น</option>
              <option value="batch_presidents">รายชื่อประธานรุ่น</option>
              <option value="outstanding">รายชื่อศิษย์เก่าดีเด่น</option>
              <option value="committee">รายชื่อกรรมการ</option>
            </select>
          </label>
          {dirView === 'person' ? (
            <label className="block min-w-[10rem] flex-1 text-xs text-slate-400">
              คำค้น (q)
              <input
                value={dirQ}
                onChange={(e) => setDirQ(e.target.value)}
                placeholder="ชื่อ นามสกุล รุ่น เบอร์ อีเมล …"
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                aria-label="ข้อความค้นหาสมาชิกรายคน"
              />
            </label>
          ) : null}
          {(dirView === 'batch' || dirView === 'batch_presidents') ? (
            <label className="block min-w-[8rem] flex-1 text-xs text-slate-400">
              รุ่น {dirView === 'batch_presidents' ? '(ไม่บังคับ — เว้นว่างเพื่อดูทุกรุ่น)' : '(บังคับ)'}
              <input
                value={dirBatch}
                onChange={(e) => setDirBatch(e.target.value)}
                placeholder="เช่น 2520"
                className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
                aria-label="รุ่นสำหรับกรองรายชื่อ"
              />
            </label>
          ) : null}
          <button
            type="button"
            disabled={dirLoading}
            onClick={() => void loadDirectory()}
            className={`rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
            aria-label="โหลดรายชื่อตามมุมมองที่เลือก"
          >
            {dirLoading ? 'กำลังโหลด…' : 'โหลดรายชื่อ'}
          </button>
        </div>
        {dirError ? (
          <p className="mt-2 text-xs text-red-300" role="alert">
            {dirError}
          </p>
        ) : null}
        {dirCount !== null && !dirError ? (
          <p className="mt-2 text-xs text-slate-500" role="status">
            พบ {dirCount.toLocaleString('th-TH')} รายการ (สูงสุด 500 แถวต่อคำขอ)
          </p>
        ) : null}
        {dirRows.length > 0 ? (
          <div className="mt-3 max-h-72 overflow-auto rounded border border-slate-800">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-900/95 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-800 px-2 py-2">รุ่น</th>
                  <th className="border-b border-slate-800 px-2 py-2">ชื่อ–สกุล</th>
                  <th className="border-b border-slate-800 px-2 py-2">สถานะ</th>
                  <th className="border-b border-slate-800 px-2 py-2">ป.รุ่น</th>
                  <th className="border-b border-slate-800 px-2 py-2">มิติ / เกียรติ</th>
                  <th className="border-b border-slate-800 px-2 py-2">กรรมการ</th>
                  <th className="border-b border-slate-800 px-2 py-2">UUID</th>
                </tr>
              </thead>
              <tbody>
                {dirRows.map((row) => {
                  const name = [row.title, row.first_name, row.nickname ? `(${row.nickname})` : '', row.last_name]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <tr key={row.id} className="odd:bg-slate-950/50">
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top">{row.batch ?? '—'}</td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top">{name.trim() || '—'}</td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top">{row.membership_status ?? '—'}</td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top">{row.batch_president ? 'ใช่' : '—'}</td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top text-[10px] leading-snug text-slate-400">
                        {row.distinction_summary}
                      </td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 align-top">{row.committee_role ? 'ใช่' : '—'}</td>
                      <td className="border-b border-slate-800/80 px-2 py-1.5 font-mono text-[10px] text-slate-500">{row.id}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="text-xs font-medium text-slate-400">
            แก้ไขมิติทะเบียน (ประธานรุ่น / ดีเด่นทั่วไป) ตาม UUID — รายละเอียดปีและโปรแกรมตั้งจากเทมเพลตนำเข้าหรือ API{' '}
            <code className="text-slate-500">distinctions</code>
          </p>
          <input
            value={flagMemberId}
            onChange={(e) => setFlagMemberId(e.target.value)}
            placeholder="members.id (UUID)"
            className={`mt-2 w-full max-w-xl rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
            aria-label="รหัสสมาชิกสำหรับแก้แฟล็กทะเบียน"
          />
          <div className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={flagBatchPresident} onChange={(e) => setFlagBatchPresident(e.target.checked)} />
              ประธานรุ่น (batch_president)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={flagOutstanding} onChange={(e) => setFlagOutstanding(e.target.checked)} />
              ศิษย์เก่าดีเด่น (ทั่วไป — ไม่ลบมิติปี/โปรแกรม)
            </label>
          </div>
          <button
            type="button"
            disabled={flagLoading}
            onClick={() => void saveDirectoryFlags()}
            className={`tap-target mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
          >
            {flagLoading ? 'กำลังบันทึก…' : 'บันทึกแฟล็กทะเบียน'}
          </button>
          {flagMsg ? (
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-950 p-2 text-left text-[10px] text-slate-400" role="status">
              {flagMsg}
            </pre>
          ) : null}
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
        <p id={fileStatusId} className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          ยังไม่ได้เลือกไฟล์นำเข้า
        </p>
      ) : (
        <p id={fileStatusId} className="mt-2 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
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
        <p className="mt-3 text-xs text-slate-400" role="status" aria-live="polite" aria-atomic="true">
          กำลังประมวลผลคำสั่งนำเข้าหรือสรุปผล...
        </p>
      ) : null}

      <div className="mt-10 border-t border-slate-800 pt-8">
        <h3 className="text-sm font-medium text-slate-200">บทบาทกรรมการและผู้อนุมัติจ่าย</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          กำหนดว่าสมาชิกคนใดเป็นกรรมการ (<code className="text-slate-400">committee</code>) และคนใดมีอำนาจอนุมัติคำขอจ่ายที่เกี่ยวกับมติประชุม (
          <code className="text-slate-400">payment_approver</code>) — สมาชิกต้องผูก LINE แล้ว และเคยเปิดแอปเพื่อให้มีแถว{' '}
          <code className="text-slate-400">app_users</code>
        </p>
        <input
          value={roleMemberId}
          onChange={(e) => setRoleMemberId(e.target.value)}
          placeholder="members.id (UUID)"
          className={`mt-3 w-full max-w-xl rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 ${portalFocusRing}`}
          aria-label="รหัสสมาชิกสำหรับกำหนดบทบาท"
        />
        <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={committeeRole} onChange={(e) => setCommitteeRole(e.target.checked)} />
            กรรมการ (committee)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={paymentApproverRole}
              onChange={(e) => setPaymentApproverRole(e.target.checked)}
            />
            ผู้อนุมัติคำขอจ่ายตามมติประชุม (payment_approver)
          </label>
        </div>
        <button
          type="button"
          disabled={roleLoading}
          onClick={() => void saveMemberAppRoles()}
          className={`tap-target mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
        >
          {roleLoading ? 'กำลังบันทึก…' : 'บันทึกบทบาท'}
        </button>
        {roleMsg ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-left text-xs text-slate-300" role="status">
            {roleMsg}
          </pre>
        ) : null}
      </div>
    </section>
  )
}
