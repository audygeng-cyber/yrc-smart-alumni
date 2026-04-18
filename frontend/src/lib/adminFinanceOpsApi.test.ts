import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFiscalYearsList,
  postFixedAssetRunDepreciation,
  postPeriodClosingClose,
  postTaxCalculate,
} from './adminFinanceOpsApi'

describe('postPeriodClosingClose', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST /api/admin/finance/period-closing พร้อม body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postPeriodClosingClose('http://localhost:4000', 'k', {
      legal_entity_code: 'association',
      period_from: '2026-01-01',
      period_to: '2026-01-31',
      closed_by: 'finance-admin',
      note: null,
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/period-closing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
      body: JSON.stringify({
        legal_entity_code: 'association',
        period_from: '2026-01-01',
        period_to: '2026-01-31',
        closed_by: 'finance-admin',
        note: null,
      }),
    })
  })
})

describe('fetchFiscalYearsList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET fiscal-years พร้อม legal_entity_code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ rows: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchFiscalYearsList('http://localhost:4000', 'k', 'cram_school')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/fiscal-years?legal_entity_code=cram_school',
      { headers: { 'x-admin-key': 'k' } },
    )
  })
})

describe('postFixedAssetRunDepreciation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST run-depreciation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ posted: false }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postFixedAssetRunDepreciation('http://localhost:4000', 'k', {
      legal_entity_code: 'association',
      month: '2026-04',
      posted_by: 'finance-admin',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/fixed-assets/run-depreciation',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          legal_entity_code: 'association',
          month: '2026-04',
          posted_by: 'finance-admin',
        }),
      }),
    )
  })
})

describe('postTaxCalculate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST tax/calculate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ netPayable: 100 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postTaxCalculate('http://localhost:4000', 'k', { base_amount: 1000, vat_rate: 0.07, wht_rate: 0.03 })
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/tax/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
      body: JSON.stringify({ base_amount: 1000, vat_rate: 0.07, wht_rate: 0.03 }),
    })
  })
})
