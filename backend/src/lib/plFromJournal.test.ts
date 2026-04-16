import { describe, expect, it } from 'vitest'
import { monthEntryDateRangeUtc } from './plFromJournal.js'

describe('monthEntryDateRangeUtc', () => {
  it('returns from <= to and valid YYYY-MM-DD', () => {
    const { fromDate, toDate } = monthEntryDateRangeUtc()
    expect(fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fromDate <= toDate).toBe(true)
    expect(fromDate.endsWith('-01')).toBe(true)
  })
})
