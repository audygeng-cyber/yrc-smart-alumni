import { describe, expect, it } from 'vitest'
import { summarizeAppRolesTrace, summarizeSessionMemberTrace } from './lineMemberApiTrace'

describe('summarizeAppRolesTrace', () => {
  it('includes roles and http status', () => {
    const s = summarizeAppRolesTrace(200, {
      ok: true,
      line_uid: 'Ux',
      app_user_id: 'au1',
      roles: ['member'],
      has_linked_member: true,
    })
    expect(s).toContain('"http":200')
    expect(s).toContain('"ok":true')
    expect(s).toContain('member')
  })
})

describe('summarizeSessionMemberTrace', () => {
  it('includes MEMBER_NOT_LINKED style body', () => {
    const s = summarizeSessionMemberTrace(404, {
      code: 'MEMBER_NOT_LINKED',
      error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้',
    })
    expect(s).toContain('MEMBER_NOT_LINKED')
    expect(s).toContain('"http":404')
  })

  it('peeks member id when present', () => {
    const s = summarizeSessionMemberTrace(200, {
      ok: true,
      memberId: 'mid',
      member: { id: 'mid', line_uid: 'Ux', first_name: 'A' },
    })
    expect(s).toContain('mid')
    expect(s).toContain('Ux')
  })
})
