import { describe, expect, it } from 'vitest'
import { formatFetchError, readApiJson } from './adminHttp'

describe('readApiJson', () => {
  it('parses JSON body and preserves status', async () => {
    const r = new Response('{"ok":true}', { status: 200 })
    const out = await readApiJson(r)
    expect(out.status).toBe(200)
    expect(out.ok).toBe(true)
    expect(out.payload).toEqual({ ok: true })
    expect(out.rawText).toBe('{"ok":true}')
  })

  it('returns null payload for invalid JSON with rawText kept', async () => {
    const r = new Response('not-json', { status: 500 })
    const out = await readApiJson(r)
    expect(out.status).toBe(500)
    expect(out.ok).toBe(false)
    expect(out.payload).toBeNull()
    expect(out.rawText).toBe('not-json')
  })

  it('handles empty body', async () => {
    const r = new Response('', { status: 200 })
    const out = await readApiJson(r)
    expect(out.payload).toBeNull()
    expect(out.rawText).toBe('')
  })
})

describe('formatFetchError', () => {
  it('includes full raw body when no max length', () => {
    const long = 'x'.repeat(1200)
    const msg = formatFetchError('ทดสอบ', 500, { err: 'bad' }, long)
    expect(msg).toContain('HTTP 500')
    expect(msg).toContain(long)
    expect(msg).not.toContain('…')
  })

  it('truncates raw body when maxRawLength set', () => {
    const raw = 'y'.repeat(1000)
    const msg = formatFetchError('นำเข้า', 413, null, raw, { maxRawLength: 100 })
    expect(msg).toContain('y'.repeat(100))
    expect(msg).toContain('…')
    expect(msg.length).toBeLessThan(raw.length + 200)
  })

  it('appends import 404 hint when enabled', () => {
    const msg = formatFetchError('สรุป', 404, null, '', {
      include404ImportHint: true,
    })
    expect(msg).toContain('GET /api/admin/members/directory')
    expect(msg).toContain('GET /api/admin/members/summary')
  })

  it('shows (ไม่มี body) for blank raw', () => {
    const msg = formatFetchError('x', 400, undefined, '   ')
    expect(msg).toContain('(ไม่มี body)')
  })
})
