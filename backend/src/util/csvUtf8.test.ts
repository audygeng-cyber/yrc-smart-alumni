import { describe, expect, it } from 'vitest'
import { UTF8_BOM, withUtf8Bom } from './csvUtf8.js'

describe('csvUtf8', () => {
  it('prepends BOM once', () => {
    expect(withUtf8Bom('a,b')).toBe(`${UTF8_BOM}a,b`)
  })

  it('does not double BOM', () => {
    const once = withUtf8Bom('x')
    expect(withUtf8Bom(once)).toBe(once)
  })
})
