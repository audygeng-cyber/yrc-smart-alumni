import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlobFromAdminGet, fetchFinanceAdminRaw } from './adminFinanceDownload'

describe('fetchFinanceAdminRaw', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET ต่อ base+path พร้อม x-admin-key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchFinanceAdminRaw('http://localhost:4000', '/api/admin/finance/x.csv', 'secret')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/x.csv', {
      headers: { 'x-admin-key': 'secret' },
    })
  })
})

describe('downloadBlobFromAdminGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('คืน errorText เมื่อ HTTP ไม่ ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)

    const out = await downloadBlobFromAdminGet(
      'http://localhost:4000',
      '/api/x.csv',
      'k',
      'out.csv',
    )
    expect(out).toEqual({ ok: false, status: 403, errorText: 'bad' })
  })
})
