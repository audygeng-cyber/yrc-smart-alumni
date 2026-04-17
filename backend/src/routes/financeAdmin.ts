import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { resolveFinanceApprovalPolicy } from '../util/financePolicy.js'
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
        'id,requested_at,legal_entity_id,bank_account_id,meeting_session_id,purpose,amount,currency,approval_rule,required_role_code,required_approvals,status,requested_by,kbiz_transfer_ref,transfer_slip_file_url,note',
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
      purpose: r.purpose,
      amount: r.amount,
      currency: r.currency,
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

financeAdminRouter.post('/payment-requests', async (req, res) => {
  try {
    const legal_entity_code =
      typeof req.body?.legal_entity_code === 'string' ? req.body.legal_entity_code.trim() : ''
    const purpose = typeof req.body?.purpose === 'string' ? req.body.purpose.trim() : ''
    const amount = Number(req.body?.amount)
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

    if (!legal_entity_code || !purpose || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'ต้องระบุ legal_entity_code, purpose และ amount > 0' })
      return
    }

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
      if (!bank_account_id) {
        res.status(400).json({
          error: 'ต้องระบุ bank_account_id สำหรับยอด <= 20,000 (อนุมัติผู้ลงนาม 3 ใน 5)',
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

    const { data: row, error: insErr } = await supabase
      .from('payment_requests')
      .insert({
        legal_entity_id: entity.id,
        bank_account_id,
        meeting_session_id,
        purpose,
        amount,
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

    res.status(201).json({ ok: true, paymentRequest: row, policy })
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
