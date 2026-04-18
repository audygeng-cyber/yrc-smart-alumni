import { afterEach, describe, expect, it, vi } from 'vitest'
import { enforceAppRbac, RBAC_NAV, rolesAllow } from './appRoles'

describe('rolesAllow', () => {
  it('returns true when any user role is in the allow list', () => {
    expect(rolesAllow(['member', 'other'], RBAC_NAV.member)).toBe(true)
    expect(rolesAllow(['admin'], RBAC_NAV.member)).toBe(true)
    expect(rolesAllow(['committee'], RBAC_NAV.requests)).toBe(true)
  })

  it('returns false when there is no overlap', () => {
    expect(rolesAllow(['student'], RBAC_NAV.member)).toBe(false)
    expect(rolesAllow([], RBAC_NAV.admin)).toBe(false)
    expect(rolesAllow(['member'], RBAC_NAV.admin)).toBe(false)
  })
})

describe('enforceAppRbac', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is true only when VITE_ENFORCE_APP_RBAC is the string "true"', () => {
    vi.stubEnv('VITE_ENFORCE_APP_RBAC', 'true')
    expect(enforceAppRbac()).toBe(true)
  })

  it('is false for other values', () => {
    vi.stubEnv('VITE_ENFORCE_APP_RBAC', '')
    expect(enforceAppRbac()).toBe(false)
    vi.stubEnv('VITE_ENFORCE_APP_RBAC', '1')
    expect(enforceAppRbac()).toBe(false)
    vi.stubEnv('VITE_ENFORCE_APP_RBAC', 'false')
    expect(enforceAppRbac()).toBe(false)
  })
})

describe('RBAC_NAV', () => {
  it('includes admin in portal areas so superuser can navigate', () => {
    expect(RBAC_NAV.member).toContain('admin')
    expect(RBAC_NAV.committee).toContain('admin')
    expect(RBAC_NAV.academy).toContain('admin')
    expect(RBAC_NAV.requests).toContain('admin')
  })
})
