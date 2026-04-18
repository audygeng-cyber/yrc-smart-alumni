import { useCallback, useEffect, useState } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY, adminJsonHeaders, normalizeApiBase } from '../lib/adminApi'
import { portalFocusRing } from '../portal/portalLabels'

type Activity = {
  id: string
  title: string
  category: string
  description: string | null
  active: boolean
  fund_scope?: string
  target_amount?: number | string | null
  created_at?: string
  updated_at?: string
}

type Props = { apiBase: string }

export function AdminSchoolActivitiesPanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])

  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newFundScope, setNewFundScope] = useState<'yupparaj_school' | 'association' | 'cram_school'>('association')
  const [newTargetAmount, setNewTargetAmount] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFundScope, setEditFundScope] = useState<'yupparaj_school' | 'association' | 'cram_school'>('association')
  const [editTargetAmount, setEditTargetAmount] = useState('')

  const [yupSummaryJson, setYupSummaryJson] = useState<string | null>(null)
  const isErrorMsg = msg !== null && (msg.includes('ไม่สำเร็จ') || msg.includes('HTTP'))

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(ADMIN_UPLOAD_STORAGE_KEY) ?? '')
  }, [])

  useEffect(() => {
    sessionStorage.setItem(ADMIN_UPLOAD_STORAGE_KEY, adminKey)
  }, [adminKey])

  const headers = useCallback(() => adminJsonHeaders(adminKey), [adminKey])

  const loadYupparajSummary = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/school-activities/donations/summary`, { headers: headers() })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setYupSummaryJson(JSON.stringify(j, null, 2))
      setMsg('โหลดสรุปยอดบริจาคกองโรงเรียนยุพราชแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [adminKey, base, headers])

  async function downloadYupparajCsv() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/school-activities/donations/yupparaj-export.csv`, { headers: headers() })
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string }
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'yupparaj-school-donations.csv'
      a.click()
      URL.revokeObjectURL(url)
      setMsg('ดาวน์โหลด CSV แล้ว')
    } catch {
      setMsg('ดาวน์โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const loadActivities = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/school-activities`, { headers: headers() })
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; activities?: Activity[]; error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setActivities(j.activities ?? [])
      setMsg(`โหลด ${(j.activities ?? []).length} รายการ`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [adminKey, base, headers])

  async function addActivity() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    if (!newTitle.trim() || !newCategory.trim()) {
      setMsg('กรอกชื่อคอร์สและหมวด')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        category: newCategory.trim(),
        fund_scope: newFundScope,
      }
      if (newDescription.trim()) body.description = newDescription.trim()
      if (newTargetAmount.trim()) {
        const t = Number(newTargetAmount)
        if (Number.isFinite(t) && t >= 0) body.target_amount = t
      }
      const r = await fetch(`${base}/api/admin/school-activities`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setNewTitle('')
      setNewCategory('')
      setNewDescription('')
      setNewTargetAmount('')
      await loadActivities()
      setMsg('เพิ่มรายการแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(a: Activity) {
    setEditingId(a.id)
    setEditTitle(a.title)
    setEditCategory(a.category)
    setEditDescription(a.description ?? '')
    const fs = a.fund_scope === 'yupparaj_school' || a.fund_scope === 'cram_school' ? a.fund_scope : 'association'
    setEditFundScope(fs)
    setEditTargetAmount(a.target_amount != null && a.target_amount !== '' ? String(a.target_amount) : '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!adminKey.trim()) return
    if (!editTitle.trim() || !editCategory.trim()) {
      setMsg('กรอกชื่อและหมวด')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const body: Record<string, unknown> = {
        title: editTitle.trim(),
        category: editCategory.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        fund_scope: editFundScope,
      }
      if (editTargetAmount.trim()) {
        const t = Number(editTargetAmount)
        body.target_amount = Number.isFinite(t) && t >= 0 ? t : null
      } else {
        body.target_amount = null
      }
      const r = await fetch(`${base}/api/admin/school-activities/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setEditingId(null)
      await loadActivities()
      setMsg('บันทึกแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(a: Activity) {
    if (!adminKey.trim()) return
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/school-activities/${a.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ active: !a.active }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      await loadActivities()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function deleteActivity(id: string) {
    if (!adminKey.trim()) return
    if (!window.confirm('ลบรายการนี้? (การบริจาคที่อ้างอิงจะถูกตัดความเชื่อม)')) return
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/school-activities/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      await loadActivities()
      setMsg('ลบแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-amber-900/40 bg-amber-950/10 p-6" aria-busy={loading}>
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-200">Admin — คอร์ส / กิจกรรม (ตาราง school_activities)</h2>
      <p className="mt-2 text-xs text-slate-500">
        รายการที่แสดงในพอร์ทัลโรงเรียนกวดวิชา (Academy) หน้าคอร์สเรียน — ใช้ Admin key เดียวกับการนำเข้าสมาชิก
      </p>
      <label className="mt-4 block text-sm text-slate-300">
        Admin key (x-admin-key)
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          aria-label="Admin key สำหรับจัดการคอร์สและกิจกรรม"
          className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-amber-600 ${portalFocusRing}`}
          placeholder="ค่า ADMIN_UPLOAD_KEY"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="เครื่องมือโหลดข้อมูลคอร์สและกิจกรรม">
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadActivities()}
          aria-label="โหลดรายการคอร์สและกิจกรรมทั้งหมด"
          className={`rounded-lg bg-amber-800 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50 ${portalFocusRing}`}
        >
          โหลดรายการ
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadYupparajSummary()}
          className={`rounded-lg border border-amber-700 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950/50 disabled:opacity-50 ${portalFocusRing}`}
        >
          สรุปยอดบริจาคยุพราช (JSON)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void downloadYupparajCsv()}
          className={`rounded-lg border border-emerald-800 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-950/40 disabled:opacity-50 ${portalFocusRing}`}
        >
          ดาวน์โหลด CSV บริจาคยุพราช
        </button>
      </div>

      {yupSummaryJson ? (
        <pre
          className="mt-4 max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-400"
          aria-label="สรุปยอดบริจาคกองโรงเรียนยุพราช"
        >
          {yupSummaryJson}
        </pre>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4" role="group" aria-label="ฟอร์มเพิ่มคอร์สหรือกิจกรรมใหม่">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">เพิ่มคอร์ส/กิจกรรม</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            aria-label="หมวดของคอร์สหรือกิจกรรมใหม่"
            placeholder="หมวด (เช่น วิชาหลัก)"
            className={`rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            aria-label="ชื่อคอร์สหรือกิจกรรมใหม่"
            placeholder="ชื่อคอร์ส / กิจกรรม"
            className={`rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
          />
        </div>
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          aria-label="รายละเอียดคอร์สหรือกิจกรรมใหม่"
          placeholder="รายละเอียด (ถ้ามี)"
          rows={2}
          className={`mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200 ${portalFocusRing}`}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="text-xs text-slate-400">
            กองเงิน
            <select
              value={newFundScope}
              onChange={(e) => setNewFundScope(e.target.value as typeof newFundScope)}
              className={`ml-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200 ${portalFocusRing}`}
            >
              <option value="yupparaj_school">โรงเรียนยุพราช (แยกจากสมาคม/กวดวิชา)</option>
              <option value="association">สมาคมศิษย์เก่า</option>
              <option value="cram_school">โรงเรียนกวดวิชา</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            เป้ายอด (บาท, ถ้ามี)
            <input
              value={newTargetAmount}
              onChange={(e) => setNewTargetAmount(e.target.value)}
              type="number"
              min={0}
              className={`ml-1 w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void addActivity()}
          aria-label="เพิ่มคอร์สหรือกิจกรรมใหม่"
          className={`mt-2 rounded bg-emerald-800 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 ${portalFocusRing}`}
        >
          เพิ่ม
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50" role="group" aria-label="ตารางจัดการคอร์สและกิจกรรม">
        <table className="w-full min-w-[720px] text-left text-sm" aria-label="ตารางคอร์สและกิจกรรมโรงเรียนกวดวิชา">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
              <th scope="col" className="px-3 py-2">หมวด</th>
              <th scope="col" className="px-3 py-2">ชื่อ</th>
              <th scope="col" className="px-3 py-2">กอง</th>
              <th scope="col" className="px-3 py-2">เป้า</th>
              <th scope="col" className="px-3 py-2">รายละเอียด</th>
              <th scope="col" className="px-3 py-2">สถานะ</th>
              <th scope="col" className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500" role="status" aria-live="polite" aria-atomic="true">
                  ยังไม่มีข้อมูล — กดโหลดรายการ
                </td>
              </tr>
            ) : (
              activities.map((a) =>
                editingId === a.id ? (
                  <tr key={a.id} className="border-b border-slate-800/80 bg-slate-900/40">
                    <td className="px-3 py-2 align-top" colSpan={5}>
                      <div id={`school-activity-edit-${a.id}`} role="region" aria-label={`ฟอร์มแก้ไขกิจกรรม ${a.title}`}>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className={`flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                            aria-label="หมวด"
                          />
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={`flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                            aria-label="ชื่อ"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={editFundScope}
                            onChange={(e) => setEditFundScope(e.target.value as typeof editFundScope)}
                            className={`rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                            aria-label="กองเงิน"
                          >
                            <option value="yupparaj_school">ยุพราช</option>
                            <option value="association">สมาคม</option>
                            <option value="cram_school">กวดวิชา</option>
                          </select>
                          <input
                            value={editTargetAmount}
                            onChange={(e) => setEditTargetAmount(e.target.value)}
                            type="number"
                            min={0}
                            placeholder="เป้ายอด"
                            className={`w-32 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                            aria-label="เป้ายอดบาท"
                          />
                        </div>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className={`mt-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                          aria-label="รายละเอียด"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-slate-500">—</td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2" role="group" aria-label="คำสั่งบันทึกหรือยกเลิกการแก้ไขกิจกรรม">
                        <button
                          type="button"
                          className={`rounded-sm text-xs text-emerald-400 hover:underline ${portalFocusRing}`}
                          onClick={() => void saveEdit(a.id)}
                          aria-label={`บันทึกการแก้ไขกิจกรรม ${a.title}`}
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          className={`rounded-sm text-xs text-slate-400 hover:underline ${portalFocusRing}`}
                          onClick={cancelEdit}
                          aria-label="ยกเลิกการแก้ไขกิจกรรม"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={a.id} className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-400">{a.category}</td>
                    <td className="px-3 py-2 font-medium text-slate-100">{a.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {a.fund_scope === 'yupparaj_school'
                        ? 'ยุพราช'
                        : a.fund_scope === 'cram_school'
                          ? 'กวดวิชา'
                          : 'สมาคม'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {a.target_amount != null && a.target_amount !== '' ? String(a.target_amount) : '—'}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-500" title={a.description ?? undefined}>
                      {a.description ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void toggleActive(a)}
                        aria-pressed={a.active}
                        aria-label={`สลับสถานะการใช้งานกิจกรรม ${a.title}`}
                        className={`rounded-sm text-xs underline ${portalFocusRing} ${a.active ? 'text-emerald-400' : 'text-slate-500'}`}
                      >
                        {a.active ? 'เปิด' : 'ปิด'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-3" role="group" aria-label="คำสั่งแก้ไขหรือลบกิจกรรม">
                        <button
                          type="button"
                          className={`rounded-sm text-xs text-amber-300 hover:underline ${portalFocusRing}`}
                          onClick={() => startEdit(a)}
                          aria-expanded={false}
                          aria-controls={`school-activity-edit-${a.id}`}
                          aria-label={`แก้ไขกิจกรรม ${a.title}`}
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className={`rounded-sm text-xs text-red-400 hover:underline ${portalFocusRing}`}
                          onClick={() => void deleteActivity(a.id)}
                          aria-label={`ลบกิจกรรม ${a.title}`}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {msg ? (
        <pre
          className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400"
          role={isErrorMsg ? 'alert' : 'status'}
          aria-live={isErrorMsg ? undefined : 'polite'}
          aria-atomic="true"
        >
          {msg}
        </pre>
      ) : null}
      {loading ? (
        <p className="mt-2 text-xs text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          กำลังโหลดรายการคอร์สและกิจกรรม...
        </p>
      ) : null}
    </section>
  )
}
