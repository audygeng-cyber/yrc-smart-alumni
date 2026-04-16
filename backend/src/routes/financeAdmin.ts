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
        res.status(400).json({ error: 'Unknown legal_entity_code' })
        return
      }
      accountsQuery = accountsQuery.eq('legal_entity_id', entity.id)
    }

    const { data: accounts, error: accErr } = await accountsQuery
    if (accErr) {
      res.status(500).json({ error: 'Load bank_accounts failed', details: accErr })
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
        res.status(500).json({ error: 'Load bank_account_signers failed', details: signErr })
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
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/overview', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: entities, error: entErr } = await supabase.from('legal_entities').select('id,code,name_th')
    if (entErr) {
      res.status(500).json({ error: 'Load legal_entities failed', details: entErr })
      return
    }

    const { data: pending, error: pendErr } = await supabase
      .from('payment_requests')
      .select('id,legal_entity_id,amount,status')
      .eq('status', 'pending')
    if (pendErr) {
      res.status(500).json({ error: 'Load payment_requests failed', details: pendErr })
      return
    }

    const { data: donations, error: donErr } = await supabase
      .from('donations')
      .select('id,batch,amount,legal_entity_id')
    if (donErr) {
      res.status(500).json({ error: 'Load donations failed', details: donErr })
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
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

financeAdminRouter.get('/reports/pl-summary', async (req, res) => {
  try {
    const legalEntityCode =
      typeof req.query.legal_entity_code === 'string' ? req.query.legal_entity_code.trim() : ''
    const fromDate = typeof req.query.from === 'string' ? req.query.from.trim() : ''
    const toDate = typeof req.query.to === 'string' ? req.query.to.trim() : ''
    const supabase = getServiceSupabase()

    let legalEntityId: string | null = null
    if (legalEntityCode) {
      const entity = await getLegalEntity(supabase, legalEntityCode)
      if (!entity) {
        res.status(400).json({ error: 'Unknown legal_entity_code' })
        return
      }
      legalEntityId = String(entity.id)
    }

    let entriesQ = supabase.from('journal_entries').select('id,legal_entity_id,entry_date')
    if (legalEntityId) entriesQ = entriesQ.eq('legal_entity_id', legalEntityId)
    if (fromDate) entriesQ = entriesQ.gte('entry_date', fromDate)
    if (toDate) entriesQ = entriesQ.lte('entry_date', toDate)

    const { data: entries, error: eErr } = await entriesQ
    if (eErr) {
      res.status(500).json({ error: 'Load journal_entries failed', details: eErr })
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
      res.status(500).json({ error: 'Load journal_lines failed', details: lErr })
      return
    }

    let chartQ = supabase.from('account_chart').select('id,legal_entity_id,account_code,account_name,account_type')
    if (legalEntityId) chartQ = chartQ.eq('legal_entity_id', legalEntityId)
    const { data: chart, error: cErr } = await chartQ
    if (cErr) {
      res.status(500).json({ error: 'Load account_chart failed', details: cErr })
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
      accountSummaries,
      totals: {
        revenue,
        expense,
        netIncome: revenue - expense,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
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
      res.status(400).json({ error: 'legal_entity_code, purpose, amount > 0 are required' })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legal_entity_code)
    if (!entity) {
      res.status(400).json({ error: 'Unknown legal_entity_code' })
      return
    }

    const policy = resolveFinanceApprovalPolicy(amount)

    if (policy.rule === 'committee_35_over_20000' && !meeting_session_id) {
      res.status(400).json({
        error: 'meeting_session_id is required for payment > 20,000 (ประชุม + มติ)',
      })
      return
    }

    if (policy.rule === 'committee_3of5_upto_20000') {
      if (!bank_account_id) {
        res.status(400).json({
          error: 'bank_account_id is required for <= 20,000 (อนุมัติผู้ลงนาม 3 ใน 5)',
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
        res.status(500).json({ error: 'Load bank account signers failed', details: sErr })
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
      res.status(500).json({ error: 'Create payment request failed', details: insErr })
      return
    }

    res.status(201).json({ ok: true, paymentRequest: row, policy })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
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
      res.status(400).json({ error: 'id, approver_name or approver_signer_id, approver_role_code are required' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: reqRow, error: reqErr } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (reqErr || !reqRow) {
      res.status(reqErr ? 500 : 404).json({ error: reqErr ? 'Load request failed' : 'Not found', details: reqErr })
      return
    }
    if (reqRow.status !== 'pending') {
      res.status(400).json({ error: 'Request is not pending', status: reqRow.status })
      return
    }
    if (approver_role_code !== reqRow.required_role_code) {
      res.status(403).json({
        error: 'Role not allowed for this request',
        required_role_code: reqRow.required_role_code,
      })
      return
    }

    if (reqRow.approval_rule === 'committee_3of5_upto_20000') {
      if (!reqRow.bank_account_id) {
        res.status(400).json({ error: 'Request missing bank_account_id' })
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
        res.status(500).json({ error: 'Signer lookup failed', details: sigErr })
        return
      }
      if (!signer) {
        res.status(403).json({
          error: 'approver_name is not an active KBiz signer for this bank account',
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
          error: 'meeting_session_id is required for this approval rule',
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
          error: sessErr ? 'Load meeting session failed' : 'Meeting session not found',
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
      res.status(500).json({ error: 'Insert approval failed', details: appErr })
      return
    }

    if (decision === 'reject') {
      const { error: upErr } = await supabase
        .from('payment_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) {
        res.status(500).json({ error: 'Reject finalize failed', details: upErr })
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
      res.status(500).json({ error: 'Count approvals failed', details: countErr })
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
        res.status(500).json({ error: 'Approve finalize failed', details: upErr })
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
    const message = e instanceof Error ? e.message : 'Unknown error'
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
        error: 'legal_entity_code, title, expected_participants > 0 are required',
      })
      return
    }

    const supabase = getServiceSupabase()
    const entity = await getLegalEntity(supabase, legal_entity_code)
    if (!entity) {
      res.status(400).json({ error: 'Unknown legal_entity_code' })
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
      res.status(500).json({ error: 'Create meeting session failed', details: error })
      return
    }

    res.status(201).json({
      ok: true,
      meetingSession: row,
      quorumRequired: quorumRequired(expectedParticipants),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
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
      res.status(400).json({ error: 'id, attendee_name, attendee_role_code are required' })
      return
    }
    if (!['committee', 'cram_executive'].includes(attendee_role_code)) {
      res.status(400).json({
        error: 'attendee_role_code must be committee or cram_executive',
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
      res.status(500).json({ error: 'Sign attendance failed', details: error })
      return
    }

    res.status(201).json({ ok: true, attendance: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
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
      res.status(error ? 500 : 404).json({ error: error ? 'Load meeting failed' : 'Meeting not found', details: error })
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
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
