import { describe, expect, it } from 'vitest'
import { csvEscapeValue, rowsToCsv } from './csvRows.js'

describe('csvRows', () => {
  it('rowsToCsv returns empty for empty input', () => {
    expect(rowsToCsv([])).toBe('')
  })

  it('escapes commas in headers and cells', () => {
    const csv = rowsToCsv([{ 'a,b': '1', c: '2' }])
    expect(csv).toContain('"a,b"')
    expect(csv).toContain('2')
  })

  it('csvEscapeValue handles null', () => {
    expect(csvEscapeValue(null)).toBe('')
  })
})
