import { describe, expect, it } from 'vitest'
import { resolveFinanceApprovalPolicy } from './financePolicy.js'

describe('resolveFinanceApprovalPolicy', () => {
  it('uses 3-of-5 policy for <= 20,000', () => {
    const p = resolveFinanceApprovalPolicy(20000)
    expect(p.rule).toBe('committee_3of5_upto_20000')
    expect(p.requiredRoleCode).toBe('bank_signer_3of5')
    expect(p.requiredApprovals).toBe(3)
  })

  it('uses committee-35 policy for > 20,000', () => {
    const p = resolveFinanceApprovalPolicy(20000.01)
    expect(p.rule).toBe('committee_35_over_20000')
    expect(p.requiredRoleCode).toBe('committee')
    expect(p.requiredApprovals).toBe(0)
    expect(p.dynamicMeetingMajority).toBe(true)
  })
})
