import { describe, expect, it } from 'vitest'
import {
  inferPurposeCategoryFromText,
  isPaymentPurposeCategory,
  isRoutineExpensePurpose,
  isRoutinePurposeCategory,
  resolveFinanceApprovalPolicy,
} from './financePolicy.js'

describe('resolveFinanceApprovalPolicy', () => {
  it('uses 3-of-5 policy for <= 20,000', () => {
    const p = resolveFinanceApprovalPolicy(20000)
    expect(p.rule).toBe('committee_3of5_upto_20000')
    expect(p.requiredRoleCode).toBe('bank_signer_3of5')
    expect(p.requiredApprovals).toBe(3)
  })

  it('pairs 3-of-5 band with routine-only categories (other is excluded)', () => {
    expect(resolveFinanceApprovalPolicy(10000).rule).toBe('committee_3of5_upto_20000')
    expect(isRoutinePurposeCategory('other')).toBe(false)
    expect(isRoutinePurposeCategory('electricity')).toBe(true)
  })

  it('uses committee-35 policy for > 20,000', () => {
    const p = resolveFinanceApprovalPolicy(20000.01)
    expect(p.rule).toBe('committee_35_over_20000')
    expect(p.requiredRoleCode).toBe('payment_approver')
    expect(p.requiredApprovals).toBe(0)
    expect(p.dynamicMeetingMajority).toBe(true)
  })
})

describe('isRoutineExpensePurpose', () => {
  it('accepts routine office utility purpose', () => {
    expect(isRoutineExpensePurpose('ค่าไฟฟ้าสำนักงาน ประจำเดือน')).toBe(true)
    expect(isRoutineExpensePurpose('ค่าอินเตอร์เนตสำนักงาน')).toBe(true)
    expect(isRoutineExpensePurpose('Office supply for printer')).toBe(true)
  })

  it('rejects non-routine strategic spending purpose', () => {
    expect(isRoutineExpensePurpose('จัดซื้อครุภัณฑ์คอมพิวเตอร์ชุดใหม่')).toBe(false)
    expect(isRoutineExpensePurpose('จัดงานใหญ่ประจำปี')).toBe(false)
    expect(isRoutineExpensePurpose('')).toBe(false)
  })
})

describe('purpose category helpers', () => {
  it('infers category from Thai/English purpose text', () => {
    expect(inferPurposeCategoryFromText('ค่าไฟฟ้าสำนักงาน')).toBe('electricity')
    expect(inferPurposeCategoryFromText('ค่าอินเตอร์เนตสำนักงาน')).toBe('internet')
    expect(inferPurposeCategoryFromText('ค่าแม่บ้านทำความสะอาดประจำเดือน')).toBe('cleaning')
    expect(inferPurposeCategoryFromText('ลงทุนอุปกรณ์ใหม่')).toBe('other')
  })

  it('validates category and routine category set', () => {
    expect(isPaymentPurposeCategory('internet')).toBe(true)
    expect(isPaymentPurposeCategory('unknown')).toBe(false)
    expect(isRoutinePurposeCategory('hospitality')).toBe(true)
    expect(isRoutinePurposeCategory('other')).toBe(false)
  })
})
