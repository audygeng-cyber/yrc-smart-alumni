import { describe, expect, it } from 'vitest'
import { cellToImportString, sheetRowsToObjects } from './readExcelRows.js'

describe('cellToImportString', () => {
  it('returns empty for null/undefined', () => {
    expect(cellToImportString(null)).toBe('')
    expect(cellToImportString(undefined)).toBe('')
  })

  it('trims strings', () => {
    expect(cellToImportString('  hi  ')).toBe('hi')
  })

  it('formats Date as YYYY-MM-DD', () => {
    expect(cellToImportString(new Date('2024-06-15T12:00:00.000Z'))).toBe('2024-06-15')
  })

  it('stringifies numbers', () => {
    expect(cellToImportString(507)).toBe('507')
  })
})

describe('sheetRowsToObjects', () => {
  it('returns empty array for no rows', () => {
    expect(sheetRowsToObjects([])).toEqual([])
  })

  it('returns empty data when only header row', () => {
    expect(sheetRowsToObjects([['รุ่น', 'ชื่อ', 'นามสกุล']])).toEqual([])
  })

  it('maps header row + data rows to objects', () => {
    const rows = [
      ['รุ่น', 'ชื่อ', 'นามสกุล'],
      ['0507', '  สมชาย  ', 'ใจดี'],
    ]
    expect(sheetRowsToObjects(rows)).toEqual([
      {
        รุ่น: '0507',
        ชื่อ: 'สมชาย',
        นามสกุล: 'ใจดี',
      },
    ])
  })

  it('skips columns with empty header name', () => {
    const rows = [
      ['รุ่น', '', 'ชื่อ'],
      ['A', 'skip', 'B'],
    ]
    expect(sheetRowsToObjects(rows)).toEqual([
      {
        รุ่น: 'A',
        ชื่อ: 'B',
      },
    ])
  })
})
