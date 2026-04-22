import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HEADER_TO_MEMBER_KEY, MEMBER_SELF_EDIT_HEADERS } from '../memberImportMap'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing } from '../portal/portalLabels'

/** แบ่งฟิลด์เป็นบล็อกย่อย — ครบทุกหัวใน MEMBER_SELF_EDIT_HEADERS ครั้งเดียว */
const PROFILE_FIELD_GROUPS: ReadonlyArray<{ title: string; headers: readonly string[] }> = [
  {
    title: 'ข้อมูลทะเบียน',
    headers: [
      'รหัส',
      'เลขประจำตัว',
      'ชื่อรุ่น',
      'ปีรุ่น',
      'คำนำหน้านาม',
      'ชื่อเล่น',
      'วันเกิด',
      'วันสมัคร',
      'สมาชิกภาพ',
    ],
  },
  {
    title: 'ที่อยู่',
    headers: [
      'บ้านเลขที่',
      'ซอย',
      'หมู่',
      'หมู่บ้าน',
      'ถนน',
      'ตำบล',
      'อำเภอ',
      'จังหวัด',
      'รหัสไปรษณีย์',
    ],
  },
  {
    title: 'การติดต่อ',
    headers: ['เบอร์โทรศัพท์', 'อีเมล์', 'ID Line', 'รูปโปรไฟล์ (URL)'],
  },
]

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
  const [photoUploading, setPhotoUploading] = useState(false)
  const isErrorMsg = msg !== null && (msg.includes('HTTP') || msg.includes('ไม่สำเร็จ'))

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

  async function uploadProfilePhoto(file: File) {
    if (!lineUid.trim()) return
    if (file.size > 2 * 1024 * 1024) {
      setMsg('ไฟล์ใหญ่เกิน 2 MB')
      return
    }
    setPhotoUploading(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('line_uid', lineUid.trim())
      fd.append('photo', file)
      const base = apiBase.replace(/\/$/, '')
      const r = await fetch(`${base}/api/members/profile-photo`, {
        method: 'POST',
        body: fd,
      })
      const j = (await r.json().catch(() => ({}))) as { member?: MemberRow; error?: string }
      if (!r.ok) {
        setMsg(JSON.stringify(j, null, 2))
        return
      }
      setMsg('อัปโหลดรูปแล้ว')
      if (j.member) {
        onMemberUpdated(j.member)
        setSelfEdit(fillFromMember(j.member))
      }
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div className="min-w-0" aria-busy={loading || photoUploading}>
      <p className="text-xs text-slate-500">
        รุ่น · ชื่อ · นามสกุล แก้ได้เฉพาะผ่านผู้ดูแล — ช่องด้านล่างสำหรับข้อมูลอื่นตามหัวตารางนำเข้า
      </p>
      <div className="mt-4 max-h-[min(32rem,70dvh)] overflow-y-auto overscroll-y-contain rounded-lg border border-slate-800/70 bg-slate-950/25 px-3 py-3 pr-2 [scrollbar-width:thin] sm:px-4">
        <div className="space-y-5">
          {PROFILE_FIELD_GROUPS.map((group) => (
            <fieldset key={group.title} className="min-w-0 border-b border-slate-800/80 pb-5 last:border-b-0 last:pb-0">
              <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">{group.title}</legend>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.headers.map((h) => (
                  <label key={h} className="block text-sm text-slate-300">
                    {h}
                    <input
                      value={selfEdit[h] ?? ''}
                      onChange={(e) => setSelfEdit((prev) => ({ ...prev, [h]: e.target.value }))}
                      aria-label={`กรอกข้อมูล ${h}`}
                      disabled={loading || photoUploading}
                      className={`mt-1 w-full ${themeAccent.formInput} ${portalFocusRing} disabled:cursor-not-allowed disabled:opacity-60`}
                    />
                    {h === 'รูปโปรไฟล์ (URL)' ? (
                      <div className="mt-2 space-y-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          disabled={loading || photoUploading || !lineUid.trim()}
                          aria-label="เลือกไฟล์รูปเพื่ออัปโหลดไปที่เซิร์ฟเวอร์"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            e.target.value = ''
                            if (f) void uploadProfilePhoto(f)
                          }}
                          className={`mt-1 block w-full max-w-md text-xs text-slate-400 file:mr-2 file:rounded-md file:border-0 file:bg-fuchsia-900/45 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fuchsia-100 hover:file:bg-fuchsia-800/50 disabled:opacity-50 ${portalFocusRing}`}
                        />
                        <p className="text-xs text-slate-500">
                          หรืออัปโหลด JPG/PNG/WebP/GIF สูงสุด 2 MB — ระบบจะใส่ URL ให้อัตโนมัติ (เก็บใน Storage)
                        </p>
                      </div>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={loading || photoUploading || !lineUid.trim()}
        aria-busy={loading}
        onClick={submitSelfUpdate}
        aria-label="บันทึกข้อมูลสมาชิกที่แก้ไข"
        className={`${themeTapTarget} mt-4 rounded-lg ${themeAccent.buttonPrimaryStrong} px-4 py-2 text-sm font-medium disabled:opacity-50 ${portalFocusRing}`}
      >
        {loading ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
      </button>
      {msg ? (
        <div className="mt-3 space-y-2">
          <p
            className={`text-sm ${isErrorMsg ? 'text-rose-300/90' : 'text-emerald-300/90'}`}
            role={isErrorMsg ? 'alert' : 'status'}
            aria-live={isErrorMsg ? undefined : 'polite'}
            aria-atomic="true"
          >
            {msg}
          </p>
          {!isErrorMsg && (msg === 'บันทึกแล้ว' || msg === 'อัปโหลดรูปแล้ว') ? (
            <p className="text-sm text-slate-400">
              ดูรายการ snapshot ย้อนหลังได้ที่{' '}
              <Link
                to="/member/last-update"
                className={`${themeAccent.link} ${portalFocusRing} rounded-sm`}
              >
                ข้อมูลอัปเดตล่าสุด
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
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
