/** Default page size for paginated report tables in AdminFinancePanel. */
export const PAGE_SIZE = 20

/** localStorage keys — finance admin activity / presets (do not rename without migration note). */
export const REPORT_PRESETS_KEY = 'yrc_finance_report_presets_v1'
export const ACTIVITY_LOG_KEY = 'yrc_finance_activity_log_v1'
export const AUTO_REFRESH_SETTINGS_KEY = 'yrc_finance_auto_refresh_settings_v1'
export const ACTIVITY_FILTER_KEY = 'yrc_finance_activity_filter_v1'
export const ACTIVITY_SEARCH_KEY = 'yrc_finance_activity_search_v1'
export const ACTIVITY_LIMIT_KEY = 'yrc_finance_activity_limit_v1'

/** Stop auto-refresh after this many consecutive failures. */
export const AUTO_REFRESH_MAX_FAILURES = 3

/** Quick-filter chips for the activity log (keyword matches log message). */
export const ACTIVITY_SHORTCUTS = [
  { label: 'รีเฟรชอัตโนมัติ', keyword: 'รีเฟรชอัตโนมัติ (Auto refresh)' },
  { label: 'พรีเซ็ต', keyword: 'พรีเซ็ต (preset)' },
  { label: 'รายงาน', keyword: 'โหลดรายงาน' },
  { label: 'ส่งออก', keyword: 'ส่งออก (Export)' },
  { label: 'ประชุม', keyword: 'ประชุม' },
  { label: 'การจ่ายเงิน', keyword: 'คำขอจ่ายเงิน' },
] as const

/** Labels for payment request purpose categories (aligned with backend `purpose_category`). */

export const PAYMENT_PURPOSE_OPTIONS = [
  { value: 'electricity', label: 'ค่าไฟ' },
  { value: 'water', label: 'ประปา' },
  { value: 'internet', label: 'อินเทอร์เนต' },
  { value: 'staff_wage', label: 'ค่าจ้าง/เงินเดือน' },
  { value: 'cleaning', label: 'แม่บ้าน/ทำความสะอาด' },
  { value: 'office_supply', label: 'เครื่องใช้สำนักงาน' },
  { value: 'hospitality', label: 'ค่ารับรอง' },
  { value: 'other', label: 'อื่นๆ' },
] as const

export type PaymentPurposeOption = (typeof PAYMENT_PURPOSE_OPTIONS)[number]
export type PaymentPurposeValue = PaymentPurposeOption['value']
