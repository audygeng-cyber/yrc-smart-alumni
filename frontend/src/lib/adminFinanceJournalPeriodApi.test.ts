import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchJournalsList } from './adminFinanceJournalPeriodApi'

describe('fetchJournalsList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('เรียก journals พร้อม query suffix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ journals: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchJournalsList('http://localhost:4000', 'k', '?status=posted')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/journals?status=posted', {
      headers: { 'x-admin-key': 'k' },
    })
  })
})
