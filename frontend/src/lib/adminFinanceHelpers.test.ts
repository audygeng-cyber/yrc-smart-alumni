import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activityLevelLabel,
  buildBuiltinReportPresets,
  csvEscapeCell,
  paginateRows,
  rowsToCsvText,
} from './adminFinanceHelpers'

describe('paginateRows', () => {
  it('returns first page and clamps page to totalPages', () => {
    const rows = [1, 2, 3, 4, 5]
    const a = paginateRows(rows, 1, 2)
    expect(a.pageRows).toEqual([1, 2])
    expect(a.page).toBe(1)
    expect(a.totalPages).toBe(3)
    const b = paginateRows(rows, 99, 2)
    expect(b.page).toBe(3)
    expect(b.pageRows).toEqual([5])
  })
})

describe('csvEscapeCell', () => {
  it('quotes when needed', () => {
    expect(csvEscapeCell('a,b')).toBe('"a,b"')
    expect(csvEscapeCell('say "hi"')).toBe('"say ""hi"""')
  })
})

describe('rowsToCsvText', () => {
  it('adds BOM and header row', () => {
    const text = rowsToCsvText([{ a: 1, b: 'x' }])
    expect(text.startsWith('\uFEFF')).toBe(true)
    expect(text).toContain('a,b')
    expect(text).toContain('1,x')
  })
})

describe('activityLevelLabel', () => {
  it('maps known levels', () => {
    expect(activityLevelLabel('all')).toBe('ทั้งหมด')
    expect(activityLevelLabel('error')).toBe('ข้อผิดพลาด')
  })
})

describe('buildBuiltinReportPresets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds three presets with consistent date range ending today', () => {
    const presets = buildBuiltinReportPresets()
    expect(presets).toHaveLength(3)
    expect(presets[0].id).toBe('builtin:association_month')
    expect(presets[0].legalEntityCode).toBe('association')
    expect(presets[0].from).toBe('2026-06-01')
    expect(presets[0].to).toBe('2026-06-15')
    expect(presets[2].legalEntityCode).toBe('')
    expect(presets[2].from).toBe('2026-01-01')
  })
})
