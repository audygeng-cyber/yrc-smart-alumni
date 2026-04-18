/** Pure helpers for AdminFinancePanel (CSV, pagination, presets, labels). */

export type ReportFilterEntity = '' | 'association' | 'cram_school'

export type ReportPreset = {
  id: string
  name: string
  legalEntityCode: ReportFilterEntity
  from: string
  to: string
  keyword: string
}

export type ActivityFilter = 'all' | 'info' | 'warn' | 'error'

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const activePage = Math.min(safePage, totalPages)
  const start = (activePage - 1) * pageSize
  return {
    pageRows: rows.slice(start, start + pageSize),
    page: activePage,
    totalPages,
  }
}

export function csvEscapeCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsvText(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscapeCell(row[h])).join(','))
  }
  return `\uFEFF${lines.join('\n')}\n`
}

export function formatDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatActivityTimestamp(d: Date): { at: string; atLabel: string } {
  return {
    at: d.toISOString(),
    atLabel: d.toLocaleString('th-TH'),
  }
}

export function formatThNumber(value: number): string {
  return value.toLocaleString('th-TH')
}

export function activityLevelLabel(level: ActivityFilter): string {
  switch (level) {
    case 'all':
      return 'ทั้งหมด'
    case 'info':
      return 'ข้อมูล'
    case 'warn':
      return 'คำเตือน'
    case 'error':
      return 'ข้อผิดพลาด'
    default:
      return level
  }
}

export function buildBuiltinReportPresets(): ReportPreset[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = formatDateInputValue(now)
  const monthStart = formatDateInputValue(new Date(year, month, 1))
  const yearStart = formatDateInputValue(new Date(year, 0, 1))
  return [
    {
      id: 'builtin:association_month',
      name: 'สมาคม เดือนนี้',
      legalEntityCode: 'association',
      from: monthStart,
      to: today,
      keyword: '',
    },
    {
      id: 'builtin:cram_month',
      name: 'กวดวิชา เดือนนี้',
      legalEntityCode: 'cram_school',
      from: monthStart,
      to: today,
      keyword: '',
    },
    {
      id: 'builtin:all_year',
      name: 'ทั้งหมด ปีนี้',
      legalEntityCode: '',
      from: yearStart,
      to: today,
      keyword: '',
    },
  ]
}
