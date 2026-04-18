import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import {
  inferPurposeCategoryFromText,
  isPaymentPurposeCategory,
  isRoutinePurposeCategory,
  resolveFinanceApprovalPolicy,
} from '../util/financePolicy.js'
import { canDepreciateInMonth, isMonthKey, monthEndDate, monthlyDepreciationAmount } from '../util/fixedAsset.js'
import { calculateThaiTax, isSupportedVatRate, isSupportedWhtRate } from '../util/tax.js'
import { majorityRequired, quorumRequired } from '../util/meetingRules.js'

export const financeAdminRouter = Router()

type SupabaseClient = ReturnType<typeof getServiceSupabase>

async function getLegalEntity(supabase: SupabaseClient, code: string) {
  const { data, error } = await supabase
    .from('legal_entities')
    .select('id,code,name_th')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  return data
}

async function countMeetingAttendance(supabase: SupabaseClient, meetingSessionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('meeting_attendance')
    .select('id')
    .eq('meeting_session_id', meetingSessionId)
  if (error) throw error
  return (data ?? []).length
}

type MeetingVoteChoice = 'approve' | 'reject' | 'abstain'

type MeetingVoteSummary = {
  approve: number
  reject: number
  abstain: number
  total: number
}

function isMeetingVoteChoice(v: string): v is MeetingVoteChoice {
  return v === 'approve' || v === 'reject' || v === 'abstain'
}

function normalizeOptionalString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

async function getMeetingVoteSummary(supabase: SupabaseClient, agendaId: string): Promise<MeetingVoteSummary> {
  const { data, error } = await supabase.from('meeting_votes').select('vote').eq('agenda_id', agendaId)
  if (error) throw error
  let approve = 0
  let reject = 0
  let abstain = 0
  for (const row of data ?? []) {
    const vote = typeof row.vote === 'string' ? row.vote : ''
    if (vote === 'approve') approve += 1
    else if (vote === 'reject') reject += 1
    else if (vote === 'abstain') abstain += 1
  }
  return { approve, reject, abstain, total: approve + reject + abstain }
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return `\uFEFF${lines.join('\n')}\n`
}

function readDateRangeFromQuery(query: Record<string, unknown>) {
  const fromDate = typeof query.from === 'string' ? query.from.trim() : ''
  const toDate = typeof query.to === 'string' ? query.to.trim() : ''
  return { fromDate, toDate }
}

async function readLegalEntityFilter(
  supabase: SupabaseClient,
  query: Record<string, unknown>,
): Promise<{ legalEntityCode: string; legalEntityId: string | null; error: string | null }> {
  const legalEntityCode = typeof query.legal_entity_code === 'string' ? query.legal_entity_code.trim() : ''
  if (!legalEntityCode) return { legalEntityCode: '', legalEntityId: null, error: null }
  const entity = await getLegalEntity(supabase, legalEntityCode)
  if (!entity) return { legalEntityCode, legalEntityId: null, error: 'ไม่รู้จัก legal_entity_code' }
  return { legalEntityCode, legalEntityId: String(entity.id), error: null }
}

type TrialBalanceRow = {
  accountId: string
  legalEntityCode: string
  legalEntityName: string
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
  net: number
}

type TrialBalanceReport = {
  rows: TrialBalanceRow[]
  journalEntryCount: number
  totals: {
    totalDebit: number
    totalCredit: number
    revenue: number
    expense: number
    netIncome: number
  }
}

type AuditorHandoffStatus = 'pending' | 'sent' | 'completed'

function isAuditorHandoffStatus(value: string): value is AuditorHandoffStatus {
  return value === 'pending' || value === 'sent' || value === 'completed'
}

