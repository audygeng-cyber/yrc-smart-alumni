import { describe, expect, it } from 'vitest'
import { buildPostImportSummary } from './postImportSummary.js'

describe('buildPostImportSummary', () => {
  it('aggregates key metrics and duplicate groups', () => {
    const summary = buildPostImportSummary([
      {
        batch: '0507',
        first_name: 'สมชาย',
        last_name: 'ใจดี',
        line_uid: 'U1',
        membership_status: 'Active',
      },
      {
        batch: '0507',
        first_name: 'สมชาย ',
        last_name: ' ใจดี',
        line_uid: 'U2',
        membership_status: 'active',
      },
      {
        batch: '',
        first_name: 'กานดา',
        last_name: '',
        line_uid: 'U2',
        membership_status: 'Inactive',
      },
    ])

    expect(summary.totalRows).toBe(3)
    expect(summary.linkedLineUidRows).toBe(3)
    expect(summary.missingRequiredNameRows).toBe(1)
    expect(summary.activeRows).toBe(2)

    expect(summary.duplicateNameGroups[0]).toEqual({
      key: '0507|สมชาย|ใจดี',
      count: 2,
    })
    expect(summary.duplicateLineUidGroups[0]).toEqual({ key: 'U2', count: 2 })
  })
})
