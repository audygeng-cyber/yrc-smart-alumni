import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { resolveFinanceApprovalPolicy } from '../util/financePolicy.js'

export const financeAdminRouter = Router()

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

    if (!legal_entity_code || !purpose || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'legal_entity_code, purpose, amount > 0 are required' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: entity, error: eErr } = await supabase
      .from('legal_entities')
      .select('id,code')
      .eq('code', legal_entity_code)
      .maybeSingle()
    if (eErr || !entity) {
      res.status(400).json({ error: 'Unknown legal_entity_code', details: eErr })
      return
    }

    const policy = resolveFinanceApprovalPolicy(amount)
    const { data: row, error: insErr } = await supabase
      .from('payment_requests')
      .insert({
        legal_entity_id: entity.id,
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
    const approver_role_code =
      typeof req.body?.approver_role_code === 'string' ? req.body.approver_role_code.trim() : ''
    const decision = req.body?.decision === 'reject' ? 'reject' : 'approve'
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : null

    if (!id || !approver_name || !approver_role_code) {
      res.status(400).json({ error: 'id, approver_name, approver_role_code are required' })
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

    const { error: appErr } = await supabase.from('payment_request_approvals').insert({
      payment_request_id: id,
      approver_name,
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
    const required = Number(reqRow.required_approvals ?? 0)
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
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
