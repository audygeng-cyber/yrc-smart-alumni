import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPaymentRequestDetail,
  fetchPaymentRequestsList,
  postJournalDraft,
  postPaymentRequest,
  postPaymentRequestApprove,
} from './adminFinanceJournalPaymentApi'

describe('postJournalDraft', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST /api/admin/finance/journals', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ journal: { id: 'j1' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postJournalDraft('http://localhost:4000', 'k', {
      legal_entity_code: 'association',
      entry_date: '2026-04-18',
      reference_no: null,
      memo: null,
      created_by: 'finance-admin',
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
      body: JSON.stringify({
        legal_entity_code: 'association',
        entry_date: '2026-04-18',
        reference_no: null,
        memo: null,
        created_by: 'finance-admin',
      }),
    })
  })
})

describe('postPaymentRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST payment-requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ paymentRequest: { id: 'p1' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postPaymentRequest('http://localhost:4000', 'k', {
      legal_entity_code: 'association',
      purpose: 'ค่าไฟ',
      amount: 5000,
      vat_rate: 0.07,
      wht_rate: 0,
      bank_account_id: 'ba-1',
      requested_by: 'admin-ui',
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/payment-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
      body: JSON.stringify({
        legal_entity_code: 'association',
        purpose: 'ค่าไฟ',
        amount: 5000,
        vat_rate: 0.07,
        wht_rate: 0,
        bank_account_id: 'ba-1',
        requested_by: 'admin-ui',
      }),
    })
  })
})

describe('fetchPaymentRequestsList', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET payment-requests พร้อม query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, paymentRequests: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPaymentRequestsList('http://localhost:4000', 'k', {
      legal_entity_code: 'association',
      status: 'pending',
      limit: 50,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/payment-requests?legal_entity_code=association&status=pending&limit=50',
      expect.objectContaining({ headers: { 'x-admin-key': 'k' } }),
    )
  })
})

describe('fetchPaymentRequestDetail', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET payment-requests/:id encode id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPaymentRequestDetail('http://localhost:4000', 'k', 'abc/def')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/payment-requests/abc%2Fdef',
      expect.objectContaining({ headers: { 'x-admin-key': 'k' } }),
    )
  })
})

describe('postPaymentRequestApprove', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST approve พร้อม encode id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postPaymentRequestApprove('http://localhost:4000', 'k', 'pr/1', {
      approver_role_code: 'committee',
      decision: 'approve',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/admin/finance/payment-requests/pr%2F1/approve',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          approver_role_code: 'committee',
          decision: 'approve',
        }),
      }),
    )
  })
})
