/** API/UI shapes for AdminFinancePanel (mirrors finance admin JSON where applicable). */

export type Props = { apiBase: string }

export type BankSigner = {
  id: string
  signer_name: string
  kbiz_name: string
  in_kbiz: boolean
  active: boolean
}

export type BankAccount = {
  id: string
  legal_entity_id: string
  bank_name: string
  account_name: string
  account_no_masked: string
  signer_pool_size: number
  required_signers: number
  kbiz_enabled: boolean
  signers: BankSigner[]
}

export type PendingPayment = {
  id: string
  legal_entity_id: string
  amount: number
  status: string
}

export type OverviewPayload = {
  entities: { id: string; code: string; name_th: string }[]
  pendingPayments: PendingPayment[]
  donationByBatch: Record<string, number>
  donationByEntity: Record<string, number>
}

export type PlSummaryPayload = {
  totals: { revenue: number; expense: number; netIncome: number }
  accountSummaries: {
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    net: number
  }[]
}

export type DonationsReportPayload = {
  totals: { donations: number; totalAmount: number }
  byBatch: { batch: string; totalAmount: number }[]
  byEntity: { legalEntityCode: string; totalAmount: number }[]
  byDonor: { donorLabel: string; totalAmount: number; count: number }[]
}

export type TrialBalancePayload = {
  journalEntryCount: number
  rows: Array<{
    legalEntityCode: string
    legalEntityName: string
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    net: number
  }>
  totals: {
    totalDebit: number
    totalCredit: number
    revenue: number
    expense: number
    netIncome: number
  }
}

export type FinancePeriodClosingItem = {
  id: string
  legal_entity_code: string
  legal_entity_name: string
  period_from: string
  period_to: string
  closed_at: string
  closed_by: string
  note: string | null
  journal_entry_count: number
  total_debit: number
  total_credit: number
  net_income: number
  auditor_handoff_status: 'pending' | 'sent' | 'completed'
  auditor_sent_at: string | null
  auditor_sent_by: string | null
  auditor_handoff_note: string | null
  auditor_completed_at: string | null
  auditor_completed_by: string | null
  auditor_completed_note: string | null
}

export type FinancePeriodClosingDetail = {
  periodClosing: FinancePeriodClosingItem & {
    created_at?: string
  }
  trialBalanceRows: Array<{
    legalEntityCode: string
    legalEntityName: string
    accountCode: string
    accountName: string
    accountType: string
    debit: number
    credit: number
    net: number
  }>
  integrity: {
    isBalanced: boolean
    balanceDiff: number
    storedMatchesSnapshot: boolean
    snapshotTotalDebit: number
    snapshotTotalCredit: number
  }
}

export type FiscalYearRow = {
  id: string
  legal_entity_code: string
  legal_entity_name: string
  fiscal_label: string
  period_from: string
  period_to: string
  is_closed: boolean
  closed_at: string | null
  closed_by: string | null
  close_note: string | null
  closing_journal_entry_id: string | null
}

export type FixedAssetRow = {
  id: string
  legal_entity_code: string
  legal_entity_name: string
  asset_code: string
  asset_name: string
  purchase_date: string
  cost: number
  residual_value: number
  useful_life_months: number
  active: boolean
  note: string | null
}

export type TaxMonthlyRow = {
  id?: string
  legal_entity_code?: string
  legal_entity_name?: string
  purpose?: string | null
  purpose_category?: string | null
  amount?: number | null
  vat_rate?: number | null
  wht_rate?: number | null
  vat_amount?: number | null
  wht_amount?: number | null
  taxpayer_id?: string | null
  status?: string | null
  requested_at?: string | null
}

export type JournalListItem = {
  id: string
  entry_date: string
  reference_no?: string | null
  memo?: string | null
  status: string
  legal_entity_code?: string
  legal_entity_name?: string
}

export type IncomeStatementPayload = {
  revenueRows: Array<{ accountCode: string; accountName: string; amount: number }>
  expenseRows: Array<{ accountCode: string; accountName: string; amount: number }>
  totals: { revenue: number; expense: number; netIncome: number }
  journalEntryCount: number
}

export type BalanceSheetPayload = {
  assets: Array<{ accountCode: string; accountName: string; balance: number }>
  liabilities: Array<{ accountCode: string; accountName: string; balance: number }>
  equity: Array<{ accountCode: string; accountName: string; balance: number }>
  totals: { assets: number; liabilities: number; equity: number }
  accountingEquation: { left: number; right: number; diff: number; isBalanced: boolean }
  journalEntryCount?: number
}

export type GeneralLedgerPayload = {
  account: { account_code: string; account_name: string; account_type: string }
  rows: Array<{
    entry_date: string
    reference_no: string
    memo: string
    line_description: string
    debit: number
    credit: number
    movement: number
    running_balance: number
  }>
  totals: { debit: number; credit: number; netMovement: number; endingBalance: number }
}

export type MeetingAgendaItem = {
  id: string
  scope: 'association' | 'cram_school'
  title: string
  details: string | null
  status: 'open' | 'closed'
  meeting_session_id: string | null
  created_by: string | null
  created_at: string
}

export type MeetingDocumentItem = {
  id: string
  scope: 'association' | 'cram_school'
  meeting_session_id: string | null
  agenda_id: string | null
  title: string
  document_url: string | null
  document_text: string | null
  uploaded_by: string | null
  published_to_portal: boolean
  created_at: string
  updated_at: string
}

export type SortDirection = 'asc' | 'desc'
export type PlSortKey = 'absNet' | 'accountCode' | 'accountName' | 'accountType' | 'net'
export type DonorSortKey = 'donorLabel' | 'count' | 'totalAmount'
export type BatchSortKey = 'batch' | 'totalAmount'
export type EntitySortKey = 'legalEntityCode' | 'totalAmount'

export type ActivityItem = {
  id: string
  at: string
  atLabel: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export type ActivityLimit = 10 | 20 | 'all'

export type AutoRefreshSettings = {
  enabled: boolean
  seconds: 30 | 60
  alertOnPause: boolean
  soundOnPause: boolean
}
