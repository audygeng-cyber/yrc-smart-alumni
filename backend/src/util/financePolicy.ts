export type FinanceApprovalPolicy = {
  rule: 'committee_3of5_upto_20000' | 'committee_35_over_20000'
  requiredRoleCode: 'bank_signer_3of5' | 'payment_approver'
  requiredApprovals: number
  dynamicMeetingMajority?: boolean
}

export type PaymentPurposeCategory =
  | 'electricity'
  | 'water'
  | 'internet'
  | 'staff_wage'
  | 'cleaning'
  | 'office_supply'
  | 'hospitality'
  | 'other'

export const PAYMENT_PURPOSE_CATEGORIES: PaymentPurposeCategory[] = [
  'electricity',
  'water',
  'internet',
  'staff_wage',
  'cleaning',
  'office_supply',
  'hospitality',
  'other',
]

const ROUTINE_PURPOSE_CATEGORY_SET = new Set<PaymentPurposeCategory>([
  'electricity',
  'water',
  'internet',
  'staff_wage',
  'cleaning',
  'office_supply',
  'hospitality',
])

export const ROUTINE_EXPENSE_PURPOSE_KEYWORDS = [
  'ค่าไฟ',
  'ไฟฟ้า',
  'ค่าน้ำ',
  'ประปา',
  'ค่าอินเทอร์เนต',
  'ค่าอินเตอร์เนต',
  'internet',
  'internet service',
  'wifi',
  'ค่าจ้างเจ้าหน้าที่',
  'ค่าเจ้าหน้าที่',
  'เงินเดือน',
  'ค่าจ้าง',
  'ค่าแม่บ้าน',
  'ทำความสะอาด',
  'เครื่องใช้สำนักงาน',
  'เครื่องใช้ประจำสำนักงาน',
  'office supply',
  'ค่าอุปกรณ์สำนักงาน',
  'ค่ารับรอง',
  'hospitality',
] as const

type PurposeKeywordRule = { keyword: string; category: PaymentPurposeCategory }
const PURPOSE_KEYWORD_RULES: PurposeKeywordRule[] = [
  { keyword: 'ค่าไฟ', category: 'electricity' },
  { keyword: 'ไฟฟ้า', category: 'electricity' },
  { keyword: 'ค่าน้ำ', category: 'water' },
  { keyword: 'ประปา', category: 'water' },
  { keyword: 'ค่าอินเทอร์เนต', category: 'internet' },
  { keyword: 'ค่าอินเตอร์เนต', category: 'internet' },
  { keyword: 'internet', category: 'internet' },
  { keyword: 'wifi', category: 'internet' },
  { keyword: 'เงินเดือน', category: 'staff_wage' },
  { keyword: 'ค่าจ้าง', category: 'staff_wage' },
  { keyword: 'ค่าเจ้าหน้าที่', category: 'staff_wage' },
  { keyword: 'ค่าแม่บ้าน', category: 'cleaning' },
  { keyword: 'ทำความสะอาด', category: 'cleaning' },
  { keyword: 'เครื่องใช้สำนักงาน', category: 'office_supply' },
  { keyword: 'เครื่องใช้ประจำสำนักงาน', category: 'office_supply' },
  { keyword: 'office supply', category: 'office_supply' },
  { keyword: 'ค่ารับรอง', category: 'hospitality' },
  { keyword: 'hospitality', category: 'hospitality' },
]

export function isPaymentPurposeCategory(value: string): value is PaymentPurposeCategory {
  return PAYMENT_PURPOSE_CATEGORIES.includes(value as PaymentPurposeCategory)
}

export function isRoutinePurposeCategory(category: PaymentPurposeCategory): boolean {
  return ROUTINE_PURPOSE_CATEGORY_SET.has(category)
}

export function inferPurposeCategoryFromText(purpose: string): PaymentPurposeCategory {
  const normalized = purpose.trim().toLowerCase()
  if (!normalized) return 'other'
  const hit = PURPOSE_KEYWORD_RULES.find((rule) => normalized.includes(rule.keyword.toLowerCase()))
  return hit?.category ?? 'other'
}

export function isRoutineExpensePurpose(purpose: string): boolean {
  return isRoutinePurposeCategory(inferPurposeCategoryFromText(purpose))
}

/**
 * กติกาตามที่กำหนด:
 * - <= 20,000 บาท: กรรมการ 3 ใน 5 (ผู้มีชื่อหลังสมุดบัญชี + active ใน KBiz) สำหรับค่าใช้จ่ายปกติธุระ
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
    requiredRoleCode: 'payment_approver',
    requiredApprovals: 0,
    dynamicMeetingMajority: true,
  }
}
