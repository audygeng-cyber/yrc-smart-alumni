import { normalizeWhitespace } from './normalize.js'

export type PostImportSummaryRow = {
  batch: string | null
  first_name: string | null
  last_name: string | null
  line_uid: string | null
  membership_status: string | null
}

type DuplicateGroup = {
  key: string
  count: number
}

export type PostImportSummary = {
  totalRows: number
  linkedLineUidRows: number
  missingRequiredNameRows: number
  activeRows: number
  duplicateNameGroups: DuplicateGroup[]
  duplicateLineUidGroups: DuplicateGroup[]
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return ''
  return normalizeWhitespace(value)
}

function sortTopGroups(map: Map<string, number>, topN = 20): DuplicateGroup[] {
  return [...map.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([key, count]) => ({ key, count }))
}

export function buildPostImportSummary(rows: PostImportSummaryRow[]): PostImportSummary {
  const duplicateNameMap = new Map<string, number>()
  const duplicateLineUidMap = new Map<string, number>()

  let linkedLineUidRows = 0
  let missingRequiredNameRows = 0
  let activeRows = 0

  for (const row of rows) {
    const batch = normalizeText(row.batch)
    const firstName = normalizeText(row.first_name)
    const lastName = normalizeText(row.last_name)

    if (!batch || !firstName || !lastName) {
      missingRequiredNameRows += 1
    }

    const nameKey = `${batch}|${firstName}|${lastName}`
    duplicateNameMap.set(nameKey, (duplicateNameMap.get(nameKey) ?? 0) + 1)

    const lineUid = normalizeText(row.line_uid)
    if (lineUid) {
      linkedLineUidRows += 1
      duplicateLineUidMap.set(lineUid, (duplicateLineUidMap.get(lineUid) ?? 0) + 1)
    }

    const status = normalizeText(row.membership_status).toLowerCase()
    if (status === 'active') {
      activeRows += 1
    }
  }

  return {
    totalRows: rows.length,
    linkedLineUidRows,
    missingRequiredNameRows,
    activeRows,
    duplicateNameGroups: sortTopGroups(duplicateNameMap),
    duplicateLineUidGroups: sortTopGroups(duplicateLineUidMap),
  }
}
