import { describe, expect, it } from 'vitest'
import { distinctionSpecsFromRegistrationData } from './memberDistinctions.js'
import { memberInsertFromRequestedData } from './memberFromRequestedData.js'

describe('memberInsertFromRequestedData', () => {
  it('builds member row without distinction columns', () => {
    const out = memberInsertFromRequestedData('line-uid-1', {
      batch: '2520',
      first_name: 'Somchai',
      last_name: 'Yim',
      batch_president: true,
      outstanding_alumni: 'ใช่',
    })
    expect(out.line_uid).toBe('line-uid-1')
    expect(out).not.toHaveProperty('batch_president')
  })
})

describe('distinctionSpecsFromRegistrationData', () => {
  it('maps registration flags and year/program', () => {
    const specs = distinctionSpecsFromRegistrationData({
      batch_president: true,
      outstanding_alumni: true,
      outstanding_alumni_year: '2560',
      outstanding_program: 'yupparaj_120',
      alumni_base: true,
    })
    expect(specs.map((s) => `${s.code}:${s.mark_key}`).sort()).toEqual(
      [
        'alumni_base:',
        'batch_president:',
        'outstanding_alumni:',
        'outstanding_alumni_year:2560',
        'outstanding_program:yupparaj_120',
      ].sort(),
    )
  })
})
