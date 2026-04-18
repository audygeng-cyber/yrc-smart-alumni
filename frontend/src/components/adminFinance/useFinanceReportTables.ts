import { startTransition, useEffect, useMemo, useState } from 'react'
import { PAGE_SIZE } from '../../lib/adminFinanceConstants'
import { paginateRows } from '../../lib/adminFinanceHelpers'
import {
  nextBatchSortState,
  nextDonorSortState,
  nextEntitySortState,
  nextPlSortState,
} from '../../lib/adminFinanceReportSort'
import type {
  BatchSortKey,
  DonationsReportPayload,
  DonorSortKey,
  EntitySortKey,
  PlSortKey,
  PlSummaryPayload,
  SortDirection,
  TrialBalancePayload,
} from '../../lib/adminFinanceTypes'

export function useFinanceReportTables(
  plSummary: PlSummaryPayload | null,
  donationsReport: DonationsReportPayload | null,
  trialBalance: TrialBalancePayload | null,
  reportKeyword: string,
) {
  const [plSortKey, setPlSortKey] = useState<PlSortKey>('absNet')
  const [plSortDir, setPlSortDir] = useState<SortDirection>('desc')
  const [donorSortKey, setDonorSortKey] = useState<DonorSortKey>('totalAmount')
  const [donorSortDir, setDonorSortDir] = useState<SortDirection>('desc')
  const [batchSortKey, setBatchSortKey] = useState<BatchSortKey>('totalAmount')
  const [batchSortDir, setBatchSortDir] = useState<SortDirection>('desc')
  const [entitySortKey, setEntitySortKey] = useState<EntitySortKey>('totalAmount')
  const [entitySortDir, setEntitySortDir] = useState<SortDirection>('desc')
  const [plPage, setPlPage] = useState(1)
  const [donorPage, setDonorPage] = useState(1)
  const [batchPage, setBatchPage] = useState(1)
  const [entityPage, setEntityPage] = useState(1)

  const reportKeywordNorm = useMemo(() => reportKeyword.trim().toLowerCase(), [reportKeyword])

  const sortArrow = (active: boolean, dir: SortDirection) => (active ? (dir === 'asc' ? ' ↑' : ' ↓') : '')

  const plRows = useMemo(() => {
    const rows = (plSummary?.accountSummaries ?? [])
      .slice()
      .sort((a, b) => {
        if (plSortKey === 'accountCode') return plSortDir === 'asc' ? a.accountCode.localeCompare(b.accountCode) : b.accountCode.localeCompare(a.accountCode)
        if (plSortKey === 'accountName') return plSortDir === 'asc' ? a.accountName.localeCompare(b.accountName) : b.accountName.localeCompare(a.accountName)
        if (plSortKey === 'accountType') return plSortDir === 'asc' ? a.accountType.localeCompare(b.accountType) : b.accountType.localeCompare(a.accountType)
        if (plSortKey === 'net') return plSortDir === 'asc' ? a.net - b.net : b.net - a.net
        const diff = Math.abs(a.net) - Math.abs(b.net)
        return plSortDir === 'asc' ? diff : -diff
      })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) =>
      `${r.accountCode} ${r.accountName} ${r.accountType}`.toLowerCase().includes(reportKeywordNorm),
    )
  }, [plSummary?.accountSummaries, reportKeywordNorm, plSortDir, plSortKey])
  const plPaged = useMemo(() => paginateRows(plRows, plPage, PAGE_SIZE), [plRows, plPage])

  const donorRows = useMemo(() => {
    const rows = (donationsReport?.byDonor ?? []).slice()
    rows.sort((a, b) => {
      if (donorSortKey === 'donorLabel') {
        return donorSortDir === 'asc'
          ? a.donorLabel.localeCompare(b.donorLabel)
          : b.donorLabel.localeCompare(a.donorLabel)
      }
      if (donorSortKey === 'count') return donorSortDir === 'asc' ? a.count - b.count : b.count - a.count
      return donorSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.donorLabel.toLowerCase().includes(reportKeywordNorm))
  }, [donationsReport?.byDonor, donorSortDir, donorSortKey, reportKeywordNorm])
  const donorPaged = useMemo(() => paginateRows(donorRows, donorPage, PAGE_SIZE), [donorRows, donorPage])

  const batchRows = useMemo(() => {
    const rows = (donationsReport?.byBatch ?? []).slice()
    rows.sort((a, b) => {
      if (batchSortKey === 'batch') return batchSortDir === 'asc' ? a.batch.localeCompare(b.batch) : b.batch.localeCompare(a.batch)
      return batchSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.batch.toLowerCase().includes(reportKeywordNorm))
  }, [batchSortDir, batchSortKey, donationsReport?.byBatch, reportKeywordNorm])
  const batchPaged = useMemo(() => paginateRows(batchRows, batchPage, PAGE_SIZE), [batchRows, batchPage])

  const entityRows = useMemo(() => {
    const rows = (donationsReport?.byEntity ?? []).slice()
    rows.sort((a, b) => {
      if (entitySortKey === 'legalEntityCode') {
        return entitySortDir === 'asc'
          ? a.legalEntityCode.localeCompare(b.legalEntityCode)
          : b.legalEntityCode.localeCompare(a.legalEntityCode)
      }
      return entitySortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount
    })
    if (!reportKeywordNorm) return rows
    return rows.filter((r) => r.legalEntityCode.toLowerCase().includes(reportKeywordNorm))
  }, [donationsReport?.byEntity, entitySortDir, entitySortKey, reportKeywordNorm])
  const entityPaged = useMemo(() => paginateRows(entityRows, entityPage, PAGE_SIZE), [entityRows, entityPage])

  const plExportRows = useMemo(
    () =>
      plRows.map((r) => ({
        account_code: r.accountCode,
        account_name: r.accountName,
        account_type: r.accountType,
        debit: r.debit,
        credit: r.credit,
        net: r.net,
      })),
    [plRows],
  )

  const donorExportRows = useMemo(
    () =>
      donorRows.map((r) => ({
        donor: r.donorLabel,
        donation_count: r.count,
        total_amount: r.totalAmount,
      })),
    [donorRows],
  )

  const batchExportRows = useMemo(
    () =>
      batchRows.map((r) => ({
        batch: r.batch,
        total_amount: r.totalAmount,
      })),
    [batchRows],
  )

  const entityExportRows = useMemo(
    () =>
      entityRows.map((r) => ({
        legal_entity_code: r.legalEntityCode,
        total_amount: r.totalAmount,
      })),
    [entityRows],
  )

  const trialBalanceExportRows = useMemo(
    () =>
      (trialBalance?.rows ?? []).map((row) => ({
        legal_entity_code: row.legalEntityCode,
        legal_entity_name: row.legalEntityName,
        account_code: row.accountCode,
        account_name: row.accountName,
        account_type: row.accountType,
        debit: row.debit,
        credit: row.credit,
        net: row.net,
      })),
    [trialBalance?.rows],
  )

  useEffect(() => {
    startTransition(() => {
      setPlPage(1)
      setDonorPage(1)
      setBatchPage(1)
      setEntityPage(1)
    })
  }, [reportKeywordNorm])

  function togglePlSort(nextKey: PlSortKey) {
    const next = nextPlSortState(plSortKey, plSortDir, nextKey)
    setPlSortKey(next.sortKey)
    setPlSortDir(next.sortDir)
  }

  function toggleDonorSort(nextKey: DonorSortKey) {
    const next = nextDonorSortState(donorSortKey, donorSortDir, nextKey)
    setDonorSortKey(next.sortKey)
    setDonorSortDir(next.sortDir)
  }

  function toggleBatchSort(nextKey: BatchSortKey) {
    const next = nextBatchSortState(batchSortKey, batchSortDir, nextKey)
    setBatchSortKey(next.sortKey)
    setBatchSortDir(next.sortDir)
  }

  function toggleEntitySort(nextKey: EntitySortKey) {
    const next = nextEntitySortState(entitySortKey, entitySortDir, nextKey)
    setEntitySortKey(next.sortKey)
    setEntitySortDir(next.sortDir)
  }

  return {
    plSortKey,
    plSortDir,
    donorSortKey,
    donorSortDir,
    batchSortKey,
    batchSortDir,
    entitySortKey,
    entitySortDir,
    setPlPage,
    setDonorPage,
    setBatchPage,
    setEntityPage,
    plPaged,
    donorPaged,
    batchPaged,
    entityPaged,
    plExportRows,
    donorExportRows,
    batchExportRows,
    entityExportRows,
    trialBalanceExportRows,
    sortArrow,
    togglePlSort,
    toggleDonorSort,
    toggleBatchSort,
    toggleEntitySort,
  }
}
