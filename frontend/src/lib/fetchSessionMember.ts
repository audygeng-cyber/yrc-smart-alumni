import { normalizeApiBase } from './adminApi'
import { summarizeSessionMemberTrace } from './lineMemberApiTrace'

export type FetchSessionMemberOk = {
  ok: true
  member: Record<string, unknown>
  trace: string
}

export type FetchSessionMemberFail = { ok: false; status: number; trace: string; code?: string }

/**
 * โหลดแถวสมาชิกที่ผูก LINE UID แล้ว (POST /api/members/session-member)
 * — ใช้ร่วมหลัง OAuth และ effect กู้เซสชัน เพื่อไม่ให้ logic คนละแบบ
 */
export async function fetchSessionMember(
  apiBase: string,
  lineUid: string,
  signal?: AbortSignal,
): Promise<FetchSessionMemberOk | FetchSessionMemberFail> {
  const uid = lineUid.trim()
  if (!uid) return { ok: false, status: 400, trace: '(ยังไม่ได้เรียก API)' }

  const r = await fetch(`${normalizeApiBase(apiBase)}/api/members/session-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_uid: uid }),
    signal,
    mode: 'cors',
    cache: 'no-store',
  })
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  const trace = summarizeSessionMemberTrace(r.status, j)
  const code = typeof j.code === 'string' ? j.code : undefined
  const m = j.member
  if (!r.ok || !m || typeof m !== 'object' || Array.isArray(m)) {
    return { ok: false, status: r.status, trace, code }
  }
  return { ok: true, member: m as Record<string, unknown>, trace }
}