function isDateOnlyFormat(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeMoneyValue(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.round(parsed * 100) / 100
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

async function buildTrialBalanceReport(
  supabase: SupabaseClient,
  filters: { legalEntityId: string | null; fromDate: string; toDate: string },
): Promise<TrialBalanceReport> {
  const { data: entities, error: entErr } = await supabase.from('legal_entities').select('id,code,name_th')
  if (entErr) throw entErr
  const entityMetaById = new Map<string, { code: string; name: string }>()
  for (const row of entities ?? []) {
    entityMetaById.set(String(row.id), {
      code: String(row.code ?? ''),
      name: String(row.name_th ?? ''),
    })
  }

  let entriesQ = supabase
    .from('journal_entries')
    .select('id,legal_entity_id,entry_date')
    .order('entry_date', { ascending: true })
  if (filters.legalEntityId) entriesQ = entriesQ.eq('legal_entity_id', filters.legalEntityId)
  if (filters.fromDate) entriesQ = entriesQ.gte('entry_date', filters.fromDate)
  if (filters.toDate) entriesQ = entriesQ.lte('entry_date', filters.toDate)
  const { data: entries, error: entryErr } = await entriesQ
  if (entryErr) throw entryErr
  const entryRows =
    (entries as Array<{ id: string; legal_entity_id?: string | null; entry_date?: string | null }> | null) ?? []
  if (entryRows.length === 0) {
    return {
      rows: [],
      journalEntryCount: 0,
      totals: { totalDebit: 0, totalCredit: 0, revenue: 0, expense: 0, netIncome: 0 },
    }
  }

  const entryIds = entryRows.map((row) => String(row.id))
  const entryEntityById = new Map<string, string>()
  for (const row of entryRows) {
    entryEntityById.set(String(row.id), String(row.legal_entity_id ?? ''))
  }

  const { data: lines, error: lineErr } = await supabase
    .from('journal_lines')
    .select('journal_entry_id,account_id,debit,credit')
    .in('journal_entry_id', entryIds)
  if (lineErr) throw lineErr

  let chartQ = supabase.from('account_chart').select('id,legal_entity_id,account_code,account_name,account_type')
  if (filters.legalEntityId) chartQ = chartQ.eq('legal_entity_id', filters.legalEntityId)
  const { data: chartRows, error: chartErr } = await chartQ
  if (chartErr) throw chartErr
  const accountById = new Map<string, { legalEntityId: string; accountCode: string; accountName: string; accountType: string }>()
  for (const row of chartRows ?? []) {
    accountById.set(String(row.id), {
      legalEntityId: String(row.legal_entity_id ?? ''),
      accountCode: String(row.account_code ?? ''),
      accountName: String(row.account_name ?? ''),
      accountType: String(row.account_type ?? ''),
    })
  }

  const aggByAccount = new Map<
    string,
    {
      legalEntityCode: string
      legalEntityName: string
      accountId: string
      accountCode: string
      accountName: string
      accountType: string
      debit: number
      credit: number
    }
  >()
  for (const line of lines ?? []) {
    const entryId = String(line.journal_entry_id ?? '')
    const entityId = entryEntityById.get(entryId) ?? ''
    if (!entityId) continue
    const accountId = String(line.account_id ?? '')
    const account = accountById.get(accountId)
    if (!account) continue
    const entityMeta = entityMetaById.get(entityId) ?? { code: '', name: '' }
    const key = `${entityId}:${accountId}`
    const cur = aggByAccount.get(key) ?? {
      legalEntityCode: entityMeta.code,
      legalEntityName: entityMeta.name,
      accountId,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      debit: 0,
      credit: 0,
    }
    cur.debit += Number(line.debit ?? 0)
    cur.credit += Number(line.credit ?? 0)
    aggByAccount.set(key, cur)
  }

  const rows: TrialBalanceRow[] = Array.from(aggByAccount.values())
    .map((row) => {
      const net =
        row.accountType === 'asset' || row.accountType === 'expense'
          ? row.debit - row.credit
          : row.credit - row.debit
      return { ...row, net }
    })
    .sort((a, b) => {
      const byEntity = a.legalEntityCode.localeCompare(b.legalEntityCode)
      if (byEntity !== 0) return byEntity
      return a.accountCode.localeCompare(b.accountCode)
    })

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0)
  const revenue = rows.filter((row) => row.accountType === 'revenue').reduce((sum, row) => sum + row.net, 0)
  const expense = rows.filter((row) => row.accountType === 'expense').reduce((sum, row) => sum + row.net, 0)
  return {
    rows,
    journalEntryCount: entryRows.length,
    totals: {
      totalDebit,
      totalCredit,
      revenue,
      expense,
      netIncome: revenue - expense,
    },
  }
}

function buildYearEndClosingLines(
  trialBalanceRows: TrialBalanceRow[],
  accumulatedSurplusAccountId: string,
): {
  lines: Array<{ account_id: string; debit: number; credit: number; description: string }>
  totals: { debit: number; credit: number }
} {
  const lines: Array<{ account_id: string; debit: number; credit: number; description: string }> = []
  let totalDebit = 0
  let totalCredit = 0

  const addLine = (line: { account_id: string; debit: number; credit: number; description: string }) => {
    const debit = roundMoney(line.debit)
    const credit = roundMoney(line.credit)
    if (debit <= 0 && credit <= 0) return
    lines.push({ ...line, debit, credit })
    totalDebit += debit
    totalCredit += credit
  }

  for (const row of trialBalanceRows) {
    const amount = roundMoney(row.net)
    if (Math.abs(amount) < 0.005) continue
    if (row.accountType === 'revenue') {
      if (amount > 0) {
        addLine({
          account_id: row.accountId,
          debit: amount,
          credit: 0,
          description: `ปิดบัญชีรายได้ ${row.accountCode}`,
        })
      } else {
        addLine({
          account_id: row.accountId,
          debit: 0,
          credit: Math.abs(amount),
          description: `ปิดบัญชีรายได้ ${row.accountCode}`,
        })
      }
    } else if (row.accountType === 'expense') {
      if (amount > 0) {
        addLine({
          account_id: row.accountId,
          debit: 0,
          credit: amount,
          description: `ปิดบัญชีค่าใช้จ่าย ${row.accountCode}`,
        })
      } else {
        addLine({
          account_id: row.accountId,
          debit: Math.abs(amount),
          credit: 0,
          description: `ปิดบัญชีค่าใช้จ่าย ${row.accountCode}`,
        })
      }
    }
  }

  const debitDiff = roundMoney(totalDebit - totalCredit)
  if (debitDiff > 0) {
    addLine({
      account_id: accumulatedSurplusAccountId,
      debit: 0,
      credit: debitDiff,
      description: 'โอนผลต่างเข้ากองทุนสะสมปลายปี',
    })
  } else if (debitDiff < 0) {
    addLine({
      account_id: accumulatedSurplusAccountId,
      debit: Math.abs(debitDiff),
      credit: 0,
      description: 'โอนผลต่างเข้ากองทุนสะสมปลายปี',
    })
  }

  return {
    lines,
    totals: {
      debit: roundMoney(totalDebit + Math.max(0, -debitDiff)),
      credit: roundMoney(totalCredit + Math.max(0, debitDiff)),
    },
  }
}

financeAdminRouter.get('/bank-accounts', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.query.legal_entity_code === 'string' ? req.query.legal_entity_code.trim() : ''
    const supabase = getServiceSupabase()

    let accountsQuery = supabase
      .from('bank_accounts')
      .select(
        'id, legal_entity_id, bank_name, account_name, account_no_masked, signer_pool_size, required_signers, kbiz_enabled, created_at',
      )
      .order('created_at', { ascending: true })

    if (legalEntityCode) {
      const entity = await getLegalEntity(supabase, legalEntityCode)
      if (!entity) {
        res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
        return
      }
      accountsQuery = accountsQuery.eq('legal_entity_id', entity.id)
    }

    const { data: accounts, error: accErr } = await accountsQuery
    if (accErr) {
      res.status(500).json({ error: 'โหลด bank_accounts ไม่สำเร็จ', details: accErr })
      return
    }

    const accountIds = (accounts ?? []).map((a) => String(a.id))
    const signersByAccount: Record<string, unknown[]> = {}
    if (accountIds.length > 0) {
      const { data: signers, error: signErr } = await supabase
        .from('bank_account_signers')
        .select('id,bank_account_id,signer_name,kbiz_name,in_kbiz,active')
        .in('bank_account_id', accountIds)
        .order('signer_name', { ascending: true })
      if (signErr) {
        res.status(500).json({ error: 'โหลด bank_account_signers ไม่สำเร็จ', details: signErr })
        return
      }
      for (const s of signers ?? []) {
        const key = String(s.bank_account_id)
        if (!signersByAccount[key]) signersByAccount[key] = []
        signersByAccount[key]!.push(s)
      }
    }

    res.json({
      ok: true,
      accounts: (accounts ?? []).map((a) => ({
        ...a,
        signers: signersByAccount[String(a.id)] ?? [],
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/overview', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: entities, error: entErr } = await supabase.from('legal_entities').select('id,code,name_th')
    if (entErr) {
      res.status(500).json({ error: 'โหลด legal_entities ไม่สำเร็จ', details: entErr })
      return
    }

    const { data: pending, error: pendErr } = await supabase
      .from('payment_requests')
      .select('id,legal_entity_id,amount,status')
      .eq('status', 'pending')
    if (pendErr) {
      res.status(500).json({ error: 'โหลด payment_requests ไม่สำเร็จ', details: pendErr })
      return
    }

    const { data: donations, error: donErr } = await supabase
      .from('donations')
      .select('id,batch,amount,legal_entity_id')
    if (donErr) {
      res.status(500).json({ error: 'โหลด donations ไม่สำเร็จ', details: donErr })
      return
    }

    const donationByBatch: Record<string, number> = {}
    const donationByEntity: Record<string, number> = {}
    for (const d of donations ?? []) {
      const b = typeof d.batch === 'string' && d.batch.trim() ? d.batch.trim() : '(ไม่ระบุรุ่น)'
      const a = Number(d.amount ?? 0)
      donationByBatch[b] = (donationByBatch[b] ?? 0) + a
      const e = String(d.legal_entity_id ?? '(unknown)')
      donationByEntity[e] = (donationByEntity[e] ?? 0) + a
    }

    res.json({
      ok: true,
      entities: entities ?? [],
      pendingPayments: pending ?? [],
      donationByBatch,
      donationByEntity,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/pl-summary', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }

    let entriesQ = supabase.from('journal_entries').select('id,legal_entity_id,entry_date')
    if (legalEntityId) entriesQ = entriesQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) entriesQ = entriesQ.gte('entry_date', fromDate)
    if (toDate) entriesQ = entriesQ.lte('entry_date', toDate)

    const { data: entries, error: eErr } = await entriesQ
    if (eErr) {
      res.status(500).json({ error: 'โหลด journal_entries ไม่สำเร็จ', details: eErr })
      return
    }

    const entryIds = (entries ?? []).map((e) => String(e.id))
    if (entryIds.length === 0) {
      res.json({
        ok: true,
        accountSummaries: [],
        totals: { revenue: 0, expense: 0, netIncome: 0 },
      })
      return
    }

    const { data: lines, error: lErr } = await supabase
      .from('journal_lines')
      .select('account_id,debit,credit,journal_entry_id')
      .in('journal_entry_id', entryIds)
    if (lErr) {
      res.status(500).json({ error: 'โหลด journal_lines ไม่สำเร็จ', details: lErr })
      return
    }

    let chartQ = supabase.from('account_chart').select('id,legal_entity_id,account_code,account_name,account_type')
    if (legalEntityId) chartQ = chartQ.eq('legal_entity_id', legalEntityId)
    const { data: chart, error: cErr } = await chartQ
    if (cErr) {
      res.status(500).json({ error: 'โหลด account_chart ไม่สำเร็จ', details: cErr })
      return
    }

    const accountMap = new Map<string, { code: string; name: string; type: string }>()
    for (const a of chart ?? []) {
      accountMap.set(String(a.id), {
        code: String(a.account_code ?? ''),
        name: String(a.account_name ?? ''),
        type: String(a.account_type ?? ''),
      })
    }

    const byAccount = new Map<
      string,
      { accountCode: string; accountName: string; accountType: string; debit: number; credit: number; net: number }
    >()
    for (const ln of lines ?? []) {
      const accountId = String(ln.account_id)
      const meta = accountMap.get(accountId)
      if (!meta) continue
      const d = Number(ln.debit ?? 0)
      const c = Number(ln.credit ?? 0)
      const key = accountId
      const cur = byAccount.get(key) ?? {
        accountCode: meta.code,
        accountName: meta.name,
        accountType: meta.type,
        debit: 0,
        credit: 0,
        net: 0,
      }
      cur.debit += d
      cur.credit += c
      byAccount.set(key, cur)
    }

    const accountSummaries = Array.from(byAccount.values()).map((x) => {
      let net = x.credit - x.debit
      if (x.accountType === 'expense' || x.accountType === 'asset') {
        net = x.debit - x.credit
      }
      return { ...x, net }
    })

    const revenue = accountSummaries
      .filter((x) => x.accountType === 'revenue')
      .reduce((s, x) => s + x.net, 0)
    const expense = accountSummaries
      .filter((x) => x.accountType === 'expense')
      .reduce((s, x) => s + x.net, 0)

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        from: fromDate || null,
        to: toDate || null,
      },
      accountSummaries,
      totals: {
        revenue,
        expense,
        netIncome: revenue - expense,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/donations', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const req = _req
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    const { data: entities, error: eErr } = await supabase.from('legal_entities').select('id,code,name_th')
    if (eErr) {
      res.status(500).json({ error: 'โหลด legal_entities ไม่สำเร็จ', details: eErr })
      return
    }
    const entityCodeById = new Map<string, string>()
    for (const e of entities ?? []) entityCodeById.set(String(e.id), String(e.code))

    let donationsQ = supabase
      .from('donations')
      .select('id,legal_entity_id,batch,amount,member_id,app_user_id,created_at')
      .order('created_at', { ascending: false })
    if (legalEntityId) donationsQ = donationsQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) donationsQ = donationsQ.gte('created_at', `${fromDate}T00:00:00.000Z`)
    if (toDate) donationsQ = donationsQ.lte('created_at', `${toDate}T23:59:59.999Z`)
    const { data: donations, error: dErr } = await donationsQ
    if (dErr) {
      res.status(500).json({ error: 'โหลด donations ไม่สำเร็จ', details: dErr })
      return
    }

    const memberIds = Array.from(
      new Set((donations ?? []).map((d) => (d.member_id == null ? '' : String(d.member_id))).filter(Boolean)),
    )
    const memberNameById = new Map<string, string>()
    if (memberIds.length > 0) {
      const { data: members, error: mErr } = await supabase
        .from('members')
        .select('id,first_name,last_name,batch')
        .in('id', memberIds)
      if (mErr) {
        res.status(500).json({ error: 'โหลดข้อมูลสมาชิกสำหรับ donations ไม่สำเร็จ', details: mErr })
        return
      }
      for (const m of members ?? []) {
        const name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || '(ไม่ทราบชื่อ)'
        const batch = m.batch ? ` รุ่น ${m.batch}` : ''
        memberNameById.set(String(m.id), `${name}${batch}`)
      }
    }

    const byBatch = new Map<string, number>()
    const byEntity = new Map<string, number>()
    const byDonor = new Map<string, { donorLabel: string; totalAmount: number; count: number }>()
    for (const d of donations ?? []) {
      const amount = Number(d.amount ?? 0)
      const batch = typeof d.batch === 'string' && d.batch.trim() ? d.batch.trim() : '(ไม่ระบุรุ่น)'
      byBatch.set(batch, (byBatch.get(batch) ?? 0) + amount)

      const eId = String(d.legal_entity_id ?? '')
      const eCode = entityCodeById.get(eId) ?? '(unknown)'
      byEntity.set(eCode, (byEntity.get(eCode) ?? 0) + amount)

      const memberId = d.member_id == null ? '' : String(d.member_id)
      const donorKey = memberId || (d.app_user_id == null ? '' : String(d.app_user_id)) || `donation:${String(d.id)}`
      const donorLabel = memberId
        ? memberNameById.get(memberId) ?? `member:${memberId.slice(0, 8)}`
        : d.app_user_id
          ? `app_user:${String(d.app_user_id).slice(0, 8)}`
          : 'unknown'
      const cur = byDonor.get(donorKey) ?? { donorLabel, totalAmount: 0, count: 0 }
      cur.totalAmount += amount
      cur.count += 1
      byDonor.set(donorKey, cur)
    }

    const byBatchRows = Array.from(byBatch.entries())
      .map(([batch, totalAmount]) => ({ batch, totalAmount }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
    const byEntityRows = Array.from(byEntity.entries())
      .map(([legalEntityCode, totalAmount]) => ({ legalEntityCode, totalAmount }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
    const byDonorRows = Array.from(byDonor.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        from: fromDate || null,
        to: toDate || null,
      },
      totals: {
        donations: (donations ?? []).length,
        totalAmount: (donations ?? []).reduce((s, d) => s + Number(d.amount ?? 0), 0),
      },
      byBatch: byBatchRows,
      byEntity: byEntityRows,
      byDonor: byDonorRows,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/exports/donations.csv', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error: filterErr } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (filterErr) {
      res.status(400).json({ error: filterErr })
      return
    }
    const { data: entities } = await supabase.from('legal_entities').select('id,code')
    const entityCodeById = new Map<string, string>()
    for (const e of entities ?? []) entityCodeById.set(String(e.id), String(e.code))

    let donationsQ = supabase
      .from('donations')
      .select('id,created_at,legal_entity_id,batch,amount,member_id,app_user_id,slip_file_url,note')
      .order('created_at', { ascending: false })
    if (legalEntityId) donationsQ = donationsQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) donationsQ = donationsQ.gte('created_at', `${fromDate}T00:00:00.000Z`)
    if (toDate) donationsQ = donationsQ.lte('created_at', `${toDate}T23:59:59.999Z`)
    const { data: donations, error } = await donationsQ
    if (error) {
      res.status(500).json({ error: 'โหลด donations ไม่สำเร็จ', details: error })
      return
    }

    const rows = (donations ?? []).map((d) => ({
      donation_id: d.id,
      created_at: d.created_at,
      legal_entity_code: entityCodeById.get(String(d.legal_entity_id ?? '')) ?? '',
      batch: d.batch,
      amount: d.amount,
      member_id: d.member_id,
      app_user_id: d.app_user_id,
      slip_file_url: d.slip_file_url,
      note: d.note,
      filter_legal_entity_code: legalEntityCode || '',
      filter_from: fromDate || '',
      filter_to: toDate || '',
    }))
    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="finance-donations.csv"')
    res.send(csv)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/exports/payment-requests.csv', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error: filterErr } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (filterErr) {
      res.status(400).json({ error: filterErr })
      return
    }
    const { data: entities } = await supabase.from('legal_entities').select('id,code')
    const entityCodeById = new Map<string, string>()
    for (const e of entities ?? []) entityCodeById.set(String(e.id), String(e.code))

    let paymentQ = supabase
      .from('payment_requests')
      .select(
        'id,requested_at,legal_entity_id,bank_account_id,meeting_session_id,journal_entry_id,purpose,purpose_category,amount,currency,vat_rate,wht_rate,vat_amount,wht_amount,taxpayer_id,approval_rule,required_role_code,required_approvals,status,requested_by,kbiz_transfer_ref,transfer_slip_file_url,note',
      )
      .order('requested_at', { ascending: false })
    if (legalEntityId) paymentQ = paymentQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) paymentQ = paymentQ.gte('requested_at', `${fromDate}T00:00:00.000Z`)
    if (toDate) paymentQ = paymentQ.lte('requested_at', `${toDate}T23:59:59.999Z`)
    const { data: reqs, error } = await paymentQ
    if (error) {
      res.status(500).json({ error: 'โหลด payment_requests ไม่สำเร็จ', details: error })
      return
    }

    const rows = (reqs ?? []).map((r) => ({
      payment_request_id: r.id,
      requested_at: r.requested_at,
      legal_entity_code: entityCodeById.get(String(r.legal_entity_id ?? '')) ?? '',
      bank_account_id: r.bank_account_id,
      meeting_session_id: r.meeting_session_id,
      journal_entry_id: r.journal_entry_id,
      purpose: r.purpose,
      purpose_category: r.purpose_category,
      amount: r.amount,
      currency: r.currency,
      vat_rate: r.vat_rate,
      wht_rate: r.wht_rate,
      vat_amount: r.vat_amount,
      wht_amount: r.wht_amount,
      taxpayer_id: r.taxpayer_id,
      approval_rule: r.approval_rule,
      required_role_code: r.required_role_code,
      required_approvals: r.required_approvals,
      status: r.status,
      requested_by: r.requested_by,
      kbiz_transfer_ref: r.kbiz_transfer_ref,
      transfer_slip_file_url: r.transfer_slip_file_url,
      note: r.note,
      filter_legal_entity_code: legalEntityCode || '',
      filter_from: fromDate || '',
      filter_to: toDate || '',
    }))
    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="finance-payment-requests.csv"')
    res.send(csv)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/exports/meeting-sessions.csv', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error: filterErr } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (filterErr) {
      res.status(400).json({ error: filterErr })
      return
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code')
    const entityCodeById = new Map<string, string>()
    for (const e of entities ?? []) entityCodeById.set(String(e.id), String(e.code))

    let sessionsQ = supabase
      .from('meeting_sessions')
      .select('id,legal_entity_id,title,expected_participants,meeting_at,created_by,created_at')
      .order('created_at', { ascending: false })
    if (legalEntityId) sessionsQ = sessionsQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) sessionsQ = sessionsQ.gte('created_at', `${fromDate}T00:00:00.000Z`)
    if (toDate) sessionsQ = sessionsQ.lte('created_at', `${toDate}T23:59:59.999Z`)
    const { data: sessions, error: sErr } = await sessionsQ
    if (sErr) {
      res.status(500).json({ error: 'โหลด meeting_sessions ไม่สำเร็จ', details: sErr })
      return
    }

    const sessionIds = (sessions ?? []).map((s) => String(s.id))
    const attendeesBySession = new Map<string, number>()
    if (sessionIds.length > 0) {
      const { data: attendance, error: aErr } = await supabase
        .from('meeting_attendance')
        .select('meeting_session_id')
        .in('meeting_session_id', sessionIds)
      if (aErr) {
        res.status(500).json({ error: 'โหลด meeting_attendance ไม่สำเร็จ', details: aErr })
        return
      }
      for (const a of attendance ?? []) {
        const key = String(a.meeting_session_id)
        attendeesBySession.set(key, (attendeesBySession.get(key) ?? 0) + 1)
      }
    }

    const rows = (sessions ?? []).map((s) => {
      const expected = Number(s.expected_participants ?? 0)
      const attendees = attendeesBySession.get(String(s.id)) ?? 0
      const quorumNeed = quorumRequired(expected)
      const majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
      return {
        meeting_session_id: s.id,
        legal_entity_code: entityCodeById.get(String(s.legal_entity_id ?? '')) ?? '',
        title: s.title,
        meeting_at: s.meeting_at,
        expected_participants: expected,
        attendees,
        quorum_required: quorumNeed,
        quorum_met: attendees >= quorumNeed,
        majority_required: majorityNeed,
        created_by: s.created_by,
        created_at: s.created_at,
        filter_legal_entity_code: legalEntityCode || '',
        filter_from: fromDate || '',
        filter_to: toDate || '',
      }
    })

    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="finance-meeting-sessions.csv"')
    res.send(csv)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/journals', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const statusFilter =
      statusRaw === 'draft' || statusRaw === 'posted' || statusRaw === 'voided' ? statusRaw : ''

    let query = supabase
      .from('journal_entries')
      .select(
        'id,legal_entity_id,entry_date,reference_no,memo,source_type,source_id,status,posted_at,posted_by,voided_at,voided_by,void_reason,reversed_from_journal_id,created_by,created_at',
      )
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (legalEntityId) query = query.eq('legal_entity_id', legalEntityId)
    if (fromDate) query = query.gte('entry_date', fromDate)
    if (toDate) query = query.lte('entry_date', toDate)
    if (statusFilter) query = query.eq('status', statusFilter)
    const { data: entries, error: eErr } = await query
    if (eErr) {
      res.status(500).json({ error: 'โหลดสมุดรายวันไม่สำเร็จ', details: eErr })
      return
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityCodeById = new Map<string, string>()
    const entityNameById = new Map<string, string>()
    for (const entity of entities ?? []) {
      const id = String(entity.id)
      entityCodeById.set(id, String(entity.code ?? ''))
      entityNameById.set(id, String(entity.name_th ?? ''))
    }

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        status: statusFilter || null,
        from: fromDate || null,
        to: toDate || null,
      },
      journals: (entries ?? []).map((row) => {
        const entityId = String(row.legal_entity_id ?? '')
        return {
          ...row,
          legal_entity_code: entityCodeById.get(entityId) ?? '',
          legal_entity_name: entityNameById.get(entityId) ?? '',
        }
      }),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/journals/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: journal, error: jErr } = await supabase
      .from('journal_entries')
      .select(
        'id,legal_entity_id,entry_date,reference_no,memo,source_type,source_id,status,posted_at,posted_by,voided_at,voided_by,void_reason,reversed_from_journal_id,created_by,created_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (jErr || !journal) {
      res.status(jErr ? 500 : 404).json({ error: jErr ? 'โหลดเอกสารสมุดรายวันไม่สำเร็จ' : 'ไม่พบเอกสารสมุดรายวัน', details: jErr })
      return
    }
    const { data: lines, error: lErr } = await supabase
      .from('journal_lines')
      .select('id,journal_entry_id,account_id,debit,credit,description')
      .eq('journal_entry_id', id)
      .order('id', { ascending: true })
    if (lErr) {
      res.status(500).json({ error: 'โหลดรายการบัญชีไม่สำเร็จ', details: lErr })
      return
    }
    const accountIds = Array.from(
      new Set((lines ?? []).map((line) => (line.account_id == null ? '' : String(line.account_id))).filter(Boolean)),
    )
    const accountById = new Map<string, { code: string; name: string; type: string }>()
    if (accountIds.length > 0) {
      const { data: accounts } = await supabase
        .from('account_chart')
        .select('id,account_code,account_name,account_type')
        .in('id', accountIds)
      for (const account of accounts ?? []) {
        accountById.set(String(account.id), {
          code: String(account.account_code ?? ''),
          name: String(account.account_name ?? ''),
          type: String(account.account_type ?? ''),
        })
      }
    }
    const totalDebit = (lines ?? []).reduce((sum, line) => sum + Number(line.debit ?? 0), 0)
    const totalCredit = (lines ?? []).reduce((sum, line) => sum + Number(line.credit ?? 0), 0)
    res.json({
      ok: true,
      journal,
      lines: (lines ?? []).map((line) => {
        const account = accountById.get(String(line.account_id ?? ''))
        return {
          ...line,
          account_code: account?.code ?? '',
          account_name: account?.name ?? '',
          account_type: account?.type ?? '',
        }
      }),
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.005,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/journals', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const entryDate = typeof req.body?.entry_date === 'string' ? req.body.entry_date.trim() : ''
    const referenceNo = normalizeOptionalString(req.body?.reference_no)
    const memo = normalizeOptionalString(req.body?.memo)
    const sourceType = normalizeOptionalString(req.body?.source_type)
    const sourceId = normalizeOptionalString(req.body?.source_id)
    const createdBy = normalizeOptionalString(req.body?.created_by) ?? 'finance-admin'
    if (!legalEntityCode || !entryDate || !isDateOnlyFormat(entryDate)) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code และ entry_date (YYYY-MM-DD)' })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legalEntityCode)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }

    const { data: journal, error: insertErr } = await supabase
      .from('journal_entries')
      .insert({
        legal_entity_id: entity.id,
        entry_date: entryDate,
        reference_no: referenceNo,
        memo,
        source_type: sourceType,
        source_id: sourceId,
        status: 'draft',
        created_by: createdBy,
      })
      .select(
        'id,legal_entity_id,entry_date,reference_no,memo,source_type,source_id,status,created_by,created_at',
      )
      .maybeSingle()
    if (insertErr || !journal) {
      res.status(500).json({ error: 'สร้างเอกสารสมุดรายวันไม่สำเร็จ', details: insertErr })
      return
    }
    await supabase.from('audit_logs').insert({
      actor: createdBy,
      action: 'journal.create_draft',
      target_table: 'journal_entries',
      target_id: journal.id,
      payload: {
        legal_entity_code: legalEntityCode,
        entry_date: entryDate,
      },
    })
    res.status(201).json({ ok: true, journal: { ...journal, legal_entity_code: legalEntityCode } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/journals/:id/lines', async (req, res) => {
  try {
    const id = req.params.id
    const accountCode = typeof req.body?.account_code === 'string' ? req.body.account_code.trim() : ''
    const debitAmount = normalizeMoneyValue(req.body?.debit_amount)
    const creditAmount = normalizeMoneyValue(req.body?.credit_amount)
    const description = normalizeOptionalString(req.body?.description)
    const actor = normalizeOptionalString(req.body?.actor) ?? 'finance-admin'
    if (!id || !accountCode) {
      res.status(400).json({ error: 'ต้องระบุ id และ account_code' })
      return
    }
    const isValidSide =
      (debitAmount > 0 && creditAmount === 0) || (creditAmount > 0 && debitAmount === 0)
    if (!isValidSide) {
      res.status(400).json({ error: 'ต้องกรอกเฉพาะ debit_amount หรือ credit_amount อย่างใดอย่างหนึ่ง และต้องมากกว่า 0' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: journal, error: journalErr } = await supabase
      .from('journal_entries')
      .select('id,legal_entity_id,status')
      .eq('id', id)
      .maybeSingle()
    if (journalErr || !journal) {
      res.status(journalErr ? 500 : 404).json({
        error: journalErr ? 'โหลดเอกสารสมุดรายวันไม่สำเร็จ' : 'ไม่พบเอกสารสมุดรายวัน',
        details: journalErr,
      })
      return
    }
    if (journal.status !== 'draft') {
      res.status(409).json({ error: 'เพิ่มรายการได้เฉพาะเอกสารสถานะ draft' })
      return
    }
    const { data: account, error: accountErr } = await supabase
      .from('account_chart')
      .select('id,account_code')
      .eq('legal_entity_id', journal.legal_entity_id)
      .eq('account_code', accountCode)
      .maybeSingle()
    if (accountErr || !account) {
      res.status(accountErr ? 500 : 404).json({
        error: accountErr ? 'โหลดผังบัญชีไม่สำเร็จ' : 'ไม่พบ account_code ในนิติบุคคลนี้',
        details: accountErr,
      })
      return
    }
    const { data: line, error: lineErr } = await supabase
      .from('journal_lines')
      .insert({
        journal_entry_id: id,
        account_id: account.id,
        debit: debitAmount,
        credit: creditAmount,
        description,
      })
      .select('id,journal_entry_id,account_id,debit,credit,description')
      .maybeSingle()
    if (lineErr || !line) {
      res.status(500).json({ error: 'เพิ่มรายการบัญชีไม่สำเร็จ', details: lineErr })
      return
    }
    await supabase.from('audit_logs').insert({
      actor,
      action: 'journal.add_line',
      target_table: 'journal_entries',
      target_id: id,
      payload: {
        account_code: accountCode,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
      },
    })
    res.status(201).json({ ok: true, line, account_code: accountCode })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/journals/:id/post', async (req, res) => {
  try {
    const id = req.params.id
    const postedBy = normalizeOptionalString(req.body?.posted_by) ?? 'finance-admin'
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: journal, error: journalErr } = await supabase
      .from('journal_entries')
      .select('id,status')
      .eq('id', id)
      .maybeSingle()
    if (journalErr || !journal) {
      res.status(journalErr ? 500 : 404).json({
        error: journalErr ? 'โหลดเอกสารสมุดรายวันไม่สำเร็จ' : 'ไม่พบเอกสารสมุดรายวัน',
        details: journalErr,
      })
      return
    }
    if (journal.status !== 'draft') {
      res.status(409).json({ error: 'โพสต์ได้เฉพาะเอกสารสถานะ draft' })
      return
    }
    const { data: updated, error: updateErr } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: postedBy,
        posted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id,status,posted_at,posted_by')
      .maybeSingle()
    if (updateErr || !updated) {
      res.status(500).json({ error: 'โพสต์เอกสารสมุดรายวันไม่สำเร็จ', details: updateErr })
      return
    }
    await supabase.from('audit_logs').insert({
      actor: postedBy,
      action: 'journal.post',
      target_table: 'journal_entries',
      target_id: id,
      payload: { posted_by: postedBy },
    })
    res.json({ ok: true, journal: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/journals/:id/void', async (req, res) => {
  try {
    const id = req.params.id
    const voidedBy = normalizeOptionalString(req.body?.voided_by) ?? 'finance-admin'
    const reason = normalizeOptionalString(req.body?.reason)
    if (!id || !reason) {
      res.status(400).json({ error: 'ต้องระบุ id และ reason' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: journal, error: journalErr } = await supabase
      .from('journal_entries')
      .select('id,legal_entity_id,entry_date,reference_no,memo,source_type,source_id,status,created_by')
      .eq('id', id)
      .maybeSingle()
    if (journalErr || !journal) {
      res.status(journalErr ? 500 : 404).json({
        error: journalErr ? 'โหลดเอกสารสมุดรายวันไม่สำเร็จ' : 'ไม่พบเอกสารสมุดรายวัน',
        details: journalErr,
      })
      return
    }
    if (journal.status !== 'posted') {
      res.status(409).json({ error: 'ยกเลิกได้เฉพาะเอกสารสถานะ posted' })
      return
    }
    const { data: lines, error: linesErr } = await supabase
      .from('journal_lines')
      .select('id,account_id,debit,credit,description')
      .eq('journal_entry_id', id)
    if (linesErr || !lines?.length) {
      res.status(linesErr ? 500 : 400).json({
        error: linesErr ? 'โหลดรายการบัญชีไม่สำเร็จ' : 'ไม่พบรายการบัญชีสำหรับกลับรายการ',
        details: linesErr,
      })
      return
    }

    const reversalReference = journal.reference_no
      ? `REV-${String(journal.reference_no).slice(0, 32)}`
      : `REV-${String(id).slice(0, 8)}`
    const { data: reversalHeader, error: reversalHeaderErr } = await supabase
      .from('journal_entries')
      .insert({
        legal_entity_id: journal.legal_entity_id,
        entry_date: journal.entry_date,
        reference_no: reversalReference,
        memo: `กลับรายการจาก ${id}: ${reason}`,
        source_type: 'reversing_entry',
        source_id: id,
        status: 'draft',
        created_by: voidedBy,
      })
      .select('id,status')
      .maybeSingle()
    if (reversalHeaderErr || !reversalHeader) {
      res.status(500).json({ error: 'สร้างหัวเอกสารกลับรายการไม่สำเร็จ', details: reversalHeaderErr })
      return
    }

    const reversalLines = lines.map((line) => ({
      journal_entry_id: reversalHeader.id,
      account_id: line.account_id,
      debit: Number(line.credit ?? 0),
      credit: Number(line.debit ?? 0),
      description: line.description ?? `reversal:${id}`,
    }))
    const { error: reversalLinesErr } = await supabase.from('journal_lines').insert(reversalLines)
    if (reversalLinesErr) {
      res.status(500).json({ error: 'สร้างรายการกลับรายการไม่สำเร็จ', details: reversalLinesErr })
      return
    }
    const { error: postReversalErr } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: voidedBy,
        posted_at: new Date().toISOString(),
      })
      .eq('id', reversalHeader.id)
    if (postReversalErr) {
      res.status(500).json({ error: 'โพสต์เอกสารกลับรายการไม่สำเร็จ', details: postReversalErr })
      return
    }
    const { data: voided, error: voidErr } = await supabase
      .from('journal_entries')
      .update({
        status: 'voided',
        voided_by: voidedBy,
        voided_at: new Date().toISOString(),
        void_reason: reason,
        reversed_from_journal_id: reversalHeader.id,
      })
      .eq('id', id)
      .select('id,status,voided_at,voided_by,void_reason,reversed_from_journal_id')
      .maybeSingle()
    if (voidErr || !voided) {
      res.status(500).json({ error: 'อัปเดตสถานะยกเลิกเอกสารไม่สำเร็จ', details: voidErr })
      return
    }
    await supabase.from('audit_logs').insert([
      {
        actor: voidedBy,
        action: 'journal.void_with_reversal',
        target_table: 'journal_entries',
        target_id: id,
        payload: {
          reason,
          reversal_journal_id: reversalHeader.id,
        },
      },
      {
        actor: voidedBy,
        action: 'journal.reversal_created',
        target_table: 'journal_entries',
        target_id: reversalHeader.id,
        payload: {
          from_journal_id: id,
        },
      },
    ])
    res.json({
      ok: true,
      voidedJournal: voided,
      reversalJournal: {
        id: reversalHeader.id,
        status: 'posted',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/trial-balance', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }

    const report = await buildTrialBalanceReport(supabase, {
      legalEntityId,
      fromDate,
      toDate,
    })

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        from: fromDate || null,
        to: toDate || null,
      },
      journalEntryCount: report.journalEntryCount,
      rows: report.rows,
      totals: report.totals,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/general-ledger', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    const accountCode = typeof req.query.account_code === 'string' ? req.query.account_code.trim() : ''
    if (!accountCode) {
      res.status(400).json({ error: 'ต้องระบุ account_code เพื่อดูสมุดบัญชีแยกประเภท' })
      return
    }

    let accountQuery = supabase
      .from('account_chart')
      .select('id,legal_entity_id,account_code,account_name,account_type')
      .eq('account_code', accountCode)
    if (legalEntityId) accountQuery = accountQuery.eq('legal_entity_id', legalEntityId)
    const { data: accounts, error: accountErr } = await accountQuery
    if (accountErr) {
      res.status(500).json({ error: 'โหลดผังบัญชีไม่สำเร็จ', details: accountErr })
      return
    }
    if (!accounts?.length) {
      res.status(404).json({ error: 'ไม่พบบัญชีตาม account_code ที่ระบุ' })
      return
    }
    if (!legalEntityId && accounts.length > 1) {
      res.status(400).json({ error: 'พบ account_code ซ้ำหลายหน่วยงาน กรุณาระบุ legal_entity_code เพิ่มเติม' })
      return
    }
    const account = accounts[0]
    const accountIds = accounts.map((row) => String(row.id))

    let entriesQ = supabase
      .from('journal_entries')
      .select('id,legal_entity_id,entry_date,reference_no,memo,created_at')
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (legalEntityId) entriesQ = entriesQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) entriesQ = entriesQ.gte('entry_date', fromDate)
    if (toDate) entriesQ = entriesQ.lte('entry_date', toDate)
    const { data: entries, error: entryErr } = await entriesQ
    if (entryErr) {
      res.status(500).json({ error: 'โหลด journal_entries ไม่สำเร็จ', details: entryErr })
      return
    }
    const entryRows =
      (entries as Array<{
        id: string
        legal_entity_id?: string | null
        entry_date?: string | null
        reference_no?: string | null
        memo?: string | null
        created_at?: string | null
      }> | null) ?? []
    const entryIds = entryRows.map((row) => String(row.id))
    if (!entryIds.length) {
      res.json({
        ok: true,
        filters: {
          legal_entity_code: legalEntityCode || null,
          account_code: accountCode,
          from: fromDate || null,
          to: toDate || null,
        },
        account: {
          account_code: account.account_code,
          account_name: account.account_name,
          account_type: account.account_type,
        },
        rows: [],
        totals: {
          debit: 0,
          credit: 0,
          netMovement: 0,
          endingBalance: 0,
        },
      })
      return
    }

    const entryById = new Map<string, (typeof entryRows)[number]>()
    for (const row of entryRows) entryById.set(String(row.id), row)

    const { data: lines, error: lineErr } = await supabase
      .from('journal_lines')
      .select('id,journal_entry_id,account_id,debit,credit,description')
      .in('journal_entry_id', entryIds)
      .in('account_id', accountIds)
    if (lineErr) {
      res.status(500).json({ error: 'โหลด journal_lines ไม่สำเร็จ', details: lineErr })
      return
    }

    const normalDebitSide = account.account_type === 'asset' || account.account_type === 'expense'
    const ledgerRows = (lines ?? [])
      .map((line) => {
        const entry = entryById.get(String(line.journal_entry_id ?? ''))
        return {
          lineId: String(line.id ?? ''),
          journalEntryId: String(line.journal_entry_id ?? ''),
          entryDate: String(entry?.entry_date ?? ''),
          createdAt: String(entry?.created_at ?? ''),
          referenceNo: String(entry?.reference_no ?? ''),
          memo: String(entry?.memo ?? ''),
          lineDescription: String(line.description ?? ''),
          debit: Number(line.debit ?? 0),
          credit: Number(line.credit ?? 0),
        }
      })
      .sort((a, b) => {
        const byDate = a.entryDate.localeCompare(b.entryDate)
        if (byDate !== 0) return byDate
        const byCreated = a.createdAt.localeCompare(b.createdAt)
        if (byCreated !== 0) return byCreated
        return a.lineId.localeCompare(b.lineId)
      })

    let runningBalance = 0
    const rows = ledgerRows.map((row) => {
      const delta = normalDebitSide ? row.debit - row.credit : row.credit - row.debit
      runningBalance += delta
      return {
        journal_entry_id: row.journalEntryId,
        entry_date: row.entryDate,
        reference_no: row.referenceNo,
        memo: row.memo,
        line_description: row.lineDescription,
        debit: row.debit,
        credit: row.credit,
        movement: delta,
        running_balance: runningBalance,
      }
    })

    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0)
    const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0)
    const netMovement = rows.reduce((sum, row) => sum + row.movement, 0)

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        account_code: accountCode,
        from: fromDate || null,
        to: toDate || null,
      },
      account: {
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
      },
      rows,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        netMovement,
        endingBalance: runningBalance,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/income-statement', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }

    const report = await buildTrialBalanceReport(supabase, {
      legalEntityId,
      fromDate,
      toDate,
    })
    const revenueRows = report.rows
      .filter((row) => row.accountType === 'revenue')
      .map((row) => ({
        accountCode: row.accountCode,
        accountName: row.accountName,
        amount: row.net,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
    const expenseRows = report.rows
      .filter((row) => row.accountType === 'expense')
      .map((row) => ({
        accountCode: row.accountCode,
        accountName: row.accountName,
        amount: row.net,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    const totalRevenue = revenueRows.reduce((sum, row) => sum + row.amount, 0)
    const totalExpense = expenseRows.reduce((sum, row) => sum + row.amount, 0)

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        from: fromDate || null,
        to: toDate || null,
      },
      revenueRows,
      expenseRows,
      totals: {
        revenue: totalRevenue,
        expense: totalExpense,
        netIncome: totalRevenue - totalExpense,
      },
      journalEntryCount: report.journalEntryCount,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/balance-sheet', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    const asOfRaw = typeof req.query.as_of === 'string' ? req.query.as_of.trim() : ''
    if (asOfRaw && !isDateOnlyFormat(asOfRaw)) {
      res.status(400).json({ error: 'as_of ต้องอยู่ในรูปแบบ YYYY-MM-DD' })
      return
    }

    const report = await buildTrialBalanceReport(supabase, {
      legalEntityId,
      fromDate: '',
      toDate: asOfRaw,
    })

    const assets = report.rows
      .filter((row) => row.accountType === 'asset')
      .map((row) => ({
        accountCode: row.accountCode,
        accountName: row.accountName,
        balance: row.net,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
    const liabilities = report.rows
      .filter((row) => row.accountType === 'liability')
      .map((row) => ({
        accountCode: row.accountCode,
        accountName: row.accountName,
        balance: row.net,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
    const equity = report.rows
      .filter((row) => row.accountType === 'equity')
      .map((row) => ({
        accountCode: row.accountCode,
        accountName: row.accountName,
        balance: row.net,
      }))
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0)
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0)
    const totalEquity = equity.reduce((sum, row) => sum + row.balance, 0)
    const equationDiff = totalAssets - (totalLiabilities + totalEquity)

    res.json({
      ok: true,
      filters: {
        legal_entity_code: legalEntityCode || null,
        as_of: asOfRaw || null,
      },
      assets,
      liabilities,
      equity,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
      },
      accountingEquation: {
        left: totalAssets,
        right: totalLiabilities + totalEquity,
        diff: equationDiff,
        isBalanced: Math.abs(equationDiff) < 0.005,
      },
      journalEntryCount: report.journalEntryCount,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/tax/calculate', async (req, res) => {
  try {
    const baseAmount = Number(req.body?.base_amount)
    const vatRate = Number(req.body?.vat_rate ?? 0)
    const whtRate = Number(req.body?.wht_rate ?? 0)
    const result = calculateThaiTax({ baseAmount, vatRate, whtRate })
    res.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(400).json({ error: message })
  }
})

financeAdminRouter.get('/reports/tax-monthly', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const month = typeof req.query.month === 'string' ? req.query.month.trim() : ''
    if (!isMonthKey(month)) {
      res.status(400).json({ error: 'month ต้องอยู่ในรูปแบบ YYYY-MM' })
      return
    }
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    const periodFrom = `${month}-01`
    const periodTo = monthEndDate(month)

    let query = supabase
      .from('payment_requests')
      .select('id,purpose,purpose_category,amount,vat_rate,wht_rate,vat_amount,wht_amount,taxpayer_id,status,requested_at,legal_entity_id')
      .gte('requested_at', `${periodFrom}T00:00:00.000Z`)
      .lte('requested_at', `${periodTo}T23:59:59.999Z`)
      .order('requested_at', { ascending: false })
    if (legalEntityId) query = query.eq('legal_entity_id', legalEntityId)
    const { data, error: qErr } = await query
    if (qErr) {
      res.status(500).json({ error: 'โหลดข้อมูลภาษีรายเดือนไม่สำเร็จ', details: qErr })
      return
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityById = new Map<string, { code: string; name: string }>()
    for (const entity of entities ?? []) {
      entityById.set(String(entity.id), { code: String(entity.code ?? ''), name: String(entity.name_th ?? '') })
    }

    const rows = (data ?? []).map((row) => {
      const meta = entityById.get(String(row.legal_entity_id ?? '')) ?? { code: '', name: '' }
      return {
        ...row,
        legal_entity_code: meta.code,
        legal_entity_name: meta.name,
      }
    })
    const totalBaseAmount = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    const totalVatAmount = rows.reduce((sum, row) => sum + Number(row.vat_amount ?? 0), 0)
    const totalWhtAmount = rows.reduce((sum, row) => sum + Number(row.wht_amount ?? 0), 0)

    res.json({
      ok: true,
      filters: {
        month,
        legal_entity_code: legalEntityCode || null,
      },
      totals: {
        base_amount: roundMoney(totalBaseAmount),
        vat_amount: roundMoney(totalVatAmount),
        wht_amount: roundMoney(totalWhtAmount),
      },
      rows,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/exports/auditor-package.csv', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { fromDate, toDate } = readDateRangeFromQuery(req.query as Record<string, unknown>)
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityMetaById = new Map<string, { code: string; name: string }>()
    for (const row of entities ?? []) {
      entityMetaById.set(String(row.id), {
        code: String(row.code ?? ''),
        name: String(row.name_th ?? ''),
      })
    }

    let entriesQ = supabase
      .from('journal_entries')
      .select('id,legal_entity_id,entry_date,reference_no,memo,source_type,source_id,created_by,created_at')
      .order('entry_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (legalEntityId) entriesQ = entriesQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) entriesQ = entriesQ.gte('entry_date', fromDate)
    if (toDate) entriesQ = entriesQ.lte('entry_date', toDate)
    const { data: entries, error: entryErr } = await entriesQ
    if (entryErr) {
      res.status(500).json({ error: 'โหลด journal_entries ไม่สำเร็จ', details: entryErr })
      return
    }
    const entryRows =
      (entries as Array<{
        id: string
        legal_entity_id?: string | null
        entry_date?: string | null
        reference_no?: string | null
        memo?: string | null
        source_type?: string | null
        source_id?: string | null
        created_by?: string | null
        created_at?: string | null
      }> | null) ?? []
    const entryIds = entryRows.map((row) => String(row.id))

    const entryById = new Map<string, (typeof entryRows)[number]>()
    for (const row of entryRows) entryById.set(String(row.id), row)

    let chartQ = supabase.from('account_chart').select('id,account_code,account_name,account_type')
    if (legalEntityId) chartQ = chartQ.eq('legal_entity_id', legalEntityId)
    const { data: chartRows, error: chartErr } = await chartQ
    if (chartErr) {
      res.status(500).json({ error: 'โหลด account_chart ไม่สำเร็จ', details: chartErr })
      return
    }
    const accountById = new Map<string, { code: string; name: string; type: string }>()
    for (const row of chartRows ?? []) {
      accountById.set(String(row.id), {
        code: String(row.account_code ?? ''),
        name: String(row.account_name ?? ''),
        type: String(row.account_type ?? ''),
      })
    }

    const lineRows =
      entryIds.length > 0
        ? await supabase
            .from('journal_lines')
            .select('id,journal_entry_id,account_id,debit,credit,description')
            .in('journal_entry_id', entryIds)
        : { data: [], error: null }
    if (lineRows.error) {
      res.status(500).json({ error: 'โหลด journal_lines ไม่สำเร็จ', details: lineRows.error })
      return
    }

    const rows = ((lineRows.data ?? []) as Array<{
      id: string
      journal_entry_id: string
      account_id: string
      debit?: number | null
      credit?: number | null
      description?: string | null
    }>).map((line) => {
      const entry = entryById.get(String(line.journal_entry_id))
      const legalEntityIdValue = String(entry?.legal_entity_id ?? '')
      const entityMeta = entityMetaById.get(legalEntityIdValue) ?? { code: '', name: '' }
      const account = accountById.get(String(line.account_id)) ?? { code: '', name: '', type: '' }
      return {
        legal_entity_code: entityMeta.code,
        legal_entity_name: entityMeta.name,
        journal_entry_id: entry?.id ?? '',
        entry_date: entry?.entry_date ?? '',
        reference_no: entry?.reference_no ?? '',
        memo: entry?.memo ?? '',
        source_type: entry?.source_type ?? '',
        source_id: entry?.source_id ?? '',
        line_id: line.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        line_description: line.description ?? '',
        created_by: entry?.created_by ?? '',
        created_at: entry?.created_at ?? '',
        filter_legal_entity_code: legalEntityCode || '',
        filter_from: fromDate || '',
        filter_to: toDate || '',
      }
    })
    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="finance-auditor-package.csv"')
    res.send(csv)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/fixed-assets', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { legalEntityCode, legalEntityId, error } = await readLegalEntityFilter(
      supabase,
      req.query as Record<string, unknown>,
    )
    if (error) {
      res.status(400).json({ error })
      return
    }
    let query = supabase
      .from('fixed_assets')
      .select(
        'id,legal_entity_id,asset_code,asset_name,purchase_date,cost,residual_value,useful_life_months,depreciation_account_id,accumulated_depreciation_account_id,active,note,created_by,created_at,updated_at',
      )
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (legalEntityId) query = query.eq('legal_entity_id', legalEntityId)
    const { data, error: qErr } = await query
    if (qErr) {
      res.status(500).json({ error: 'โหลดทะเบียนสินทรัพย์ไม่สำเร็จ', details: qErr })
      return
    }
    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityById = new Map<string, { code: string; name: string }>()
    for (const entity of entities ?? []) {
      entityById.set(String(entity.id), { code: String(entity.code ?? ''), name: String(entity.name_th ?? '') })
    }
    const rows = (data ?? []).map((row) => {
      const meta = entityById.get(String(row.legal_entity_id ?? '')) ?? { code: '', name: '' }
      return {
        ...row,
        legal_entity_code: meta.code,
        legal_entity_name: meta.name,
      }
    })
    res.json({ ok: true, filters: { legal_entity_code: legalEntityCode || null }, rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/fixed-assets', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const assetCode = normalizeOptionalString(req.body?.asset_code)
    const assetName = normalizeOptionalString(req.body?.asset_name)
    const purchaseDate = typeof req.body?.purchase_date === 'string' ? req.body.purchase_date.trim() : ''
    const cost = Number(req.body?.cost)
    const residualValue = Number(req.body?.residual_value ?? 0)
    const usefulLifeMonths = Number(req.body?.useful_life_months)
    const depreciationAccountCode = normalizeOptionalString(req.body?.depreciation_account_code)
    const accumulatedDepreciationAccountCode = normalizeOptionalString(req.body?.accumulated_depreciation_account_code)
    const note = normalizeOptionalString(req.body?.note)
    const createdBy = normalizeOptionalString(req.body?.created_by) ?? 'finance-admin'

    if (
      !legalEntityCode ||
      !assetCode ||
      !assetName ||
      !isDateOnlyFormat(purchaseDate) ||
      !Number.isFinite(cost) ||
      cost <= 0 ||
      !Number.isFinite(residualValue) ||
      residualValue < 0 ||
      residualValue > cost ||
      !Number.isFinite(usefulLifeMonths) ||
      usefulLifeMonths <= 0 ||
      !depreciationAccountCode ||
      !accumulatedDepreciationAccountCode
    ) {
      res.status(400).json({
        error:
          'ต้องระบุ legal_entity_code, asset_code, asset_name, purchase_date, cost, useful_life_months, depreciation_account_code, accumulated_depreciation_account_code ให้ถูกต้อง',
      })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legalEntityCode)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }
    const legalEntityId = String(entity.id)

    const { data: depAccount, error: depErr } = await supabase
      .from('account_chart')
      .select('id,account_code')
      .eq('legal_entity_id', legalEntityId)
      .eq('account_code', depreciationAccountCode)
      .eq('account_type', 'expense')
      .maybeSingle()
    if (depErr || !depAccount) {
      res.status(depErr ? 500 : 400).json({
        error: depErr ? 'ค้นหาบัญชีค่าเสื่อมไม่สำเร็จ' : 'ไม่พบบัญชีค่าเสื่อม (expense) ตามรหัสที่ระบุ',
        details: depErr,
      })
      return
    }
    const { data: accumAccount, error: accumErr } = await supabase
      .from('account_chart')
      .select('id,account_code')
      .eq('legal_entity_id', legalEntityId)
      .eq('account_code', accumulatedDepreciationAccountCode)
      .eq('account_type', 'asset')
      .maybeSingle()
    if (accumErr || !accumAccount) {
      res.status(accumErr ? 500 : 400).json({
        error: accumErr ? 'ค้นหาบัญชีค่าเสื่อมสะสมไม่สำเร็จ' : 'ไม่พบบัญชีค่าเสื่อมสะสม (asset) ตามรหัสที่ระบุ',
        details: accumErr,
      })
      return
    }

    const { data, error } = await supabase
      .from('fixed_assets')
      .insert({
        legal_entity_id: legalEntityId,
        asset_code: assetCode,
        asset_name: assetName,
        purchase_date: purchaseDate,
        cost: roundMoney(cost),
        residual_value: roundMoney(residualValue),
        useful_life_months: Math.floor(usefulLifeMonths),
        depreciation_account_id: depAccount.id,
        accumulated_depreciation_account_id: accumAccount.id,
        note,
        created_by: createdBy,
      })
      .select(
        'id,legal_entity_id,asset_code,asset_name,purchase_date,cost,residual_value,useful_life_months,depreciation_account_id,accumulated_depreciation_account_id,active,note,created_by,created_at,updated_at',
      )
      .maybeSingle()
    if (error || !data) {
      res.status(500).json({ error: 'สร้างทะเบียนสินทรัพย์ไม่สำเร็จ', details: error })
      return
    }
    await supabase.from('audit_logs').insert({
      actor: createdBy,
      action: 'fixed_asset.create',
      target_table: 'fixed_assets',
      target_id: data.id,
      payload: { legal_entity_code: legalEntityCode, asset_code: assetCode },
    })
    res.status(201).json({ ok: true, fixedAsset: { ...data, legal_entity_code: legalEntityCode } })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/fixed-assets/run-depreciation', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const month = typeof req.body?.month === 'string' ? req.body.month.trim() : ''
    const postedBy = normalizeOptionalString(req.body?.posted_by) ?? 'finance-admin'
    if (!legalEntityCode || !isMonthKey(month)) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code และ month (YYYY-MM)' })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legalEntityCode)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }
    const legalEntityId = String(entity.id)

    const { data: assets, error: assetsErr } = await supabase
      .from('fixed_assets')
      .select(
        'id,asset_code,asset_name,purchase_date,cost,residual_value,useful_life_months,depreciation_account_id,accumulated_depreciation_account_id,active',
      )
      .eq('legal_entity_id', legalEntityId)
      .eq('active', true)
      .order('purchase_date', { ascending: true })
    if (assetsErr) {
      res.status(500).json({ error: 'โหลดทะเบียนสินทรัพย์ไม่สำเร็จ', details: assetsErr })
      return
    }
    if (!assets?.length) {
      res.json({ ok: true, posted: false, reason: 'ไม่มีสินทรัพย์ที่ active สำหรับหน่วยงานนี้', month })
      return
    }

    const assetIds = assets.map((asset) => String(asset.id))
    const { data: postedRows, error: postedErr } = await supabase
      .from('fixed_asset_depreciations')
      .select('id,fixed_asset_id,month_key')
      .in('fixed_asset_id', assetIds)
    if (postedErr) {
      res.status(500).json({ error: 'โหลดประวัติค่าเสื่อมไม่สำเร็จ', details: postedErr })
      return
    }
    const postedCountByAsset = new Map<string, number>()
    const postedThisMonthSet = new Set<string>()
    for (const row of postedRows ?? []) {
      const assetId = String(row.fixed_asset_id ?? '')
      postedCountByAsset.set(assetId, (postedCountByAsset.get(assetId) ?? 0) + 1)
      if (row.month_key === month) postedThisMonthSet.add(assetId)
    }

    const journalLines: Array<{ account_id: string; debit: number; credit: number; description: string }> = []
    const depRecords: Array<{ fixed_asset_id: string; month_key: string; amount: number; created_by: string }> = []

    for (const asset of assets) {
      const assetId = String(asset.id)
      if (postedThisMonthSet.has(assetId)) continue
      const postedCount = postedCountByAsset.get(assetId) ?? 0
      const calcAsset = {
        purchaseDate: String(asset.purchase_date ?? ''),
        cost: Number(asset.cost ?? 0),
        residualValue: Number(asset.residual_value ?? 0),
        usefulLifeMonths: Number(asset.useful_life_months ?? 0),
      }
      if (!canDepreciateInMonth(calcAsset, month, postedCount)) continue
      const amount = monthlyDepreciationAmount(calcAsset)
      if (amount <= 0) continue

      const depAccountId = String(asset.depreciation_account_id ?? '')
      const accumAccountId = String(asset.accumulated_depreciation_account_id ?? '')
      if (!depAccountId || !accumAccountId) continue

      journalLines.push({
        account_id: depAccountId,
        debit: amount,
        credit: 0,
        description: `ค่าเสื่อม ${String(asset.asset_code ?? '')} ${month}`,
      })
      journalLines.push({
        account_id: accumAccountId,
        debit: 0,
        credit: amount,
        description: `ค่าเสื่อมสะสม ${String(asset.asset_code ?? '')} ${month}`,
      })
      depRecords.push({
        fixed_asset_id: assetId,
        month_key: month,
        amount,
        created_by: postedBy,
      })
    }

    if (depRecords.length === 0) {
      res.json({ ok: true, posted: false, reason: 'ไม่มีรายการค่าเสื่อมใหม่ในเดือนนี้', month, legal_entity_code: legalEntityCode })
      return
    }

    const referenceNo = `DEP-${month.replace('-', '')}-${String(legalEntityId).slice(0, 4)}`
    const { data: journalHeader, error: headerErr } = await supabase
      .from('journal_entries')
      .insert({
        legal_entity_id: legalEntityId,
        entry_date: `${month}-01`,
        reference_no: referenceNo,
        memo: `บันทึกค่าเสื่อมประจำเดือน ${month}`,
        source_type: 'fixed_asset_depreciation',
        source_id: null,
        status: 'draft',
        created_by: postedBy,
      })
      .select('id')
      .maybeSingle()
    if (headerErr || !journalHeader) {
      res.status(500).json({ error: 'สร้างหัวเอกสารค่าเสื่อมไม่สำเร็จ', details: headerErr })
      return
    }
    const journalEntryId = String(journalHeader.id)

    const { error: insertLinesErr } = await supabase.from('journal_lines').insert(
      journalLines.map((line) => ({
        journal_entry_id: journalEntryId,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      })),
    )
    if (insertLinesErr) {
      res.status(500).json({ error: 'สร้างบรรทัดค่าเสื่อมไม่สำเร็จ', details: insertLinesErr })
      return
    }
    const { error: postErr } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: postedBy,
        posted_at: new Date().toISOString(),
      })
      .eq('id', journalEntryId)
    if (postErr) {
      res.status(500).json({ error: 'โพสต์เอกสารค่าเสื่อมไม่สำเร็จ', details: postErr })
      return
    }
    const { error: depInsertErr } = await supabase.from('fixed_asset_depreciations').insert(
      depRecords.map((row) => ({
        ...row,
        journal_entry_id: journalEntryId,
      })),
    )
    if (depInsertErr) {
      res.status(500).json({ error: 'บันทึกประวัติค่าเสื่อมไม่สำเร็จ', details: depInsertErr })
      return
    }
    await supabase.from('audit_logs').insert({
      actor: postedBy,
      action: 'fixed_asset.run_depreciation',
      target_table: 'journal_entries',
      target_id: journalEntryId,
      payload: {
        legal_entity_code: legalEntityCode,
        month,
        asset_count: depRecords.length,
      },
    })

    res.json({
      ok: true,
      posted: true,
      legal_entity_code: legalEntityCode,
      month,
      journal_entry_id: journalEntryId,
      asset_count: depRecords.length,
      total_amount: roundMoney(depRecords.reduce((sum, row) => sum + row.amount, 0)),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/fiscal-years', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const legalEntityCode =
      typeof req.query.legal_entity_code === 'string' ? req.query.legal_entity_code.trim() : ''
    let legalEntityId: string | null = null
    if (legalEntityCode) {
      const entity = await getLegalEntity(supabase, legalEntityCode)
      if (!entity) {
        res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
        return
      }
      legalEntityId = String(entity.id)
    }

    let query = supabase
      .from('fiscal_years')
      .select(
        'id,legal_entity_id,fiscal_label,period_from,period_to,is_closed,closed_at,closed_by,close_note,closing_journal_entry_id,created_at,updated_at',
      )
      .order('period_to', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)
    if (legalEntityId) query = query.eq('legal_entity_id', legalEntityId)
    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: 'โหลดรอบปีบัญชีไม่สำเร็จ', details: error })
      return
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityMetaById = new Map<string, { code: string; name: string }>()
    for (const row of entities ?? []) {
      entityMetaById.set(String(row.id), { code: String(row.code ?? ''), name: String(row.name_th ?? '') })
    }
    const rows = (data ?? []).map((row) => {
      const meta = entityMetaById.get(String(row.legal_entity_id ?? '')) ?? { code: '', name: '' }
      return {
        ...row,
        legal_entity_code: meta.code,
        legal_entity_name: meta.name,
      }
    })
    res.json({ ok: true, rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/fiscal-years', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const periodFrom = typeof req.body?.period_from === 'string' ? req.body.period_from.trim() : ''
    const periodTo = typeof req.body?.period_to === 'string' ? req.body.period_to.trim() : ''
    const fiscalLabelInput = normalizeOptionalString(req.body?.fiscal_label)
    if (!legalEntityCode || !isDateOnlyFormat(periodFrom) || !isDateOnlyFormat(periodTo) || periodFrom > periodTo) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code และ period_from/period_to ให้ถูกต้อง (YYYY-MM-DD)' })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legalEntityCode)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }
    const legalEntityId = String(entity.id)
    const fiscalLabel = fiscalLabelInput ?? `FY ${periodFrom} - ${periodTo}`

    const { data, error } = await supabase
      .from('fiscal_years')
      .insert({
        legal_entity_id: legalEntityId,
        fiscal_label: fiscalLabel,
        period_from: periodFrom,
        period_to: periodTo,
      })
      .select(
        'id,legal_entity_id,fiscal_label,period_from,period_to,is_closed,closed_at,closed_by,close_note,closing_journal_entry_id,created_at,updated_at',
      )
      .maybeSingle()
    if (error || !data) {
      res.status(500).json({ error: 'สร้างรอบปีบัญชีไม่สำเร็จ', details: error })
      return
    }
    res.status(201).json({
      ok: true,
      fiscalYear: {
        ...data,
        legal_entity_code: legalEntityCode,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/fiscal-years/:id/close', async (req, res) => {
  try {
    const id = req.params.id
    const closedBy = normalizeOptionalString(req.body?.closed_by) ?? 'finance-admin'
    const closeNote = normalizeOptionalString(req.body?.close_note)
    const accumulatedSurplusAccountCode =
      normalizeOptionalString(req.body?.accumulated_surplus_account_code) ?? '3110'
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: fiscalYear, error: fiscalErr } = await supabase
      .from('fiscal_years')
      .select('id,legal_entity_id,fiscal_label,period_from,period_to,is_closed')
      .eq('id', id)
      .maybeSingle()
    if (fiscalErr || !fiscalYear) {
      res.status(fiscalErr ? 500 : 404).json({
        error: fiscalErr ? 'โหลดรอบปีบัญชีไม่สำเร็จ' : 'ไม่พบรอบปีบัญชี',
        details: fiscalErr,
      })
      return
    }
    if (fiscalYear.is_closed) {
      res.status(409).json({ error: 'รอบปีบัญชีนี้ถูกปิดแล้ว' })
      return
    }

    const legalEntityId = String(fiscalYear.legal_entity_id ?? '')
    const { data: entity } = await supabase
      .from('legal_entities')
      .select('id,code,name_th')
      .eq('id', legalEntityId)
      .maybeSingle()
    const legalEntityCode = String(entity?.code ?? '')

    const report = await buildTrialBalanceReport(supabase, {
      legalEntityId,
      fromDate: String(fiscalYear.period_from ?? ''),
      toDate: String(fiscalYear.period_to ?? ''),
    })

    const { data: surplusAccount, error: accountErr } = await supabase
      .from('account_chart')
      .select('id,account_code,account_name,account_type')
      .eq('legal_entity_id', legalEntityId)
      .eq('account_type', 'equity')
      .eq('account_code', accumulatedSurplusAccountCode)
      .maybeSingle()
    if (accountErr || !surplusAccount) {
      res.status(accountErr ? 500 : 400).json({
        error: accountErr
          ? 'ค้นหาบัญชีกองทุนสะสมไม่สำเร็จ'
          : `ไม่พบบัญชีกองทุนสะสมรหัส ${accumulatedSurplusAccountCode}`,
        details: accountErr,
      })
      return
    }

    const closingPack = buildYearEndClosingLines(report.rows, String(surplusAccount.id))
    let closingJournalId: string | null = null
    if (closingPack.lines.length > 0) {
      const referenceNo = `YCLOSE-${String(fiscalYear.period_to ?? '').replace(/-/g, '')}-${String(id).slice(0, 6)}`
      const { data: header, error: headerErr } = await supabase
        .from('journal_entries')
        .insert({
          legal_entity_id: legalEntityId,
          entry_date: String(fiscalYear.period_to ?? ''),
          reference_no: referenceNo,
          memo: `ปิดปีบัญชี ${String(fiscalYear.fiscal_label ?? '')}`,
          source_type: 'year_end_closing',
          source_id: id,
          status: 'draft',
          created_by: closedBy,
        })
        .select('id')
        .maybeSingle()
      if (headerErr || !header) {
        res.status(500).json({ error: 'สร้างหัวเอกสารปิดปีบัญชีไม่สำเร็จ', details: headerErr })
        return
      }
      closingJournalId = String(header.id)

      const insertLines = closingPack.lines.map((line) => ({
        journal_entry_id: closingJournalId,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      }))
      const { error: linesErr } = await supabase.from('journal_lines').insert(insertLines)
      if (linesErr) {
        res.status(500).json({ error: 'สร้างรายการปิดปีบัญชีไม่สำเร็จ', details: linesErr })
        return
      }
      const { error: postErr } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: closedBy,
          posted_at: new Date().toISOString(),
        })
        .eq('id', closingJournalId)
      if (postErr) {
        res.status(500).json({ error: 'โพสต์เอกสารปิดปีบัญชีไม่สำเร็จ', details: postErr })
        return
      }
    }

    const patch: Record<string, unknown> = {
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
      updated_at: new Date().toISOString(),
      closing_journal_entry_id: closingJournalId,
    }
    if (closeNote !== null) patch.close_note = closeNote
    const { data: updated, error: updateErr } = await supabase
      .from('fiscal_years')
      .update(patch)
      .eq('id', id)
      .select(
        'id,legal_entity_id,fiscal_label,period_from,period_to,is_closed,closed_at,closed_by,close_note,closing_journal_entry_id,created_at,updated_at',
      )
      .maybeSingle()
    if (updateErr || !updated) {
      res.status(500).json({ error: 'ปิดรอบปีบัญชีไม่สำเร็จ', details: updateErr })
      return
    }

    await supabase.from('audit_logs').insert({
      actor: closedBy,
      action: 'fiscal_year.close',
      target_table: 'fiscal_years',
      target_id: id,
      payload: {
        legal_entity_code: legalEntityCode,
        period_from: fiscalYear.period_from,
        period_to: fiscalYear.period_to,
        closing_journal_entry_id: closingJournalId,
        trial_balance_net_income: report.totals.netIncome,
      },
    })

    res.json({
      ok: true,
      fiscalYear: {
        ...updated,
        legal_entity_code: legalEntityCode,
      },
      closingSummary: {
        closing_journal_entry_id: closingJournalId,
        line_count: closingPack.lines.length,
        total_debit: closingPack.totals.debit,
        total_credit: closingPack.totals.credit,
        net_income: report.totals.netIncome,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/period-closing', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    const legalEntityCode =
      typeof req.query.legal_entity_code === 'string' ? req.query.legal_entity_code.trim() : ''
    const handoffStatusRaw =
      typeof req.query.auditor_handoff_status === 'string' ? req.query.auditor_handoff_status.trim() : ''
    const limitRaw = Number(req.query.limit)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 50
    if (handoffStatusRaw && !isAuditorHandoffStatus(handoffStatusRaw)) {
      res.status(400).json({ error: 'auditor_handoff_status ต้องเป็น pending, sent หรือ completed' })
      return
    }

    let legalEntityId: string | null = null
    if (legalEntityCode) {
      const entity = await getLegalEntity(supabase, legalEntityCode)
      if (!entity) {
        res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
        return
      }
      legalEntityId = String(entity.id)
    }

    const { data: entities } = await supabase.from('legal_entities').select('id,code,name_th')
    const entityMetaById = new Map<string, { code: string; name: string }>()
    for (const row of entities ?? []) {
      entityMetaById.set(String(row.id), {
        code: String(row.code ?? ''),
        name: String(row.name_th ?? ''),
      })
    }

    let query = supabase
      .from('finance_period_closings')
      .select(
        'id,legal_entity_id,period_from,period_to,closed_at,closed_by,note,journal_entry_count,total_debit,total_credit,net_income,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,auditor_completed_at,auditor_completed_by,auditor_completed_note,created_at',
      )
      .order('period_to', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (legalEntityId) query = query.eq('legal_entity_id', legalEntityId)
    if (handoffStatusRaw) query = query.eq('auditor_handoff_status', handoffStatusRaw)
    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: 'โหลดข้อมูลปิดงวดบัญชีไม่สำเร็จ', details: error })
      return
    }

    const rows = (data ?? []).map((row) => {
      const meta = entityMetaById.get(String(row.legal_entity_id ?? '')) ?? { code: '', name: '' }
      return {
        ...row,
        legal_entity_code: meta.code,
        legal_entity_name: meta.name,
      }
    })

    res.json({ ok: true, rows })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/period-closing', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const periodFrom = typeof req.body?.period_from === 'string' ? req.body.period_from.trim() : ''
    const periodTo = typeof req.body?.period_to === 'string' ? req.body.period_to.trim() : ''
    const closedBy = normalizeOptionalString(req.body?.closed_by) ?? 'finance-admin'
    const note = normalizeOptionalString(req.body?.note)

    if (!legalEntityCode) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code' })
      return
    }
    if (!isDateOnlyFormat(periodFrom) || !isDateOnlyFormat(periodTo) || periodFrom > periodTo) {
      res.status(400).json({ error: 'period_from / period_to ต้องเป็นรูปแบบ YYYY-MM-DD และช่วงวันที่ถูกต้อง' })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legalEntityCode)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }
    const legalEntityId = String(entity.id)

    const { data: existing, error: existingErr } = await supabase
      .from('finance_period_closings')
      .select('id')
      .eq('legal_entity_id', legalEntityId)
      .eq('period_from', periodFrom)
      .eq('period_to', periodTo)
      .maybeSingle()
    if (existingErr) {
      res.status(500).json({ error: 'ตรวจสอบข้อมูลปิดงวดเดิมไม่สำเร็จ', details: existingErr })
      return
    }
    if (existing?.id) {
      res.status(409).json({ error: 'งวดนี้ถูกปิดบัญชีแล้ว', periodClosingId: existing.id })
      return
    }

    const report = await buildTrialBalanceReport(supabase, {
      legalEntityId,
      fromDate: periodFrom,
      toDate: periodTo,
    })
    const { data: inserted, error: insertErr } = await supabase
      .from('finance_period_closings')
      .insert({
        legal_entity_id: legalEntityId,
        period_from: periodFrom,
        period_to: periodTo,
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        note,
        journal_entry_count: report.journalEntryCount,
        total_debit: report.totals.totalDebit,
        total_credit: report.totals.totalCredit,
        net_income: report.totals.netIncome,
        trial_balance_json: report.rows,
      })
      .select(
        'id,legal_entity_id,period_from,period_to,closed_at,closed_by,note,journal_entry_count,total_debit,total_credit,net_income,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,auditor_completed_at,auditor_completed_by,auditor_completed_note,created_at',
      )
      .maybeSingle()
    if (insertErr || !inserted) {
      res.status(500).json({ error: 'ปิดงวดบัญชีไม่สำเร็จ', details: insertErr })
      return
    }

    res.status(201).json({
      ok: true,
      periodClosing: {
        ...inserted,
        legal_entity_code: legalEntityCode,
      },
      trialBalancePreview: {
        rows: report.rows.slice(0, 20),
        rowCount: report.rows.length,
      },
      totals: report.totals,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/period-closing/:id/auditor-package.csv', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('finance_period_closings')
      .select(
        'id,legal_entity_id,period_from,period_to,closed_at,closed_by,note,journal_entry_count,total_debit,total_credit,net_income,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,auditor_completed_at,auditor_completed_by,auditor_completed_note,trial_balance_json,created_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (error || !row) {
      res.status(error ? 500 : 404).json({
        error: error ? 'โหลดข้อมูลปิดงวดบัญชีไม่สำเร็จ' : 'ไม่พบข้อมูลปิดงวดบัญชี',
        details: error,
      })
      return
    }

    const entityId = String(row.legal_entity_id ?? '')
    const { data: entityRows } = await supabase.from('legal_entities').select('id,code,name_th').eq('id', entityId).limit(1)
    const entity = (entityRows ?? [])[0]
    const legalEntityCode = typeof entity?.code === 'string' ? entity.code : ''
    const legalEntityName = typeof entity?.name_th === 'string' ? entity.name_th : ''
    const trialRowsRaw = Array.isArray(row.trial_balance_json) ? row.trial_balance_json : []

    const rows = trialRowsRaw.map((item) => {
      const rec = item as Record<string, unknown>
      return {
        period_closing_id: String(row.id),
        legal_entity_code: legalEntityCode,
        legal_entity_name: legalEntityName,
        period_from: String(row.period_from ?? ''),
        period_to: String(row.period_to ?? ''),
        account_code: typeof rec.accountCode === 'string' ? rec.accountCode : '',
        account_name: typeof rec.accountName === 'string' ? rec.accountName : '',
        account_type: typeof rec.accountType === 'string' ? rec.accountType : '',
        debit: Number(rec.debit ?? 0),
        credit: Number(rec.credit ?? 0),
        net: Number(rec.net ?? 0),
        closed_at: String(row.closed_at ?? ''),
        closed_by: String(row.closed_by ?? ''),
        note: String(row.note ?? ''),
        auditor_handoff_status: String(row.auditor_handoff_status ?? 'pending'),
        auditor_sent_at: String(row.auditor_sent_at ?? ''),
        auditor_sent_by: String(row.auditor_sent_by ?? ''),
        auditor_handoff_note: String(row.auditor_handoff_note ?? ''),
        auditor_completed_at: String(row.auditor_completed_at ?? ''),
        auditor_completed_by: String(row.auditor_completed_by ?? ''),
        auditor_completed_note: String(row.auditor_completed_note ?? ''),
        journal_entry_count: Number(row.journal_entry_count ?? 0),
        total_debit: Number(row.total_debit ?? 0),
        total_credit: Number(row.total_credit ?? 0),
        net_income: Number(row.net_income ?? 0),
        created_at: String(row.created_at ?? ''),
      }
    })
    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="period-closing-${id}-auditor-package.csv"`)
    res.send(csv)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/period-closing/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('finance_period_closings')
      .select(
        'id,legal_entity_id,period_from,period_to,closed_at,closed_by,note,journal_entry_count,total_debit,total_credit,net_income,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,auditor_completed_at,auditor_completed_by,auditor_completed_note,trial_balance_json,created_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (error || !row) {
      res.status(error ? 500 : 404).json({
        error: error ? 'โหลดข้อมูลปิดงวดบัญชีไม่สำเร็จ' : 'ไม่พบข้อมูลปิดงวดบัญชี',
        details: error,
      })
      return
    }

    const entityId = String(row.legal_entity_id ?? '')
    const { data: entityRows } = await supabase.from('legal_entities').select('id,code,name_th').eq('id', entityId).limit(1)
    const entity = (entityRows ?? [])[0]
    const legalEntityCode = typeof entity?.code === 'string' ? entity.code : ''
    const legalEntityName = typeof entity?.name_th === 'string' ? entity.name_th : ''

    const trialBalanceRows = (Array.isArray(row.trial_balance_json) ? row.trial_balance_json : []).map((item) => {
      const rec = item as Record<string, unknown>
      return {
        legalEntityCode: typeof rec.legalEntityCode === 'string' ? rec.legalEntityCode : legalEntityCode,
        legalEntityName: typeof rec.legalEntityName === 'string' ? rec.legalEntityName : legalEntityName,
        accountCode: typeof rec.accountCode === 'string' ? rec.accountCode : '',
        accountName: typeof rec.accountName === 'string' ? rec.accountName : '',
        accountType: typeof rec.accountType === 'string' ? rec.accountType : '',
        debit: Number(rec.debit ?? 0),
        credit: Number(rec.credit ?? 0),
        net: Number(rec.net ?? 0),
      }
    })
    const snapshotDebit = trialBalanceRows.reduce((sum, rowItem) => sum + Number(rowItem.debit ?? 0), 0)
    const snapshotCredit = trialBalanceRows.reduce((sum, rowItem) => sum + Number(rowItem.credit ?? 0), 0)
    const balanceDiff = snapshotDebit - snapshotCredit
    const isBalanced = Math.abs(balanceDiff) < 0.005
    const totalDebit = Number(row.total_debit ?? 0)
    const totalCredit = Number(row.total_credit ?? 0)
    const storedMatchesSnapshot = Math.abs(snapshotDebit - totalDebit) < 0.005 && Math.abs(snapshotCredit - totalCredit) < 0.005

    res.json({
      ok: true,
      periodClosing: {
        ...row,
        legal_entity_code: legalEntityCode,
        legal_entity_name: legalEntityName,
      },
      trialBalanceRows,
      integrity: {
        isBalanced,
        balanceDiff,
        storedMatchesSnapshot,
        snapshotTotalDebit: snapshotDebit,
        snapshotTotalCredit: snapshotCredit,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/period-closing/:id/mark-auditor-sent', async (req, res) => {
  try {
    const id = req.params.id
    const sentBy = normalizeOptionalString(req.body?.auditor_sent_by) ?? 'finance-admin'
    const handoffNote = normalizeOptionalString(req.body?.auditor_handoff_note)
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const patch: Record<string, unknown> = {
      auditor_handoff_status: 'sent',
      auditor_sent_at: new Date().toISOString(),
      auditor_sent_by: sentBy,
    }
    if (handoffNote !== null) patch.auditor_handoff_note = handoffNote
    const { data, error } = await supabase
      .from('finance_period_closings')
      .update(patch)
      .eq('id', id)
      .select(
        'id,legal_entity_id,period_from,period_to,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,closed_at,closed_by',
      )
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({
        error: error ? 'อัปเดตสถานะส่งผู้ตรวจสอบไม่สำเร็จ' : 'ไม่พบข้อมูลปิดงวดบัญชี',
        details: error,
      })
      return
    }
    res.json({ ok: true, periodClosing: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/period-closing/:id/mark-auditor-completed', async (req, res) => {
  try {
    const id = req.params.id
    const completedBy = normalizeOptionalString(req.body?.auditor_completed_by) ?? 'finance-admin'
    const completedNote = normalizeOptionalString(req.body?.auditor_completed_note)
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const patch: Record<string, unknown> = {
      auditor_handoff_status: 'completed',
      auditor_completed_at: new Date().toISOString(),
      auditor_completed_by: completedBy,
    }
    if (completedNote !== null) patch.auditor_completed_note = completedNote
    const { data, error } = await supabase
      .from('finance_period_closings')
      .update(patch)
      .eq('id', id)
      .select(
        'id,legal_entity_id,period_from,period_to,auditor_handoff_status,auditor_sent_at,auditor_sent_by,auditor_handoff_note,auditor_completed_at,auditor_completed_by,auditor_completed_note,closed_at,closed_by',
      )
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({
        error: error ? 'อัปเดตสถานะปิดงานผู้ตรวจสอบไม่สำเร็จ' : 'ไม่พบข้อมูลปิดงวดบัญชี',
        details: error,
      })
      return
    }
    res.json({ ok: true, periodClosing: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/payment-requests', async (req, res) => {
  try {
    const legal_entity_code =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const purpose = typeof req.body?.purpose === 'string' ? req.body.purpose.trim() : ''
    const purposeCategoryRaw = typeof req.body?.purpose_category === 'string' ? req.body.purpose_category.trim() : ''
    const purposeCategory = isPaymentPurposeCategory(purposeCategoryRaw)
      ? purposeCategoryRaw
      : inferPurposeCategoryFromText(purpose)
    const amount = Number(req.body?.amount)
    const vatRateRaw = Number(req.body?.vat_rate ?? 0)
    const whtRateRaw = Number(req.body?.wht_rate ?? 0)
    const taxpayerId = normalizeOptionalString(req.body?.taxpayer_id)
    const requested_by =
      typeof req.body?.requested_by === 'string' && req.body.requested_by.trim()
        ? req.body.requested_by.trim()
        : 'finance-admin'
    const bank_account_id =
      typeof req.body?.bank_account_id === 'string' && req.body.bank_account_id.trim()
        ? req.body.bank_account_id.trim()
        : null
    const meeting_session_id =
      typeof req.body?.meeting_session_id === 'string' && req.body.meeting_session_id.trim()
        ? req.body.meeting_session_id.trim()
        : null
    const journal_entry_id =
      typeof req.body?.journal_entry_id === 'string' && req.body.journal_entry_id.trim()
        ? req.body.journal_entry_id.trim()
        : null

    if (!legal_entity_code || !purpose || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code, purpose และ amount > 0' })
      return
    }
    if (!isSupportedVatRate(vatRateRaw)) {
      res.status(400).json({ error: 'vat_rate รองรับเฉพาะ 0 หรือ 0.07' })
      return
    }
    if (!isSupportedWhtRate(whtRateRaw)) {
      res.status(400).json({ error: 'wht_rate รองรับเฉพาะ 0, 0.01, 0.03, 0.05' })
      return
    }
    const taxResult = calculateThaiTax({ baseAmount: amount, vatRate: vatRateRaw, whtRate: whtRateRaw })

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legal_entity_code)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }

    const policy = resolveFinanceApprovalPolicy(amount)

    if (policy.rule === 'committee_35_over_20000' && !meeting_session_id) {
      res.status(400).json({
        error: 'ต้องระบุ meeting_session_id สำหรับการจ่ายเงิน > 20,000 (ประชุม + มติ)',
      })
      return
    }

    if (policy.rule === 'committee_3of5_upto_20000') {
      if (!isRoutinePurposeCategory(purposeCategory)) {
        res.status(400).json({
          error:
            'ยอดไม่เกิน 20,000 บาทใช้ได้เฉพาะค่าใช้จ่ายปกติธุระ (ไฟฟ้า ประปา อินเทอร์เนต ค่าจ้างเจ้าหน้าที่ แม่บ้าน เครื่องใช้สำนักงาน ค่ารับรอง)',
          purpose_category: purposeCategory,
        })
        return
      }
      if (!bank_account_id) {
        res.status(400).json({
          error: 'ต้องระบุ bank_account_id สำหรับยอด <= 20,000 (อนุมัติกรรมการ 3 ใน 5 ที่มีสิทธิ์ KBiz)',
        })
        return
      }
      const { data: signers, error: sErr } = await supabase
        .from('bank_account_signers')
        .select('id')
        .eq('bank_account_id', bank_account_id)
        .eq('active', true)
        .eq('in_kbiz', true)
      if (sErr) {
        res.status(500).json({ error: 'โหลดรายชื่อผู้ลงนามบัญชีธนาคารไม่สำเร็จ', details: sErr })
        return
      }
      if ((signers ?? []).length < 5) {
        res.status(400).json({
          error: 'ต้องมีผู้ลงนามที่ active และมีชื่อใน KBiz อย่างน้อย 5 คนต่อบัญชี',
        })
        return
      }
    }

    let journalEntryIdResolved: string | null = null
    if (journal_entry_id) {
      const { data: jRow, error: jErr } = await supabase
        .from('journal_entries')
        .select('id,legal_entity_id,status')
        .eq('id', journal_entry_id)
        .maybeSingle()
      if (jErr || !jRow) {
        res.status(jErr ? 500 : 400).json({
          error: jErr ? 'โหลดสมุดรายวันผูกคำขอจ่ายไม่สำเร็จ' : 'ไม่พบสมุดรายวันที่อ้างอิง',
          details: jErr,
        })
        return
      }
      if (String(jRow.legal_entity_id) !== String(entity.id)) {
        res.status(400).json({ error: 'สมุดรายวันต้องอยู่หน่วยงานเดียวกับคำขอจ่าย (legal_entity)' })
        return
      }
      if (String(jRow.status) === 'voided') {
        res.status(400).json({ error: 'ไม่สามารถผูกคำขอจ่ายกับเอกสารสมุดรายวันที่ void แล้ว' })
        return
      }
      journalEntryIdResolved = String(jRow.id)
    }

    const { data: row, error: insErr } = await supabase
      .from('payment_requests')
      .insert({
        legal_entity_id: entity.id,
        bank_account_id,
        meeting_session_id,
        journal_entry_id: journalEntryIdResolved,
        purpose,
        purpose_category: purposeCategory,
        amount,
        vat_rate: taxResult.vatRate,
        wht_rate: taxResult.whtRate,
        vat_amount: taxResult.vatAmount,
        wht_amount: taxResult.whtAmount,
        taxpayer_id: taxpayerId,
        requested_by,
        approval_rule: policy.rule,
        required_approvals: policy.requiredApprovals,
        required_role_code: policy.requiredRoleCode,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'สร้างคำขอจ่ายเงินไม่สำเร็จ', details: insErr })
      return
    }

    res.status(201).json({
      ok: true,
      paymentRequest: row,
      policy,
      purpose_category: purposeCategory,
      tax: taxResult,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/payment-requests/:id/approve', async (req, res) => {
  try {
    const id = req.params.id
    const approver_name = typeof req.body?.approver_name === 'string' ? req.body.approver_name.trim() : ''
    const approver_signer_id =
      typeof req.body?.approver_signer_id === 'string' ? req.body.approver_signer_id.trim() : ''
    const approver_role_code =
      typeof req.body?.approver_role_code === 'string' ? req.body.approver_role_code.trim() : ''
    const decision = req.body?.decision === 'reject' ? 'reject' : 'approve'
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : null

    if (!id || (!approver_name && !approver_signer_id) || !approver_role_code) {
      res.status(400).json({ error: 'ต้องระบุ id, approver_name หรือ approver_signer_id และ approver_role_code' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: reqRow, error: reqErr } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (reqErr || !reqRow) {
      res.status(reqErr ? 500 : 404).json({ error: reqErr ? 'โหลดคำขอไม่สำเร็จ' : 'ไม่พบข้อมูล', details: reqErr })
      return
    }
    if (reqRow.status !== 'pending') {
      res.status(400).json({ error: 'คำขอไม่ได้อยู่ในสถานะ pending', status: reqRow.status })
      return
    }
    if (approver_role_code !== reqRow.required_role_code) {
      res.status(403).json({
        error: 'role นี้ไม่สามารถอนุมัติคำขอนี้ได้',
        required_role_code: reqRow.required_role_code,
      })
      return
    }

    if (reqRow.approval_rule === 'committee_3of5_upto_20000') {
      if (!reqRow.bank_account_id) {
        res.status(400).json({ error: 'คำขอนี้ไม่มี bank_account_id' })
        return
      }
      let signerQuery = supabase
        .from('bank_account_signers')
        .select('id, signer_name')
        .eq('bank_account_id', reqRow.bank_account_id)
        .eq('active', true)
        .eq('in_kbiz', true)
      if (approver_signer_id) {
        signerQuery = signerQuery.eq('id', approver_signer_id)
      } else {
        signerQuery = signerQuery.eq('signer_name', approver_name)
      }
      const { data: signer, error: sigErr } = await signerQuery.maybeSingle()
      if (sigErr) {
        res.status(500).json({ error: 'ค้นหาผู้ลงนามไม่สำเร็จ', details: sigErr })
        return
      }
      if (!signer) {
        res.status(403).json({
          error: 'approver_name ไม่ใช่ผู้ลงนาม KBiz ที่ active สำหรับบัญชีนี้',
        })
        return
      }
      if (!approver_name) {
        // canonical value from DB ป้องกันปัญหา encoding/whitespace ฝั่ง client
        ;(req.body as Record<string, unknown>).approver_name = signer.signer_name
      }
    }

    const approverNameFinal =
      typeof req.body?.approver_name === 'string' ? req.body.approver_name.trim() : approver_name

    let dynamicRequired: number | null = null
    let attendeeCount: number | null = null
    let quorumNeed: number | null = null
    if (reqRow.approval_rule === 'committee_35_over_20000') {
      const meetingSessionId =
        typeof reqRow.meeting_session_id === 'string' ? reqRow.meeting_session_id : ''
      if (!meetingSessionId) {
        res.status(400).json({
          error: 'ต้องระบุ meeting_session_id สำหรับกฎการอนุมัตินี้',
        })
        return
      }
      const { data: session, error: sessErr } = await supabase
        .from('meeting_sessions')
        .select('id,expected_participants')
        .eq('id', meetingSessionId)
        .maybeSingle()
      if (sessErr || !session) {
        res.status(sessErr ? 500 : 404).json({
          error: sessErr ? 'โหลดรอบประชุมไม่สำเร็จ' : 'ไม่พบรอบประชุม',
          details: sessErr,
        })
        return
      }

      attendeeCount = await countMeetingAttendance(supabase, meetingSessionId)
      const expected = Number(session.expected_participants ?? 0)
      quorumNeed = quorumRequired(expected)
      if (attendeeCount < quorumNeed) {
        res.status(400).json({
          error: 'องค์ประชุมไม่ครบ',
          attendees: attendeeCount,
          quorumRequired: quorumNeed,
          expectedParticipants: expected,
        })
        return
      }
      dynamicRequired = majorityRequired(attendeeCount)
    }

    const { error: appErr } = await supabase.from('payment_request_approvals').insert({
      payment_request_id: id,
      approver_name: approverNameFinal,
      approver_role_code,
      decision,
      comment,
    })
    if (appErr) {
      res.status(500).json({ error: 'บันทึกการอนุมัติไม่สำเร็จ', details: appErr })
      return
    }

    if (decision === 'reject') {
      const { error: upErr } = await supabase
        .from('payment_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) {
        res.status(500).json({ error: 'ปิดคำขอแบบปฏิเสธไม่สำเร็จ', details: upErr })
        return
      }
      res.json({ ok: true, status: 'rejected' })
      return
    }

    const { data: rows, error: countErr } = await supabase
      .from('payment_request_approvals')
      .select('id,decision')
      .eq('payment_request_id', id)
      .eq('approver_role_code', approver_role_code)
      .eq('decision', 'approve')
    if (countErr) {
      res.status(500).json({ error: 'นับจำนวนการอนุมัติไม่สำเร็จ', details: countErr })
      return
    }

    const approveCount = (rows ?? []).length
    const required = dynamicRequired ?? Number(reqRow.required_approvals ?? 0)
    const approved = approveCount >= required

    if (approved) {
      const { error: upErr } = await supabase
        .from('payment_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) {
        res.status(500).json({ error: 'ปิดคำขอแบบอนุมัติไม่สำเร็จ', details: upErr })
        return
      }
    }

    res.json({
      ok: true,
      status: approved ? 'approved' : 'pending',
      approvals: approveCount,
      requiredApprovals: required,
      attendees: attendeeCount,
      quorumRequired: quorumNeed,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-sessions', async (req, res) => {
  try {
    const legal_entity_code =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const expectedParticipants = Number(req.body?.expected_participants ?? 35)
    const created_by =
      typeof req.body?.created_by === 'string' && req.body.created_by.trim()
        ? req.body.created_by.trim()
        : 'admin'

    if (!legal_entity_code || !title || !Number.isFinite(expectedParticipants) || expectedParticipants <= 0) {
      res.status(400).json({
        error: 'ต้องระบุ legal_entity_code, title และ expected_participants > 0',
      })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legal_entity_code)
    if (!entity) {
      res.status(400).json({ error: 'ไม่รู้จัก legal_entity_code' })
      return
    }

    const { data: row, error } = await supabase
      .from('meeting_sessions')
      .insert({
        legal_entity_id: entity.id,
        title,
        expected_participants: expectedParticipants,
        created_by,
      })
      .select('*')
      .single()
    if (error || !row) {
      res.status(500).json({ error: 'สร้างรอบประชุมไม่สำเร็จ', details: error })
      return
    }

    res.status(201).json({
      ok: true,
      meetingSession: row,
      quorumRequired: quorumRequired(expectedParticipants),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-sessions/:id/sign-attendance', async (req, res) => {
  try {
    const id = req.params.id
    const attendee_name = typeof req.body?.attendee_name === 'string' ? req.body.attendee_name.trim() : ''
    const attendee_role_code =
      typeof req.body?.attendee_role_code === 'string' ? req.body.attendee_role_code.trim() : ''
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : null

    if (!id || !attendee_name || !attendee_role_code) {
      res.status(400).json({ error: 'ต้องระบุ id, attendee_name และ attendee_role_code' })
      return
    }
    if (!['committee', 'cram_executive'].includes(attendee_role_code)) {
      res.status(400).json({
        error: 'attendee_role_code ต้องเป็น committee หรือ cram_executive',
      })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('meeting_attendance')
      .insert({
        meeting_session_id: id,
        attendee_name,
        attendee_role_code,
        line_uid,
        signed_via: line_uid ? 'line' : 'manual',
      })
      .select('*')
      .single()

    if (error || !row) {
      res.status(500).json({ error: 'ลงชื่อเข้าประชุมไม่สำเร็จ', details: error })
      return
    }

    res.status(201).json({ ok: true, attendance: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-sessions/:id/summary', async (req, res) => {
  try {
    const id = req.params.id
    const supabase = getServiceSupabase()
    const { data: session, error } = await supabase
      .from('meeting_sessions')
      .select('id,title,expected_participants')
      .eq('id', id)
      .maybeSingle()
    if (error || !session) {
      res.status(error ? 500 : 404).json({ error: error ? 'โหลดข้อมูลประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }

    const attendees = await countMeetingAttendance(supabase, id)
    const quorumNeed = quorumRequired(Number(session.expected_participants ?? 0))
    const majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0

    res.json({
      ok: true,
      meetingSession: session,
      attendees,
      quorumRequired: quorumNeed,
      quorumMet: attendees >= quorumNeed,
      majorityRequired: majorityNeed,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-sessions/:id/minutes', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('id,title,minutes_markdown,minutes_recorded_by,minutes_updated_at,minutes_published')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'โหลดรายงานการประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }
    res.json({ ok: true, meetingSession: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-sessions/:id/minutes', async (req, res) => {
  try {
    const id = req.params.id
    const minutesMarkdown = typeof req.body?.minutes_markdown === 'string' ? req.body.minutes_markdown.trim() : ''
    const recordedBy = normalizeOptionalString(req.body?.minutes_recorded_by) ?? 'admin-ui'
    const publishToPortal = typeof req.body?.publish_to_portal === 'boolean' ? req.body.publish_to_portal : null
    if (!id || !minutesMarkdown) {
      res.status(400).json({ error: 'ต้องระบุ id และ minutes_markdown' })
      return
    }
    const supabase = getServiceSupabase()
    const patch: Record<string, unknown> = {
      minutes_markdown: minutesMarkdown,
      minutes_recorded_by: recordedBy,
      minutes_updated_at: new Date().toISOString(),
    }
    if (publishToPortal !== null) patch.minutes_published = publishToPortal
    const { data, error } = await supabase
      .from('meeting_sessions')
      .update(patch)
      .eq('id', id)
      .select('id,title,minutes_markdown,minutes_recorded_by,minutes_updated_at,minutes_published')
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'บันทึกรายงานการประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }
    res.json({ ok: true, meetingSession: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-sessions/:id/minutes/publish', async (req, res) => {
  try {
    const id = req.params.id
    const published = typeof req.body?.published === 'boolean' ? req.body.published : true
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_sessions')
      .update({
        minutes_published: published,
        minutes_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id,title,minutes_published,minutes_updated_at')
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'อัปเดตสถานะเผยแพร่รายงานประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }
    res.json({ ok: true, meetingSession: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-sessions/:id/minutes.txt', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('id,title,minutes_markdown,minutes_updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'โหลดรายงานการประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }
    const safeTitle = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : `meeting-${id}`
    const markdown = typeof data.minutes_markdown === 'string' ? data.minutes_markdown : ''
    const updatedAt = typeof data.minutes_updated_at === 'string' ? data.minutes_updated_at : ''
    const body = [`หัวข้อประชุม: ${safeTitle}`, `meeting_session_id: ${id}`, `updated_at: ${updatedAt || '-'}`, '', markdown]
      .join('\n')
      .trimEnd()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="meeting-minutes-${id}.txt"`)
    res.status(200).send(`\uFEFF${body}\n`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-agendas', async (req, res) => {
  try {
    const scope = typeof req.query.scope === 'string' ? req.query.scope.trim() : ''
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const meetingSessionId =
      typeof req.query.meeting_session_id === 'string' ? req.query.meeting_session_id.trim() : ''

    const supabase = getServiceSupabase()
    let query = supabase
      .from('meeting_agendas')
      .select('id,scope,title,details,status,meeting_session_id,created_by,created_at')
      .order('created_at', { ascending: false })

    if (scope) query = query.eq('scope', scope)
    if (status) query = query.eq('status', status)
    if (meetingSessionId) query = query.eq('meeting_session_id', meetingSessionId)

    const { data: agendas, error } = await query
    if (error) {
      res.status(500).json({ error: 'โหลดวาระประชุมไม่สำเร็จ', details: error })
      return
    }

    res.json({ ok: true, agendas: agendas ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-agendas', async (req, res) => {
  try {
    const scope = typeof req.body?.scope === 'string' ? req.body.scope.trim() : ''
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const details = normalizeOptionalString(req.body?.details)
    const meetingSessionId = normalizeOptionalString(req.body?.meeting_session_id)
    const createdBy = normalizeOptionalString(req.body?.created_by) ?? 'admin-ui'

    if (!scope || !['association', 'cram_school'].includes(scope)) {
      res.status(400).json({ error: 'scope ต้องเป็น association หรือ cram_school' })
      return
    }
    if (!title) {
      res.status(400).json({ error: 'ต้องระบุ title' })
      return
    }

    const supabase = getServiceSupabase()
    if (meetingSessionId) {
      const { data: session, error: sessionErr } = await supabase
        .from('meeting_sessions')
        .select('id')
        .eq('id', meetingSessionId)
        .maybeSingle()
      if (sessionErr || !session) {
        res.status(sessionErr ? 500 : 404).json({
          error: sessionErr ? 'ตรวจสอบรอบประชุมไม่สำเร็จ' : 'ไม่พบ meeting_session_id',
          details: sessionErr,
        })
        return
      }
    }

    const { data: agenda, error } = await supabase
      .from('meeting_agendas')
      .insert({
        scope,
        title,
        details,
        status: 'open',
        meeting_session_id: meetingSessionId,
        created_by: createdBy,
      })
      .select('id,scope,title,details,status,meeting_session_id,created_by,created_at')
      .single()

    if (error || !agenda) {
      res.status(500).json({ error: 'สร้างวาระประชุมไม่สำเร็จ', details: error })
      return
    }

    res.status(201).json({ ok: true, agenda })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.patch('/meeting-agendas/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const next: Record<string, unknown> = {}
    if (typeof req.body?.title === 'string' && req.body.title.trim()) next.title = req.body.title.trim()
    if (typeof req.body?.details === 'string') next.details = req.body.details.trim() || null
    if (typeof req.body?.status === 'string' && ['open', 'closed'].includes(req.body.status.trim())) {
      next.status = req.body.status.trim()
    }

    if (Object.keys(next).length === 0) {
      res.status(400).json({ error: 'ไม่มีฟิลด์ที่อัปเดตได้ (title/details/status)' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: agenda, error } = await supabase
      .from('meeting_agendas')
      .update(next)
      .eq('id', id)
      .select('id,scope,title,details,status,meeting_session_id,created_by,created_at')
      .maybeSingle()
    if (error || !agenda) {
      res.status(error ? 500 : 404).json({ error: error ? 'อัปเดตวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: error })
      return
    }

    res.json({ ok: true, agenda })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-agendas/:id/votes', async (req, res) => {
  try {
    const agendaId = req.params.id
    const voteRaw = typeof req.body?.vote === 'string' ? req.body.vote.trim() : ''
    const appUserId = normalizeOptionalString(req.body?.app_user_id)
    const voterName = normalizeOptionalString(req.body?.voter_name)
    const voterRoleCode = normalizeOptionalString(req.body?.voter_role_code)

    if (!agendaId || !isMeetingVoteChoice(voteRaw)) {
      res.status(400).json({ error: 'ต้องระบุ id และ vote (approve/reject/abstain)' })
      return
    }
    if (!appUserId && !voterName) {
      res.status(400).json({ error: 'ต้องระบุ app_user_id หรือ voter_name อย่างน้อยหนึ่งค่า' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: agenda, error: agendaErr } = await supabase
      .from('meeting_agendas')
      .select('id,status')
      .eq('id', agendaId)
      .maybeSingle()
    if (agendaErr || !agenda) {
      res.status(agendaErr ? 500 : 404).json({ error: agendaErr ? 'โหลดวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: agendaErr })
      return
    }
    if (agenda.status !== 'open') {
      res.status(409).json({ error: 'วาระนี้ปิดโหวตแล้ว' })
      return
    }

    if (appUserId) {
      const { data: existing, error: existingErr } = await supabase
        .from('meeting_votes')
        .select('id')
        .eq('agenda_id', agendaId)
        .eq('app_user_id', appUserId)
        .maybeSingle()
      if (existingErr) {
        res.status(500).json({ error: 'ตรวจสอบสิทธิ์โหวตไม่สำเร็จ', details: existingErr })
        return
      }
      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('meeting_votes')
          .update({
            vote: voteRaw,
            voted_at: new Date().toISOString(),
            voter_name: voterName,
            voter_role_code: voterRoleCode,
          })
          .eq('id', existing.id)
        if (updateErr) {
          res.status(500).json({ error: 'อัปเดตคะแนนโหวตไม่สำเร็จ', details: updateErr })
          return
        }
      } else {
        const { error: insertErr } = await supabase.from('meeting_votes').insert({
          agenda_id: agendaId,
          app_user_id: appUserId,
          vote: voteRaw,
          voter_name: voterName,
          voter_role_code: voterRoleCode,
        })
        if (insertErr) {
          res.status(500).json({ error: 'บันทึกคะแนนโหวตไม่สำเร็จ', details: insertErr })
          return
        }
      }
    } else {
      const { data: existingByName, error: existingNameErr } = await supabase
        .from('meeting_votes')
        .select('id,voter_name')
        .eq('agenda_id', agendaId)
      if (existingNameErr) {
        res.status(500).json({ error: 'ตรวจสอบผู้โหวตไม่สำเร็จ', details: existingNameErr })
        return
      }
      const duplicated = (existingByName ?? []).find(
        (row) => typeof row.voter_name === 'string' && row.voter_name.trim().toLowerCase() === voterName!.toLowerCase(),
      )
      if (duplicated?.id) {
        const { error: updateErr } = await supabase
          .from('meeting_votes')
          .update({
            vote: voteRaw,
            voted_at: new Date().toISOString(),
            voter_role_code: voterRoleCode,
          })
          .eq('id', duplicated.id)
        if (updateErr) {
          res.status(500).json({ error: 'อัปเดตคะแนนโหวตไม่สำเร็จ', details: updateErr })
          return
        }
      } else {
        const { error: insertErr } = await supabase.from('meeting_votes').insert({
          agenda_id: agendaId,
          app_user_id: null,
          vote: voteRaw,
          voter_name: voterName,
          voter_role_code: voterRoleCode,
        })
        if (insertErr) {
          res.status(500).json({ error: 'บันทึกคะแนนโหวตไม่สำเร็จ', details: insertErr })
          return
        }
      }
    }

    const summary = await getMeetingVoteSummary(supabase, agendaId)
    res.status(201).json({ ok: true, summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-agendas/:id/vote-summary', async (req, res) => {
  try {
    const agendaId = req.params.id
    if (!agendaId) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: agenda, error: agendaErr } = await supabase
      .from('meeting_agendas')
      .select('id,title,status,meeting_session_id')
      .eq('id', agendaId)
      .maybeSingle()
    if (agendaErr || !agenda) {
      res.status(agendaErr ? 500 : 404).json({ error: agendaErr ? 'โหลดวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: agendaErr })
      return
    }

    const summary = await getMeetingVoteSummary(supabase, agendaId)
    let attendees = 0
    let majorityNeed = 0
    let quorumNeed = 0
    let quorumMet = false
    if (agenda.meeting_session_id) {
      attendees = await countMeetingAttendance(supabase, String(agenda.meeting_session_id))
      majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
      const { data: session, error: sessionErr } = await supabase
        .from('meeting_sessions')
        .select('expected_participants')
        .eq('id', agenda.meeting_session_id)
        .maybeSingle()
      if (sessionErr) {
        res.status(500).json({ error: 'โหลดข้อมูลรอบประชุมไม่สำเร็จ', details: sessionErr })
        return
      }
      quorumNeed = quorumRequired(Number(session?.expected_participants ?? 0))
      quorumMet = attendees >= quorumNeed
    } else {
      attendees = summary.total
      majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
      quorumNeed = 0
      quorumMet = true
    }

    res.json({
      ok: true,
      agenda,
      summary,
      attendees,
      majorityRequired: majorityNeed,
      quorumRequired: quorumNeed,
      quorumMet,
      approvedByVote: summary.approve >= majorityNeed && majorityNeed > 0 && quorumMet,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-agendas/:id/close', async (req, res) => {
  try {
    const agendaId = req.params.id
    if (!agendaId) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: agenda, error: agendaErr } = await supabase
      .from('meeting_agendas')
      .select('id,status,meeting_session_id,title')
      .eq('id', agendaId)
      .maybeSingle()
    if (agendaErr || !agenda) {
      res.status(agendaErr ? 500 : 404).json({ error: agendaErr ? 'โหลดวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: agendaErr })
      return
    }
    if (agenda.status === 'closed') {
      const existingSummary = await getMeetingVoteSummary(supabase, agendaId)
      res.json({ ok: true, status: 'closed', summary: existingSummary, message: 'วาระนี้ปิดไปแล้ว' })
      return
    }

    const summary = await getMeetingVoteSummary(supabase, agendaId)
    let attendees = 0
    let majorityNeed = 0
    let quorumNeed = 0
    let quorumMet = false
    if (agenda.meeting_session_id) {
      attendees = await countMeetingAttendance(supabase, String(agenda.meeting_session_id))
      majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
      const { data: session, error: sessionErr } = await supabase
        .from('meeting_sessions')
        .select('expected_participants')
        .eq('id', agenda.meeting_session_id)
        .maybeSingle()
      if (sessionErr) {
        res.status(500).json({ error: 'โหลดข้อมูลรอบประชุมไม่สำเร็จ', details: sessionErr })
        return
      }
      quorumNeed = quorumRequired(Number(session?.expected_participants ?? 0))
      quorumMet = attendees >= quorumNeed
    } else {
      attendees = summary.total
      majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
      quorumNeed = 0
      quorumMet = true
    }

    const approvedByVote = summary.approve >= majorityNeed && majorityNeed > 0 && quorumMet

    const { data: updatedAgenda, error: updateErr } = await supabase
      .from('meeting_agendas')
      .update({ status: 'closed' })
      .eq('id', agendaId)
      .select('id,scope,title,details,status,meeting_session_id,created_by,created_at')
      .maybeSingle()
    if (updateErr || !updatedAgenda) {
      res.status(updateErr ? 500 : 404).json({ error: updateErr ? 'ปิดวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: updateErr })
      return
    }

    res.json({
      ok: true,
      agenda: updatedAgenda,
      summary,
      attendees,
      majorityRequired: majorityNeed,
      quorumRequired: quorumNeed,
      quorumMet,
      approvedByVote,
      resultLabel: approvedByVote ? 'ผ่านมติ' : 'ไม่ผ่านมติ',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-documents', async (req, res) => {
  try {
    const scope = typeof req.query.scope === 'string' ? req.query.scope.trim() : ''
    const meetingSessionId =
      typeof req.query.meeting_session_id === 'string' ? req.query.meeting_session_id.trim() : ''
    const agendaId = typeof req.query.agenda_id === 'string' ? req.query.agenda_id.trim() : ''

    const supabase = getServiceSupabase()
    let query = supabase
      .from('meeting_documents')
      .select('id,scope,meeting_session_id,agenda_id,title,document_url,document_text,uploaded_by,published_to_portal,created_at,updated_at')
      .order('created_at', { ascending: false })

    if (scope) query = query.eq('scope', scope)
    if (meetingSessionId) query = query.eq('meeting_session_id', meetingSessionId)
    if (agendaId) query = query.eq('agenda_id', agendaId)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ error: 'โหลดเอกสารประชุมไม่สำเร็จ', details: error })
      return
    }

    res.json({ ok: true, documents: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.post('/meeting-documents', async (req, res) => {
  try {
    const scope = typeof req.body?.scope === 'string' ? req.body.scope.trim() : ''
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const meetingSessionId = normalizeOptionalString(req.body?.meeting_session_id)
    const agendaId = normalizeOptionalString(req.body?.agenda_id)
    const documentUrl = normalizeOptionalString(req.body?.document_url)
    const documentText = normalizeOptionalString(req.body?.document_text)
    const uploadedBy = normalizeOptionalString(req.body?.uploaded_by) ?? 'admin-ui'
    const publishedToPortal = typeof req.body?.published_to_portal === 'boolean' ? req.body.published_to_portal : false

    if (!scope || !['association', 'cram_school'].includes(scope)) {
      res.status(400).json({ error: 'scope ต้องเป็น association หรือ cram_school' })
      return
    }
    if (!title) {
      res.status(400).json({ error: 'ต้องระบุ title' })
      return
    }
    if (!documentUrl && !documentText) {
      res.status(400).json({ error: 'ต้องระบุ document_url หรือ document_text อย่างน้อยหนึ่งค่า' })
      return
    }

    const supabase = getServiceSupabase()
    if (meetingSessionId) {
      const { data: session, error: sessionErr } = await supabase
        .from('meeting_sessions')
        .select('id')
        .eq('id', meetingSessionId)
        .maybeSingle()
      if (sessionErr || !session) {
        res.status(sessionErr ? 500 : 404).json({
          error: sessionErr ? 'ตรวจสอบ meeting_session_id ไม่สำเร็จ' : 'ไม่พบ meeting_session_id',
          details: sessionErr,
        })
        return
      }
    }
    if (agendaId) {
      const { data: agenda, error: agendaErr } = await supabase
        .from('meeting_agendas')
        .select('id')
        .eq('id', agendaId)
        .maybeSingle()
      if (agendaErr || !agenda) {
        res.status(agendaErr ? 500 : 404).json({
          error: agendaErr ? 'ตรวจสอบ agenda_id ไม่สำเร็จ' : 'ไม่พบ agenda_id',
          details: agendaErr,
        })
        return
      }
    }

    const { data, error } = await supabase
      .from('meeting_documents')
      .insert({
        scope,
        meeting_session_id: meetingSessionId,
        agenda_id: agendaId,
        title,
        document_url: documentUrl,
        document_text: documentText,
        uploaded_by: uploadedBy,
        published_to_portal: publishedToPortal,
      })
      .select('id,scope,meeting_session_id,agenda_id,title,document_url,document_text,uploaded_by,published_to_portal,created_at,updated_at')
      .single()

    if (error || !data) {
      res.status(500).json({ error: 'เพิ่มเอกสารประชุมไม่สำเร็จ', details: error })
      return
    }

    res.status(201).json({ ok: true, document: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.patch('/meeting-documents/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof req.body?.title === 'string') patch.title = req.body.title.trim()
    if (typeof req.body?.document_url === 'string') patch.document_url = req.body.document_url.trim() || null
    if (typeof req.body?.document_text === 'string') patch.document_text = req.body.document_text.trim() || null
    if (req.body?.meeting_session_id === null) patch.meeting_session_id = null
    else if (typeof req.body?.meeting_session_id === 'string') patch.meeting_session_id = req.body.meeting_session_id.trim() || null
    if (req.body?.agenda_id === null) patch.agenda_id = null
    else if (typeof req.body?.agenda_id === 'string') patch.agenda_id = req.body.agenda_id.trim() || null
    if (typeof req.body?.published_to_portal === 'boolean') patch.published_to_portal = req.body.published_to_portal

    const hasPatchFields = Object.keys(patch).some((k) => k !== 'updated_at')
    if (!hasPatchFields) {
      res.status(400).json({ error: 'ไม่มีฟิลด์สำหรับอัปเดต' })
      return
    }
    const docUrl = patch.document_url
    const docText = patch.document_text
    if (docUrl === null && docText === null) {
      res.status(400).json({ error: 'ห้ามลบ document_url และ document_text พร้อมกัน' })
      return
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_documents')
      .update(patch)
      .eq('id', id)
      .select('id,scope,meeting_session_id,agenda_id,title,document_url,document_text,uploaded_by,published_to_portal,created_at,updated_at')
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'อัปเดตเอกสารประชุมไม่สำเร็จ' : 'ไม่พบเอกสารประชุม', details: error })
      return
    }

    res.json({ ok: true, document: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.delete('/meeting-documents/:id', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('meeting_documents').delete().eq('id', id)
    if (error) {
      res.status(500).json({ error: 'ลบเอกสารประชุมไม่สำเร็จ', details: error })
      return
    }
    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/meeting-documents/:id/download.txt', async (req, res) => {
  try {
    const id = req.params.id
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_documents')
      .select('id,title,scope,meeting_session_id,agenda_id,document_url,document_text,created_at,updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'โหลดเอกสารประชุมไม่สำเร็จ' : 'ไม่พบเอกสารประชุม', details: error })
      return
    }

    const lines = [
      `title: ${typeof data.title === 'string' ? data.title : '-'}`,
      `scope: ${typeof data.scope === 'string' ? data.scope : '-'}`,
      `meeting_session_id: ${typeof data.meeting_session_id === 'string' ? data.meeting_session_id : '-'}`,
      `agenda_id: ${typeof data.agenda_id === 'string' ? data.agenda_id : '-'}`,
      `document_url: ${typeof data.document_url === 'string' ? data.document_url : '-'}`,
      `created_at: ${typeof data.created_at === 'string' ? data.created_at : '-'}`,
      `updated_at: ${typeof data.updated_at === 'string' ? data.updated_at : '-'}`,
      '',
      typeof data.document_text === 'string' ? data.document_text : '(ไม่มีเนื้อหาแบบข้อความ)',
    ]
    const body = lines.join('\n')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="meeting-document-${id}.txt"`)
    res.status(200).send(`\uFEFF${body}\n`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
