export type FinanceApprovalPolicy = {
  rule: 'committee_3of5_upto_20000' | 'committee_35_over_20000'
  requiredRoleCode: 'bank_signer_3of5' | 'committee'
  requiredApprovals: number
  dynamicMeetingMajority?: boolean
}

/**
 * กติกาตามที่กำหนด:
 * - <= 20,000 บาท: ผู้มีอำนาจลงนามบัญชี 3 ใน 5 (มีชื่อใน KBiz)
 * - > 20,000 บาท: คณะกรรมการ 35 คน โดยใช้มติจากผู้เข้าประชุม (เสียง > กึ่งหนึ่ง)
 */
export function resolveFinanceApprovalPolicy(amount: number): FinanceApprovalPolicy {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be positive number')
  }
  if (amount <= 20000) {
    return {
      rule: 'committee_3of5_upto_20000',
      requiredRoleCode: 'bank_signer_3of5',
      requiredApprovals: 3,
    }
  }
  return {
    rule: 'committee_35_over_20000',
    requiredRoleCode: 'committee',
    requiredApprovals: 0,
    dynamicMeetingMajority: true,
  }
}
