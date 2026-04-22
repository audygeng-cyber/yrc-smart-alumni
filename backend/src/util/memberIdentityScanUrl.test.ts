import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMemberIdentityScanUrl, primaryFrontendOriginFromEnv } from './memberIdentityScanUrl.js'

describe('primaryFrontendOriginFromEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns first origin without trailing slash', () => {
    vi.stubEnv('FRONTEND_ORIGINS', 'https://a.example.com/, https://b.example.com')
    expect(primaryFrontendOriginFromEnv()).toBe('https://a.example.com')
  })

  it('returns null when unset', () => {
    vi.stubEnv('FRONTEND_ORIGINS', '')
    expect(primaryFrontendOriginFromEnv()).toBe(null)
  })
})

describe('buildMemberIdentityScanUrl', () => {
  it('encodes token in query', () => {
    expect(buildMemberIdentityScanUrl('https://app.test', 'abc-uuid')).toBe(
      'https://app.test/open/member-identity?t=abc-uuid',
    )
  })
})
