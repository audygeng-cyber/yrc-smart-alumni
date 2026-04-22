/**
 * สรุป payload ที่ API คืนจริง — ใช้แสดงหลังล็อกอิน LINE เพื่อไล่ session-member / app-roles บนมือถือ
 */

function clampJson(obj: Record<string, unknown>, max: number): string {
  let s = JSON.stringify(obj)
  if (s.length > max) s = `${s.slice(0, max)}…`
  return s
}

/** POST /api/members/app-roles */
export function summarizeAppRolesTrace(status: number, body: Record<string, unknown>): string {
  const slim: Record<string, unknown> = {
    http: status,
    ok: body.ok,
    error: body.error,
    code: body.code,
    roles: body.roles,
    app_user_id: body.app_user_id,
    has_linked_member: body.has_linked_member,
    membership_active: body.membership_active,
    approval_status: body.approval_status,
    line_uid: body.line_uid,
  }
  return clampJson(slim, 480)
}

/** POST /api/members/session-member */
export function summarizeSessionMemberTrace(status: number, body: Record<string, unknown>): string {
  const member = body.member
  const peek =
    member && typeof member === 'object' && !Array.isArray(member)
      ? {
          id: (member as Record<string, unknown>).id,
          line_uid: (member as Record<string, unknown>).line_uid,
        }
      : null
  const slim: Record<string, unknown> = {
    http: status,
    ok: body.ok,
    error: body.error,
    code: body.code,
    memberId: body.memberId,
    memberPeek: peek,
  }
  return clampJson(slim, 480)
}
