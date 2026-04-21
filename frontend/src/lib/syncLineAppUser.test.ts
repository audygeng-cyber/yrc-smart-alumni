import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncLineAppUser } from './syncLineAppUser'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('syncLineAppUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok with roles when API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ok: true,
          line_uid: 'Uxxx',
          app_user_id: 'au-1',
          roles: ['member'],
        }),
      ),
    )

    const r = await syncLineAppUser('https://api.example.com', 'Uxxx', { entrySource: null })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.line_uid).toBe('Uxxx')
      expect(r.app_user_id).toBe('au-1')
      expect(r.roles).toEqual(['member'])
      expect(r.trace).toContain('"http":200')
    }
  })

  it('returns fail when line_uid is empty', async () => {
    const r = await syncLineAppUser('https://api.example.com', '  ')
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.error).toMatch(/line_uid/)
    }
  })

  it('strips trailing slash from api base', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: true, line_uid: 'U1', app_user_id: null, roles: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await syncLineAppUser('https://api.example.com/', 'U1', { entrySource: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/members/app-roles',
      expect.any(Object),
    )
  })

  it('strips erroneous /api suffix so request is not /api/api/members/...', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ok: true, line_uid: 'U1', app_user_id: null, roles: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await syncLineAppUser('https://api.example.com/api', 'U1', { entrySource: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/members/app-roles',
      expect.any(Object),
    )
  })
})
