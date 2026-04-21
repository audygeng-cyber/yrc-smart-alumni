import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSessionMember } from './fetchSessionMember'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('fetchSessionMember', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok when API returns member object', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ok: true,
          memberId: 'm1',
          member: { id: 'm1', line_uid: 'Uxxx', first_name: 'A' },
        }),
      ),
    )

    const r = await fetchSessionMember('https://api.example.com', 'Uxxx')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.member.line_uid).toBe('Uxxx')
      expect(r.trace).toContain('"http":200')
    }
  })

  it('returns fail on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'not found' }, 404)))

    const r = await fetchSessionMember('https://api.example.com', 'Uxxx')
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.status).toBe(404)
      expect(r.trace).toContain('404')
    }
  })

  it('returns fail when line_uid is empty', async () => {
    const r = await fetchSessionMember('https://api.example.com', '  ')
    expect(r.ok).toBe(false)
    if (r.ok === false) expect(r.status).toBe(400)
  })
})
