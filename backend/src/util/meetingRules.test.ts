import { describe, expect, it } from 'vitest'
import { majorityRequired, quorumRequired } from './meetingRules.js'

describe('meetingRules', () => {
  it('quorum required is ceil(2/3)', () => {
    expect(quorumRequired(35)).toBe(24)
    expect(quorumRequired(5)).toBe(4)
  })

  it('majority required is > 1/2 of attendees', () => {
    expect(majorityRequired(24)).toBe(13)
    expect(majorityRequired(5)).toBe(3)
  })
})
