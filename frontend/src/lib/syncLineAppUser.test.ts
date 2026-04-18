import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncLineAppUser } from './syncLineAppUser'

describe('syncLineAppUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok with roles when API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          line_uid: 'Uxxx',
          app_user_id: 'au-1',
          roles: ['member'],
        }),
      })) as typeof fetch,
    )

    const r = await syncLineAppUser('https://api.example.com', 'Uxxx', { entrySource: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.line_uid).toBe('Uxxx')
      expect(r.app_user_id).toBe('au-1')
      expect(r.roles).toEqual(['member'])
    }
  })

  it('returns fail when line_uid is empty', async () => {
    const r = await syncLineAppUser('https://api.example.com', '  ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/line_uid/)
  })

  it('strips trailing slash from api base', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, line_uid: 'U1', app_user_id: null, roles: [] }),
    })) as typeof fetch
    vi.stubGlobal('fetch', fetchMock)

    await syncLineAppUser('https://api.example.com/', 'U1', { entrySource: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/members/app-roles',
      expect.any(Object),
    )
  })
})
