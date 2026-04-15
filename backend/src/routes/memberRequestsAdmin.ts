import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { normalizeWhitespace } from '../util/normalize.js'
import { memberInsertFromRequestedData } from '../util/memberFromRequestedData.js'

export const memberRequestsAdminRouter = Router()

memberRequestsAdminRouter.get('/', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const supabase = getServiceSupabase()
    let q = supabase
      .from('member_update_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      q = q.eq('status', status)
    }

    const { data, error } = await q
    if (error) {
      res.status(500).json({ error: 'List failed', details: error })
      return
    }

    res.json({ ok: true, requests: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/president-approve', async (req, res) => {
  try {
    const id = req.params.id
    const approvedBy =
      typeof req.body?.approved_by === 'string' && req.body.approved_by.trim()
        ? req.body.approved_by.trim()
        : 'president'

    const supabase = getServiceSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'Fetch failed' : 'Not found', details: fetchErr })
      return
    }

    if (row.status !== 'pending_president') {
      res.status(400).json({ error: 'Invalid status for president approval', current: row.status })
      return
    }

    const { error: upErr } = await supabase
      .from('member_update_requests')
      .update({
        president_approved_by: approvedBy,
        president_approved_at: new Date().toISOString(),
        status: 'pending_admin',
      })
      .eq('id', id)

    if (upErr) {
      res.status(500).json({ error: 'Update failed', details: upErr })
      return
    }

    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/admin-approve', async (req, res) => {
  try {
    const id = req.params.id
    const approvedBy =
      typeof req.body?.approved_by === 'string' && req.body.approved_by.trim()
        ? req.body.approved_by.trim()
        : 'admin'

    const supabase = getServiceSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'Fetch failed' : 'Not found', details: fetchErr })
      return
    }

    if (row.status !== 'pending_admin') {
      res.status(400).json({ error: 'Invalid status for admin approval', current: row.status })
      return
    }

    const line_uid = typeof row.line_uid === 'string' ? row.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'Request has no line_uid' })
      return
    }

    const requested_data =
      row.requested_data && typeof row.requested_data === 'object' && !Array.isArray(row.requested_data)
        ? (row.requested_data as Record<string, unknown>)
        : {}

    if (row.request_type === 'new_registration') {
      const { data: uidDup } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()
      if (uidDup) {
        res.status(409).json({ code: 'LINE_UID_EXISTS', error: 'มีสมาชิกใช้ Line UID นี้แล้ว' })
        return
      }

      const batch = typeof requested_data.batch === 'string' ? normalizeWhitespace(requested_data.batch) : ''
      const first_name =
        typeof requested_data.first_name === 'string' ? normalizeWhitespace(requested_data.first_name) : ''
      const last_name =
        typeof requested_data.last_name === 'string' ? normalizeWhitespace(requested_data.last_name) : ''

      if (batch && first_name && last_name) {
        const { data: triple } = await supabase
          .from('members')
          .select('id')
          .eq('batch', batch)
          .eq('first_name', first_name)
          .eq('last_name', last_name)

        if (triple && triple.length > 0) {
          res.status(409).json({
            code: 'MEMBER_TRIPLE_EXISTS',
            error: 'มีสมาชิกรุ่น+ชื่อ+นามสกุลนี้ในทะเบียนแล้ว',
          })
          return
        }
      }

      const insertPayload = memberInsertFromRequestedData(line_uid, requested_data)
      const { data: newMember, error: insErr } = await supabase
        .from('members')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insErr || !newMember) {
        res.status(500).json({ error: 'Insert member failed', details: insErr })
        return
      }

      const { error: finErr } = await supabase
        .from('member_update_requests')
        .update({
          admin_approved_by: approvedBy,
          admin_approved_at: new Date().toISOString(),
          status: 'approved',
        })
        .eq('id', id)

      if (finErr) {
        res.status(500).json({ error: 'Request finalize failed', details: finErr })
        return
      }

      res.json({ ok: true, memberId: newMember.id })
      return
    }

    res.status(400).json({ error: `Unsupported request_type: ${row.request_type}` })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/reject', async (req, res) => {
  try {
    const id = req.params.id
    const rejectedBy =
      typeof req.body?.rejected_by === 'string' && req.body.rejected_by.trim()
        ? req.body.rejected_by.trim()
        : 'admin'
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim() : null

    const supabase = getServiceSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'Fetch failed' : 'Not found' })
      return
    }

    if (row.status !== 'pending_president' && row.status !== 'pending_admin') {
      res.status(400).json({ error: 'Cannot reject in current status', current: row.status })
      return
    }

    const { error: upErr } = await supabase
      .from('member_update_requests')
      .update({
        rejected_by: rejectedBy,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        status: 'rejected',
      })
      .eq('id', id)

    if (upErr) {
      res.status(500).json({ error: 'Reject failed', details: upErr })
      return
    }

    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
