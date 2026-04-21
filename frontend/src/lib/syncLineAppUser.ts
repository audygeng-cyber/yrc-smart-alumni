import { readLineEntrySource, type LineEntrySource } from './lineEntrySource'
import { normalizeApiBase } from './adminApi'
import { summarizeAppRolesTrace } from './lineMemberApiTrace'

/**
 * ซิงก์ LINE UID กับฐานข้อมูลผ่าน `POST /api/members/app-roles`
 * — สร้าง/อัปเดตแถว `app_users` เพื่อ identify ผู้ใช้ในระบบ (แยกจากการผูกแถว `members` ผ่าน verify-link)
 */
export type SyncLineAppUserOk = {
  ok: true
  line_uid: string
  app_user_id: string | null
  roles: string[]
  /** สรุป JSON จาก API จริง — ใช้ไล่บั๊ก */
  trace: string
}

export type SyncLineAppUserFail = {
  ok: false
  error: string
  status?: number
  trace: string
}

export type SyncLineAppUserResult = SyncLineAppUserOk | SyncLineAppUserFail

/** @deprecated ใช้ normalizeApiBase จาก adminApi — เก็บชื่อเดิมเพื่ออ่านง่าย */
export const normalizeApiBaseUrl = normalizeApiBase

export async function syncLineAppUser(
  apiBase: string,
  lineUid: string,
  options?: { entrySource?: LineEntrySource | null },
): Promise<SyncLineAppUserResult> {
  const uid = lineUid.trim()
  if (!uid) return { ok: false, error: 'ไม่มี line_uid', trace: '(ยังไม่ได้เรียก API)' }

  const entry_source =
    options && 'entrySource' in options ? options.entrySource : readLineEntrySource()

  const body: Record<string, string> = { line_uid: uid }
  if (entry_source) body.entry_source = entry_source

  const r = await fetch(`${normalizeApiBase(apiBase)}/api/members/app-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  const trace = summarizeAppRolesTrace(r.status, j)
  if (!r.ok || j.ok !== true) {
    const err = typeof j.error === 'string' ? j.error : `HTTP ${r.status}`
    return { ok: false, error: err, status: r.status, trace }
  }

  const rawRoles = j.roles
  const roles = Array.isArray(rawRoles)
    ? rawRoles.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
    : []

  const aid = j.app_user_id
  const app_user_id: string | null = typeof aid === 'string' ? aid : null

  const outUid = typeof j.line_uid === 'string' ? j.line_uid : uid

  return { ok: true, line_uid: outUid, app_user_id, roles, trace }
}
