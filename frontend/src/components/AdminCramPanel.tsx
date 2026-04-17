import { useCallback, useEffect, useState } from 'react'
import { ADMIN_UPLOAD_STORAGE_KEY, adminJsonHeaders, normalizeApiBase } from '../lib/adminApi'
import { portalFocusRing } from '../portal/portalLabels'

type Classroom = {
  id: string
  room_code: string
  display_name: string
  sort_order: number
  active: boolean
  created_at?: string
}

type Student = {
  id: string
  classroom_id: string
  display_name: string
  current_avg_score: number | null
  app_user_id: string | null
  created_at?: string
}

type Props = { apiBase: string }

export function AdminCramPanel({ apiBase }: Props) {
  const base = normalizeApiBase(apiBase)
  const [adminKey, setAdminKey] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')

  const [newRoomCode, setNewRoomCode] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomSort, setNewRoomSort] = useState(0)

  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentScore, setNewStudentScore] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editScore, setEditScore] = useState('')

  useEffect(() => {
    setAdminKey(sessionStorage.getItem(ADMIN_UPLOAD_STORAGE_KEY) ?? '')
  }, [])

  useEffect(() => {
    sessionStorage.setItem(ADMIN_UPLOAD_STORAGE_KEY, adminKey)
  }, [adminKey])

  const headers = useCallback(() => adminJsonHeaders(adminKey), [adminKey])

  const loadClassrooms = useCallback(async () => {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/cram/classrooms`, { headers: headers() })
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; classrooms?: Classroom[]; error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setClassrooms(j.classrooms ?? [])
      setMsg(`โหลดห้องเรียน ${(j.classrooms ?? []).length} รายการ`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [adminKey, base, headers])

  const loadStudents = useCallback(
    async (classroomId: string) => {
      if (!adminKey.trim() || !classroomId) {
        setStudents([])
        return
      }
      setLoading(true)
      setMsg(null)
      try {
        const q = new URLSearchParams({ classroom_id: classroomId })
        const r = await fetch(`${base}/api/admin/cram/students?${q}`, { headers: headers() })
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; students?: Student[]; error?: string }
        if (!r.ok) {
          setMsg(j.error ?? `HTTP ${r.status}`)
          return
        }
        setStudents(j.students ?? [])
        setMsg(`โหลดนักเรียน ${(j.students ?? []).length} คน`)
      } catch {
        setMsg('เรียก API ไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    },
    [adminKey, base, headers],
  )

  useEffect(() => {
    if (selectedClassroomId) {
      void loadStudents(selectedClassroomId)
    } else {
      setStudents([])
    }
  }, [selectedClassroomId, loadStudents])

  async function addClassroom() {
    if (!adminKey.trim()) {
      setMsg('ใส่ Admin key ก่อน')
      return
    }
    if (!newRoomCode.trim() || !newRoomName.trim()) {
      setMsg('กรอกรหัสห้องและชื่อห้อง')
      return
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/cram/classrooms`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          room_code: newRoomCode.trim(),
          display_name: newRoomName.trim(),
          sort_order: newRoomSort,
        }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setNewRoomCode('')
      setNewRoomName('')
      setNewRoomSort(0)
      await loadClassrooms()
      setMsg('เพิ่มห้องเรียนแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function toggleClassroomActive(c: Classroom) {
    if (!adminKey.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`${base}/api/admin/cram/classrooms/${c.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ active: !c.active }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      await loadClassrooms()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function addStudent() {
    if (!adminKey.trim() || !selectedClassroomId) {
      setMsg('เลือกห้องและใส่ Admin key ก่อน')
      return
    }
    if (!newStudentName.trim()) {
      setMsg('กรอกชื่อนักเรียน')
      return
    }
    let score: number | undefined
    if (newStudentScore.trim()) {
      const n = parseFloat(newStudentScore)
      if (!Number.isFinite(n)) {
        setMsg('คะแนนเฉลี่ยต้องเป็นตัวเลข')
        return
      }
      score = n
    }
    setLoading(true)
    setMsg(null)
    try {
      const body: Record<string, unknown> = {
        classroom_id: selectedClassroomId,
        display_name: newStudentName.trim(),
      }
      if (score !== undefined) body.current_avg_score = score
      const r = await fetch(`${base}/api/admin/cram/students`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      setNewStudentName('')
      setNewStudentScore('')
      await loadStudents(selectedClassroomId)
      setMsg('เพิ่มนักเรียนแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  function startEditStudent(s: Student) {
    setEditingId(s.id)
    setEditName(s.display_name)
    setEditScore(s.current_avg_score != null ? String(s.current_avg_score) : '')
  }

  function cancelEditStudent() {
    setEditingId(null)
  }

  async function saveStudentEdit(id: string) {
    if (!adminKey.trim()) return
    if (!editName.trim()) {
      setMsg('กรอกชื่อนักเรียน')
      return
    }
    const body: Record<string, unknown> = { display_name: editName.trim() }
    if (editScore.trim() === '') {
      body.current_avg_score = null
    } else {
      const n = parseFloat(editScore)
      if (!Number.isFinite(n)) {
        setMsg('คะแนนเฉลี่ยต้องเป็นตัวเลขหรือเว้นว่าง')
        return
      }
      body.current_avg_score = n
    }
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetch(`${base}/api/admin/cram/students/${id}`, {
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
      if (selectedClassroomId) await loadStudents(selectedClassroomId)
      setMsg('บันทึกการแก้ไขแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function deleteStudent(id: string) {
    if (!adminKey.trim()) return
    if (!window.confirm('ลบนักเรียนรายนี้?')) return
    setLoading(true)
    try {
      const r = await fetch(`${base}/api/admin/cram/students/${id}`, {
        method: 'DELETE',
        headers: headers(),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) {
        setMsg(j.error ?? `HTTP ${r.status}`)
        return
      }
      if (selectedClassroomId) await loadStudents(selectedClassroomId)
      setMsg('ลบแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-violet-900/40 bg-violet-950/15 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-violet-200">Admin — โรงเรียนกวดวิชา (ห้องเรียน / นักเรียน)</h2>
      <p className="mt-2 text-xs text-slate-500">
        ต้องรันไมเกรชัน (migration) สำหรับ <code className="text-slate-400">cram_classrooms</code> /{' '}
        <code className="text-slate-400">cram_students</code> บน Supabase ก่อน — ใช้ Admin key เดียวกับการนำเข้าสมาชิก
      </p>
      <label className="mt-4 block text-sm text-slate-300">
        Admin key (x-admin-key)
        <input
          type="password"
          autoComplete="off"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-violet-600 ${portalFocusRing}`}
          placeholder="ค่า ADMIN_UPLOAD_KEY"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadClassrooms()}
          className={`rounded-lg bg-violet-800 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50 ${portalFocusRing}`}
        >
          โหลดห้องเรียน
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">เพิ่มห้อง</h3>
          <div className="mt-2 space-y-2">
            <input
              value={newRoomCode}
              onChange={(e) => setNewRoomCode(e.target.value)}
              placeholder="รหัสห้อง (เช่น M4-A)"
              className={`w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
            />
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="ชื่อแสดง (เช่น ม.4 ห้อง A)"
              className={`w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
            />
            <label className="flex items-center gap-2 text-xs text-slate-400">
              ลำดับ
              <input
                type="number"
                value={newRoomSort}
                onChange={(e) => setNewRoomSort(parseInt(e.target.value, 10) || 0)}
                className={`w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200 ${portalFocusRing}`}
              />
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={() => void addClassroom()}
              className={`rounded bg-emerald-800 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 ${portalFocusRing}`}
            >
              เพิ่มห้อง
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายการห้อง</h3>
          <div className="mt-2 max-h-48 overflow-auto text-sm">
            {classrooms.length === 0 ? (
              <p className="text-slate-500">ยังไม่มีข้อมูล — กดโหลดห้องเรียน</p>
            ) : (
              <ul className="space-y-1">
                {classrooms.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 px-2 py-1">
                    <span className="text-slate-200">
                      {c.display_name}{' '}
                      <span className="text-slate-500">({c.room_code})</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={c.active ? 'text-emerald-400' : 'text-slate-500'}>{c.active ? 'เปิดใช้งาน' : 'ปิด'}</span>
                      <button
                        type="button"
                        className={`rounded-sm text-xs text-violet-300 hover:underline ${portalFocusRing}`}
                        onClick={() => void toggleClassroomActive(c)}
                      >
                        สลับ
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">นักเรียนตามห้อง</h3>
        <label className="mt-2 block text-sm text-slate-400">
          เลือกห้อง
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className={`mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 ${portalFocusRing}`}
          >
            <option value="">— โปรดเลือก —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name} ({c.room_code})
              </option>
            ))}
          </select>
        </label>
        {selectedClassroomId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="ชื่อนักเรียน"
              className={`min-w-[140px] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
            />
            <input
              value={newStudentScore}
              onChange={(e) => setNewStudentScore(e.target.value)}
              placeholder="คะแนนเฉลี่ย (ถ้ามี)"
              className={`w-36 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm ${portalFocusRing}`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void addStudent()}
              className={`rounded bg-violet-800 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-50 ${portalFocusRing}`}
            >
              เพิ่มนักเรียน
            </button>
          </div>
        ) : null}

        {selectedClassroomId && students.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-1 pr-2">ชื่อ</th>
                  <th className="py-1 pr-2">คะแนนเฉลี่ย</th>
                  <th className="py-1"> </th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) =>
                  editingId === s.id ? (
                    <tr key={s.id} className="border-b border-slate-800/80">
                      <td className="py-1 pr-2" colSpan={2}>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={`min-w-[120px] flex-1 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-100 ${portalFocusRing}`}
                            aria-label="ชื่อนักเรียน"
                          />
                          <input
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            placeholder="คะแนน"
                            className={`w-24 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm ${portalFocusRing}`}
                            aria-label="คะแนนเฉลี่ย"
                          />
                        </div>
                      </td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`rounded-sm text-xs text-emerald-400 hover:underline ${portalFocusRing}`}
                            onClick={() => void saveStudentEdit(s.id)}
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            className={`rounded-sm text-xs text-slate-400 hover:underline ${portalFocusRing}`}
                            onClick={cancelEditStudent}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id} className="border-b border-slate-800/80">
                      <td className="py-1 pr-2 text-slate-200">{s.display_name}</td>
                      <td className="py-1 pr-2 text-slate-400">{s.current_avg_score ?? '—'}</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className={`rounded-sm text-xs text-violet-300 hover:underline ${portalFocusRing}`}
                            onClick={() => startEditStudent(s)}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className={`rounded-sm text-xs text-red-400 hover:underline ${portalFocusRing}`}
                            onClick={() => void deleteStudent(s.id)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {msg ? (
        <pre
          className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400"
          role="status"
          aria-live="polite"
        >
          {msg}
        </pre>
      ) : null}
      {loading ? <p className="mt-2 text-xs text-slate-500">กำลังโหลด…</p> : null}
    </section>
  )
}
