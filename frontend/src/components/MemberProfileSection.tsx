import { useEffect, useState } from 'react'
import { HEADER_TO_MEMBER_KEY, MEMBER_SELF_EDIT_HEADERS } from '../memberImportMap'

type MemberRow = Record<string, unknown>

type Props = {
  apiBase: string
  lineUid: string
  member: MemberRow
  onMemberUpdated: (m: MemberRow) => void
}

export function MemberProfileSection({ apiBase, lineUid, member, onMemberUpdated }: Props) {
  const [selfEdit, setSelfEdit] = useState<Record<string, string>>(() => fillFromMember(member))
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSelfEdit(fillFromMember(member))
  }, [member])

  async function submitSelfUpdate() {
    setLoading(true)
    setMsg(null)
    try {
      const updates: Record<string, string> = {}
      for (const [h, v] of Object.entries(selfEdit)) {
        if (v.trim() !== '') updates[h] = v.trim()
      }
      const r = await fetch(`${apiBase}/api/members/update-self`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_uid: lineUid.trim(),
          updates,
        }),
      })
      const j = (await r.json().catch(() => ({}))) as { member?: MemberRow; error?: string }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setMsg('บันทึกแล้ว')
      if (j.member) {
        onMemberUpdated(j.member)
        setSelfEdit(fillFromMember(j.member))
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-slate-500">
        รุ่น · ชื่อ · นามสกุล แก้ได้เฉพาะผ่านผู้ดูแล — ช่องด้านล่างสำหรับข้อมูลอื่นตามหัวตารางนำเข้า
      </p>
      <div className="mt-4 grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {MEMBER_SELF_EDIT_HEADERS.map((h) => (
          <label key={h} className="block text-sm text-slate-300">
            {h}
            <input
              value={selfEdit[h] ?? ''}
              onChange={(e) => setSelfEdit((prev) => ({ ...prev, [h]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-emerald-700"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={loading || !lineUid.trim()}
        onClick={submitSelfUpdate}
        className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        บันทึกข้อมูล
      </button>
      {msg && <p className="mt-3 text-sm text-emerald-300/90">{msg}</p>}
    </div>
  )
}

function fillFromMember(m: MemberRow): Record<string, string> {
  const next: Record<string, string> = {}
  for (const h of MEMBER_SELF_EDIT_HEADERS) {
    const k = HEADER_TO_MEMBER_KEY[h]
    if (!k) continue
    const v = m[k]
    next[h] = v == null || v === '' ? '' : String(v)
  }
  return next
}
