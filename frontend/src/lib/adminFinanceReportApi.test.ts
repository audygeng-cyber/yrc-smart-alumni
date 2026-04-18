import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFinanceOverview } from './adminFinanceReportApi'

describe('fetchFinanceOverview', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('เรียก endpoint overview พร้อม x-admin-key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchFinanceOverview('http://localhost:4000', 'secret-key')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/overview', {
      headers: { 'x-admin-key': 'secret-key' },
    })
  })
})
