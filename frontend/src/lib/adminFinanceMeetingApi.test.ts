import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMeetingAgendas, postMeetingAgendaClose } from './adminFinanceMeetingApi'

describe('fetchMeetingAgendas', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('เรียก meeting-agendas พร้อม query suffix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ agendas: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMeetingAgendas('http://localhost:4000', 'k', '?scope=association')
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/meeting-agendas?scope=association', {
      headers: { 'x-admin-key': 'k' },
    })
  })
})

describe('postMeetingAgendaClose', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST ปิดวาระโดยไม่มี body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await postMeetingAgendaClose('http://localhost:4000', 'k', 'ag-1')
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/admin/finance/meeting-agendas/ag-1/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'k' },
    })
  })
})
