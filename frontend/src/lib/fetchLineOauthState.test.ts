import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLineOauthState } from './fetchLineOauthState'

function textResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html' } })
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('fetchLineOauthState', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses GET when GET returns JSON state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ state: 'abc.def.sig' }, 200)),
    )
    const r = await fetchLineOauthState('https://api.example.com')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state).toBe('abc.def.sig')
      expect(r.method).toBe('GET')
    }
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('retries POST when GET returns 404 HTML', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<!DOCTYPE html>...Cannot GET /api/auth/line/oauth-state', 404))
      .mockResolvedValueOnce(jsonResponse({ state: 'from.post' }, 200))
    vi.stubGlobal('fetch', fetchMock)

    const r = await fetchLineOauthState('https://api.example.com')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state).toBe('from.post')
      expect(r.method).toBe('POST')
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST')
  })

  it('returns fail when both attempts lack state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'no secret' }, 500)),
    )
    const r = await fetchLineOauthState('https://api.example.com')
    expect(r.ok).toBe(false)
    if (r.ok === false) {
      expect(r.status).toBe(500)
      expect(r.detail).toContain('no secret')
    }
  })
})
