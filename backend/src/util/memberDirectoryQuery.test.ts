import { describe, expect, it } from 'vitest'
import { parseDirectoryView, sanitizeIlikeFragment } from './memberDirectoryQuery.js'

describe('memberDirectoryQuery', () => {
  it('sanitizeIlikeFragment strips wildcards and delimiters', () => {
    expect(sanitizeIlikeFragment('  สม%ชาย_  ')).toBe('สมชาย')
    expect(sanitizeIlikeFragment('a,b(c)')).toBe('abc')
  })

  it('parseDirectoryView accepts known views only', () => {
    expect(parseDirectoryView('person')).toBe('person')
    expect(parseDirectoryView(' batch ')).toBe('batch')
    expect(parseDirectoryView('committee')).toBe('committee')
    expect(parseDirectoryView('')).toBe(null)
    expect(parseDirectoryView('unknown')).toBe(null)
  })
})
