import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFinanceOverview, fetchIncomeStatementReport } from './adminFinanceReportApi'

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

describe('fetchIncomeStatementReport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('เรียก income-statement พร้อม query suffix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchIncomeStatementReport('http://localhost:4000', 'k', '?from=2026-01-01')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/reports/income-statement?from=2026-01-01',
      { headers: { 'x-admin-key': 'k' } },
    )
  })
})
