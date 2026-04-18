import { afterEach, describe, expect, it, vi } from 'vitest'
import { financeAdminGetJson, financeAdminJson } from './adminFinanceJsonFetch'

describe('financeAdminGetJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET พร้อม x-admin-key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await financeAdminGetJson('http://localhost:4000', '/api/admin/finance/x', 'secret')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/x', {
      headers: { 'x-admin-key': 'secret' },
    })
  })
})

describe('financeAdminJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST JSON พร้อม body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await financeAdminJson('http://localhost:4000', 'POST', '/api/admin/finance/y', 'k', { a: 1 })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/y', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
      body: '{"a":1}',
    })
  })
})
