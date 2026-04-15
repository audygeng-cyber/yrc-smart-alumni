export const SS_LINE_UID = 'yrc_line_uid'
export const SS_LINE_NAME = 'yrc_line_name'
export const SS_LINE_FROM_OAUTH = 'yrc_line_uid_from_oauth'
export const SS_OAUTH_STATE = 'yrc_line_oauth_state'

export function readLineUid(): string {
  return sessionStorage.getItem(SS_LINE_UID) ?? ''
}

export function readLineFromOAuth(): boolean {
  return sessionStorage.getItem(SS_LINE_FROM_OAUTH) === '1'
}

export function clearLineSession() {
  sessionStorage.removeItem(SS_LINE_UID)
  sessionStorage.removeItem(SS_LINE_NAME)
  sessionStorage.removeItem(SS_LINE_FROM_OAUTH)
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
