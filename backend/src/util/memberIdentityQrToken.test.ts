import { describe, expect, it } from 'vitest'
import { readMemberIdentityQrToken } from './memberIdentityQrToken.js'

describe('readMemberIdentityQrToken', () => {
  it('accepts canonical uuid v4', () => {
    expect(
      readMemberIdentityQrToken({
        member_identity_qr_token: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('normalizes case', () => {
    expect(
      readMemberIdentityQrToken({
        member_identity_qr_token: '550E8400-E29B-41D4-A716-446655440000',
      }),
    ).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('rejects invalid', () => {
    expect(readMemberIdentityQrToken({ member_identity_qr_token: 'not-a-uuid' })).toBeNull()
    expect(readMemberIdentityQrToken({ member_identity_qr_token: '' })).toBeNull()
    expect(readMemberIdentityQrToken({})).toBeNull()
  })
})
