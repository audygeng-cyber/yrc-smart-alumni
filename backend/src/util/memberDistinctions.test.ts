import { describe, expect, it } from 'vitest'
import { MemberDistinctionCode } from '../constants/memberDistinctionCodes.js'
import {
  dedupeDistinctionSpecs,
  distinctionSpecsFromRegistrationData,
  extractDistinctionSpecsFromImportRow,
  formatMembershipDistinctionLines,
  normalizeBuddhistYearKey,
  normalizeOutstandingProgramKey,
  rollupDistinctions,
} from './memberDistinctions.js'

describe('normalizeBuddhistYearKey', () => {
  it('extracts 4-digit พ.ศ. from messy input', () => {
    expect(normalizeBuddhistYearKey('พ.ศ. 2560')).toBe('2560')
    expect(normalizeBuddhistYearKey('2560')).toBe('2560')
  })
  it('returns null for short input', () => {
    expect(normalizeBuddhistYearKey('25')).toBe(null)
  })
})

describe('normalizeOutstandingProgramKey', () => {
  it('maps known and alias strings', () => {
    expect(normalizeOutstandingProgramKey('yupparaj_120')).toBe('yupparaj_120')
    expect(normalizeOutstandingProgramKey('120 ปี ยุพรา')).toBe('yupparaj_120')
  })
})

describe('extractDistinctionSpecsFromImportRow', () => {
  it('reads Thai template columns into specs', () => {
    const specs = extractDistinctionSpecsFromImportRow({
      ประธานรุ่น: 'ใช่',
      ศิษย์เก่าดีเด่น: 'x',
      'ศิษย์เก่าดีเด่น (ปี พ.ศ.)': '2560',
      'ศิษย์เก่าดีเด่น (โปรแกรม)': 'yupparaj_120',
      ฐานสถานะศิษย์เก่า: 1,
    })
    const keys = specs.map((s) => `${s.code}:${s.mark_key}`).sort()
    expect(keys).toEqual(
      [
        `${MemberDistinctionCode.alumniBase}:`,
        `${MemberDistinctionCode.batchPresident}:`,
        `${MemberDistinctionCode.outstandingAlumni}:`,
        `${MemberDistinctionCode.outstandingAlumniYear}:2560`,
        `${MemberDistinctionCode.outstandingProgram}:yupparaj_120`,
      ].sort(),
    )
  })
})

describe('distinctionSpecsFromRegistrationData', () => {
  it('matches registration snake_case fields', () => {
    const specs = distinctionSpecsFromRegistrationData({
      batch_president: true,
      outstanding_alumni: false,
      alumni_base: true,
    })
    expect(specs.some((s) => s.code === MemberDistinctionCode.batchPresident)).toBe(true)
    expect(specs.some((s) => s.code === MemberDistinctionCode.outstandingAlumni)).toBe(false)
    expect(specs.some((s) => s.code === MemberDistinctionCode.alumniBase)).toBe(true)
  })
})

describe('dedupeDistinctionSpecs', () => {
  it('removes duplicate code+mark_key', () => {
    const out = dedupeDistinctionSpecs([
      { code: MemberDistinctionCode.batchPresident, mark_key: '', label_th: null },
      { code: MemberDistinctionCode.batchPresident, mark_key: '', label_th: null },
    ])
    expect(out).toHaveLength(1)
  })
})

describe('rollupDistinctions', () => {
  it('sets flags and summary from rows', () => {
    const rollup = rollupDistinctions([
      {
        id: '1',
        member_id: 'm',
        code: MemberDistinctionCode.batchPresident,
        mark_key: '',
        label_th: null,
      },
      {
        id: '2',
        member_id: 'm',
        code: MemberDistinctionCode.outstandingAlumniYear,
        mark_key: '2560',
        label_th: 'ศิษย์เก่าดีเด่น ปี พ.ศ. 2560',
      },
    ])
    expect(rollup.batch_president).toBe(true)
    expect(rollup.outstanding_alumni).toBe(true)
    expect(rollup.distinctions).toHaveLength(2)
    expect(rollup.distinction_summary).toContain('2560')
  })
})

describe('formatMembershipDistinctionLines', () => {
  it('orders and labels rows for member card', () => {
    const lines = formatMembershipDistinctionLines([
      {
        id: '2',
        member_id: 'm',
        code: MemberDistinctionCode.outstandingAlumniYear,
        mark_key: '2560',
        label_th: 'ศิษย์เก่าดีเด่น ปี พ.ศ. 2560',
      },
      {
        id: '1',
        member_id: 'm',
        code: MemberDistinctionCode.batchPresident,
        mark_key: '',
        label_th: null,
      },
    ])
    expect(lines[0]).toBe('ประธานรุ่น')
    expect(lines[1]).toBe('ศิษย์เก่าดีเด่น ปี พ.ศ. 2560')
  })
})
