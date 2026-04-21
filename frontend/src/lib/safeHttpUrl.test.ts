import { describe, expect, it } from 'vitest'
import { safeHttpImageUrl } from './safeHttpUrl'

describe('safeHttpImageUrl', () => {
  it('accepts https and http', () => {
    expect(safeHttpImageUrl(' https://example.com/a.png ')).toBe('https://example.com/a.png')
    expect(safeHttpImageUrl('http://x.test/a')).toBe('http://x.test/a')
  })

  it('rejects non-http schemes and invalid', () => {
    expect(safeHttpImageUrl('javascript:alert(1)')).toBe(null)
    expect(safeHttpImageUrl('data:image/png;base64,xx')).toBe(null)
    expect(safeHttpImageUrl('')).toBe(null)
    expect(safeHttpImageUrl(null)).toBe(null)
  })
})
