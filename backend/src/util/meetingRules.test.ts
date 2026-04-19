import { describe, expect, it } from 'vitest'
import {
  committeeMotionOutcome,
  committeeQuorumRequired,
  majorityRequired,
  quorumRequired,
} from './meetingRules.js'

describe('meetingRules', () => {
  it('quorum required is ceil(2/3)', () => {
    expect(quorumRequired(35)).toBe(24)
    expect(quorumRequired(5)).toBe(4)
  })

  it('committee quorum is fixed 2/3 of 35', () => {
    expect(committeeQuorumRequired()).toBe(24)
  })

  it('majority required is > 1/2 of attendees', () => {
    expect(majorityRequired(24)).toBe(13)
    expect(majorityRequired(5)).toBe(3)
  })

  it('committee motion: quorum from 35 pool, majority from attendees present', () => {
    const ok = committeeMotionOutcome(24, 13)
    expect(ok.quorumRequired).toBe(24)
    expect(ok.quorumMet).toBe(true)
    expect(ok.majorityRequired).toBe(13)
    expect(ok.approvedByVote).toBe(true)

    const noQuorum = committeeMotionOutcome(23, 20)
    expect(noQuorum.quorumMet).toBe(false)
    expect(noQuorum.approvedByVote).toBe(false)
  })
})
