export type FinanceApprovalPolicy = {
  rule: 'committee_3of5_upto_20000' | 'committee_35_over_20000'
  requiredRoleCode: 'committee_authorized_3of5' | 'committee'
  requiredApprovals: number
}

/**
 * กติกาตามที่กำหนด:
 * - <= 20,000 บาท: ผู้มีอำนาจ 3 ใน 5
 * - > 20,000 บาท: คณะกรรมการ 35 คน
 */
export function resolveFinanceApprovalPolicy(amount: number): FinanceApprovalPolicy {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be positive number')
  }
  if (amount <= 20000) {
    return {
      rule: 'committee_3of5_upto_20000',
      requiredRoleCode: 'committee_authorized_3of5',
      requiredApprovals: 3,
    }
  }
  return {
    rule: 'committee_35_over_20000',
    requiredRoleCode: 'committee',
    requiredApprovals: 35,
  }
}
