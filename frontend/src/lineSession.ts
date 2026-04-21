import { clearLineEntrySource } from './lib/lineEntrySource'

export const SS_LINE_UID = 'yrc_line_uid'
export const SS_LINE_NAME = 'yrc_line_name'
export const SS_LINE_FROM_OAUTH = 'yrc_line_uid_from_oauth'
/** แถวสมาชิกหลัง verify-link สำเร็จ — ใช้เปิดหน้าสมาชิกเมื่อรีเฟรช */
export const SS_MEMBER_SNAPSHOT = 'yrc_member_snapshot'

export function readLineUid(): string {
  return sessionStorage.getItem(SS_LINE_UID) ?? ''
}

export function readLineFromOAuth(): boolean {
  return sessionStorage.getItem(SS_LINE_FROM_OAUTH) === '1'
}

export function readLineName(): string {
  return sessionStorage.getItem(SS_LINE_NAME) ?? ''
}

export function clearMemberSnapshot() {
  sessionStorage.removeItem(SS_MEMBER_SNAPSHOT)
}

export function readMemberSnapshot(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(SS_MEMBER_SNAPSHOT)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function setMemberSnapshot(m: Record<string, unknown>) {
  sessionStorage.setItem(SS_MEMBER_SNAPSHOT, JSON.stringify(m))
}

export function clearLineSession() {
  sessionStorage.removeItem(SS_LINE_UID)
  sessionStorage.removeItem(SS_LINE_NAME)
  sessionStorage.removeItem(SS_LINE_FROM_OAUTH)
  clearMemberSnapshot()
  clearLineEntrySource()
}

/** ใส่ UID เองเมื่อ dev — ไม่ถือว่ามาจาก OAuth */
export function setManualLineUid(v: string) {
  if (!v.trim()) {
    clearLineSession()
    return
  }
  sessionStorage.setItem(SS_LINE_UID, v.trim())
  sessionStorage.removeItem(SS_LINE_FROM_OAUTH)
  sessionStorage.removeItem(SS_LINE_NAME)
}

export function setLineSessionFromOAuth(uid: string, name?: string) {
  sessionStorage.setItem(SS_LINE_UID, uid)
  sessionStorage.setItem(SS_LINE_FROM_OAUTH, '1')
  if (name) sessionStorage.setItem(SS_LINE_NAME, name)
  else sessionStorage.removeItem(SS_LINE_NAME)
}
