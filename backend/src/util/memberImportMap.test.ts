import { describe, expect, it } from 'vitest'
import { HEADER_TO_DB, IMPORT_TEMPLATE_HEADERS, thaiHeaderToMemberKey } from './memberImportMap.js'

describe('IMPORT_TEMPLATE_HEADERS', () => {
  it('includes every key from HEADER_TO_DB (distinction columns are extra only)', () => {
    const templateSet = new Set(IMPORT_TEMPLATE_HEADERS)
    for (const k of Object.keys(HEADER_TO_DB)) {
      expect(templateSet.has(k), `missing template column for DB field: ${k}`).toBe(true)
    }
    expect(IMPORT_TEMPLATE_HEADERS.length).toBeGreaterThanOrEqual(Object.keys(HEADER_TO_DB).length)
  })

  it('resolves legacy Thai header สถานะสมาชิก to membership_status', () => {
    expect(thaiHeaderToMemberKey('สถานะสมาชิก')).toBe('membership_status')
    expect(thaiHeaderToMemberKey('สมาชิกภาพ')).toBe('membership_status')
  })

  it('includes distinction-only import columns', () => {
    const templateSet = new Set(IMPORT_TEMPLATE_HEADERS)
    expect(templateSet.has('ประธานรุ่น')).toBe(true)
    expect(templateSet.has('ศิษย์เก่าดีเด่น')).toBe(true)
    expect(templateSet.has('ศิษย์เก่าดีเด่น (ปี พ.ศ.)')).toBe(true)
    expect(templateSet.has('ศิษย์เก่าดีเด่น (โปรแกรม)')).toBe(true)
    expect(templateSet.has('ฐานสถานะศิษย์เก่า')).toBe(true)
  })
})
