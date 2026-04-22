import { describe, expect, it } from 'vitest'
import { isMemberMembershipActive } from './memberMembership.js'

describe('isMemberMembershipActive', () => {
  it('accepts Active case-insensitively', () => {
    expect(isMemberMembershipActive('Active')).toBe(true)
    expect(isMemberMembershipActive('active')).toBe(true)
    expect(isMemberMembershipActive(' ACTIVE ')).toBe(true)
  })
  it('rejects non-active', () => {
    expect(isMemberMembershipActive('Inactive')).toBe(false)
    expect(isMemberMembershipActive('Pending')).toBe(false)
    expect(isMemberMembershipActive('')).toBe(false)
    expect(isMemberMembershipActive(null)).toBe(false)
  })
})
