import type { BatchSortKey, DonorSortKey, EntitySortKey, PlSortKey, SortDirection } from './adminFinanceTypes'

/** คู่คีย์/ทิศทางเรียงหลังคลิกหัวคอลัมน์ (แผงรายงานการเงิน Admin) */
export type ReportSortPair<K extends string> = { sortKey: K; sortDir: SortDirection }

export function nextPlSortState(
  currentKey: PlSortKey,
  currentDir: SortDirection,
  nextKey: PlSortKey,
): ReportSortPair<PlSortKey> {
  if (currentKey === nextKey) {
    return { sortKey: nextKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return {
    sortKey: nextKey,
    sortDir: nextKey === 'absNet' || nextKey === 'net' ? 'desc' : 'asc',
  }
}

export function nextDonorSortState(
  currentKey: DonorSortKey,
  currentDir: SortDirection,
  nextKey: DonorSortKey,
): ReportSortPair<DonorSortKey> {
  if (currentKey === nextKey) {
    return { sortKey: nextKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return {
    sortKey: nextKey,
    sortDir: nextKey === 'donorLabel' ? 'asc' : 'desc',
  }
}

export function nextBatchSortState(
  currentKey: BatchSortKey,
  currentDir: SortDirection,
  nextKey: BatchSortKey,
): ReportSortPair<BatchSortKey> {
  if (currentKey === nextKey) {
    return { sortKey: nextKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return {
    sortKey: nextKey,
    sortDir: nextKey === 'batch' ? 'asc' : 'desc',
  }
}

export function nextEntitySortState(
  currentKey: EntitySortKey,
  currentDir: SortDirection,
  nextKey: EntitySortKey,
): ReportSortPair<EntitySortKey> {
  if (currentKey === nextKey) {
    return { sortKey: nextKey, sortDir: currentDir === 'asc' ? 'desc' : 'asc' }
  }
  return {
    sortKey: nextKey,
    sortDir: nextKey === 'legalEntityCode' ? 'asc' : 'desc',
  }
}
