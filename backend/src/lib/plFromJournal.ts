import type { SupabaseClient } from '@supabase/supabase-js'

export type PlTotals = { revenue: number; expense: number; netIncome: number }

/** ช่วง entry_date เป็น YYYY-MM-DD ตามปฏิทิน UTC (ให้สอดคล้องกับ donation month ใน portal) */
export function monthEntryDateRangeUtc(): { fromDate: string; toDate: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const fromDate = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const lastD = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const toDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`
  return { fromDate, toDate }
}

/**
 * คำนวณยอดรายรับ/รายจ่าย/กำไรสุทธิจาก journal — logic เดียวกับ
 * GET /api/admin/finance/reports/pl-summary
 * คืน null ถ้าไม่มี entity / ไม่มีรายการ journal ในช่วง / error
 */
export async function tryPlTotalsForLegalEntityMonth(
  supabase: SupabaseClient,
  params: { legalEntityId: string; fromDate: string; toDate: string },
): Promise<PlTotals | null> {
  const { legalEntityId, fromDate, toDate } = params

  const entriesQ = supabase
    .from('journal_entries')
    .select('id,legal_entity_id,entry_date')
    .eq('legal_entity_id', legalEntityId)
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)

  const { data: entries, error: eErr } = await entriesQ
  if (eErr) return null

  const entryIds = (entries ?? []).map((e) => String(e.id))
  if (entryIds.length === 0) return null

  const { data: lines, error: lErr } = await supabase
    .from('journal_lines')
    .select('account_id,debit,credit,journal_entry_id')
    .in('journal_entry_id', entryIds)
  if (lErr) return null

  const { data: chart, error: cErr } = await supabase
    .from('account_chart')
    .select('id,legal_entity_id,account_code,account_name,account_type')
    .eq('legal_entity_id', legalEntityId)
  if (cErr) return null

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
    { accountCode: string; accountName: string; accountType: string; debit: number; credit: number }
  >()
  for (const ln of lines ?? []) {
    const accountId = String(ln.account_id)
    const meta = accountMap.get(accountId)
    if (!meta) continue
    const d = Number(ln.debit ?? 0)
    const c = Number(ln.credit ?? 0)
    const cur = byAccount.get(accountId) ?? {
      accountCode: meta.code,
      accountName: meta.name,
      accountType: meta.type,
      debit: 0,
      credit: 0,
    }
    cur.debit += d
    cur.credit += c
    byAccount.set(accountId, cur)
  }

  const accountSummaries = Array.from(byAccount.values()).map((x) => {
    let net = x.credit - x.debit
    if (x.accountType === 'expense' || x.accountType === 'asset') {
      net = x.debit - x.credit
    }
    return { ...x, net }
  })

  const revenue = accountSummaries.filter((x) => x.accountType === 'revenue').reduce((s, x) => s + x.net, 0)
  const expense = accountSummaries.filter((x) => x.accountType === 'expense').reduce((s, x) => s + x.net, 0)

  return {
    revenue,
    expense,
    netIncome: revenue - expense,
  }
}

/** ลองใช้นิติบุคคล `association` ก่อน — ไม่มีตาราง/ไม่มีข้อมูล → null */
export async function tryAssociationMonthlyPlFromJournal(supabase: SupabaseClient): Promise<PlTotals | null> {
  const { data: entity, error: entErr } = await supabase
    .from('legal_entities')
    .select('id')
    .eq('code', 'association')
    .maybeSingle()
  if (entErr || !entity?.id) return null

  const { fromDate, toDate } = monthEntryDateRangeUtc()
  return tryPlTotalsForLegalEntityMonth(supabase, {
    legalEntityId: String(entity.id),
    fromDate,
    toDate,
  })
}
