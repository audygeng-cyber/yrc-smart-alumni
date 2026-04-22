import { Router } from 'express'
import { adminAuth } from '../middleware/adminAuth.js'
import { presidentAuth } from '../middleware/presidentAuth.js'
import { getServiceSupabase } from '../lib/supabase.js'
import { assertPresidentForRequestBatch } from '../util/presidentKeys.js'
import { normalizeWhitespace } from '../util/normalize.js'
import { memberInsertFromRequestedData } from '../util/memberFromRequestedData.js'
import { appendMemberRequestHistory, buildMemberRequestHistoryEntry } from '../util/memberRequestHistory.js'
import { syncAppUserAfterMemberLink } from '../util/syncAppUserWithMember.js'

export const memberRequestsAdminRouter = Router()

memberRequestsAdminRouter.get('/', adminAuth, async (req, res) => {
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
      res.status(500).json({ error: 'โหลดรายการไม่สำเร็จ', details: error })
      return
    }

    res.json({ ok: true, requests: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/president-approve', presidentAuth, async (req, res) => {
  try {
    const id = req.params.id
    const approvedBy =
      typeof req.body?.approved_by === 'string' && req.body.approved_by.trim()
        ? req.body.approved_by.trim()
        : 'president'
    const comment =
      typeof req.body?.comment === 'string' && req.body.comment.trim() ? req.body.comment.trim() : null

    const supabase = getServiceSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'โหลดข้อมูลไม่สำเร็จ' : 'ไม่พบข้อมูล', details: fetchErr })
      return
    }

    if (row.status !== 'pending_president') {
      res.status(400).json({ error: 'สถานะคำร้องไม่ถูกต้องสำหรับการอนุมัติของประธานรุ่น', current: row.status })
      return
    }

    if (!assertPresidentForRequestBatch(req, row, res)) return

    const approvedAt = new Date().toISOString()
    const { error: upErr } = await supabase
      .from('member_update_requests')
      .update({
        president_approved_by: approvedBy,
        president_approved_at: approvedAt,
        status: 'pending_admin',
        action_history: appendMemberRequestHistory(
          row.action_history,
          buildMemberRequestHistoryEntry({
            action: 'president_approved',
            actor: approvedBy,
            at: approvedAt,
            comment,
            fromStatus: 'pending_president',
            toStatus: 'pending_admin',
          }),
        ),
      })
      .eq('id', id)

    if (upErr) {
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ', details: upErr })
      return
    }

    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/admin-approve', adminAuth, async (req, res) => {
  try {
    const id = req.params.id
    const approvedBy =
      typeof req.body?.approved_by === 'string' && req.body.approved_by.trim()
        ? req.body.approved_by.trim()
        : 'admin'
    const comment =
      typeof req.body?.comment === 'string' && req.body.comment.trim() ? req.body.comment.trim() : null

    const supabase = getServiceSupabase()
    const { data: row, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !row) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'โหลดข้อมูลไม่สำเร็จ' : 'ไม่พบข้อมูล', details: fetchErr })
      return
    }

    if (row.status !== 'pending_admin') {
      res.status(400).json({ error: 'สถานะคำร้องไม่ถูกต้องสำหรับการอนุมัติของ Admin', current: row.status })
      return
    }

    const line_uid = typeof row.line_uid === 'string' ? row.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'คำร้องนี้ไม่มี LINE UID' })
      return
    }

    const requested_data =
      row.requested_data && typeof row.requested_data === 'object' && !Array.isArray(row.requested_data)
        ? (row.requested_data as Record<string, unknown>)
        : {}

    if (row.request_type === 'new_registration') {
      const { data: uidDup } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()
      if (uidDup) {
        res.status(409).json({ code: 'LINE_UID_EXISTS', error: 'มีสมาชิกใช้ LINE UID นี้แล้ว' })
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
        res.status(500).json({ error: 'เพิ่มข้อมูลสมาชิกไม่สำเร็จ', details: insErr })
        return
      }

      const synced = await syncAppUserAfterMemberLink(supabase, line_uid, newMember.id as string)
      if (!synced.ok) {
        await supabase.from('members').delete().eq('id', newMember.id as string)
        res.status(500).json({ error: 'อัปเดต app_users ไม่สำเร็จ', details: synced.error })
        return
      }

      const approvedAt = new Date().toISOString()
      const { error: finErr } = await supabase
        .from('member_update_requests')
        .update({
          admin_approved_by: approvedBy,
          admin_approved_at: approvedAt,
          status: 'approved',
          action_history: appendMemberRequestHistory(
            row.action_history,
            buildMemberRequestHistoryEntry({
              action: 'admin_approved',
              actor: approvedBy,
              at: approvedAt,
              comment,
              fromStatus: 'pending_admin',
              toStatus: 'approved',
            }),
          ),
        })
        .eq('id', id)

      if (finErr) {
        res.status(500).json({ error: 'ปิดคำร้องไม่สำเร็จ', details: finErr })
        return
      }

      res.json({ ok: true, memberId: newMember.id })
      return
    }

    res.status(400).json({ error: `ไม่รองรับ request_type: ${row.request_type}` })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

memberRequestsAdminRouter.post('/:id/reject', presidentAuth, async (req, res) => {
  try {
    const id = req.params.id
    const rejectedBy =
      typeof req.body?.rejected_by === 'string' && req.body.rejected_by.trim()
        ? req.body.rejected_by.trim()
        : 'admin'
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim() : null
    const comment =
      typeof req.body?.comment === 'string' && req.body.comment.trim() ? req.body.comment.trim() : reason

    const supabase = getServiceSupabase()
    const { data: fullRow, error: fetchErr } = await supabase
      .from('member_update_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !fullRow) {
      res.status(fetchErr ? 500 : 404).json({ error: fetchErr ? 'โหลดข้อมูลไม่สำเร็จ' : 'ไม่พบข้อมูล' })
      return
    }

    if (fullRow.status !== 'pending_president' && fullRow.status !== 'pending_admin') {
      res.status(400).json({ error: 'ไม่สามารถปฏิเสธคำร้องในสถานะปัจจุบัน', current: fullRow.status })
      return
    }

    if (!assertPresidentForRequestBatch(req, fullRow, res)) return

    const rejectedAt = new Date().toISOString()
    const { error: upErr } = await supabase
      .from('member_update_requests')
      .update({
        rejected_by: rejectedBy,
        rejected_at: rejectedAt,
        rejection_reason: reason,
        status: 'rejected',
        action_history: appendMemberRequestHistory(
          fullRow.action_history,
          buildMemberRequestHistoryEntry({
            action: 'rejected',
            actor: rejectedBy,
            at: rejectedAt,
            comment,
            fromStatus: fullRow.status,
            toStatus: 'rejected',
          }),
        ),
      })
      .eq('id', id)

    if (upErr) {
      res.status(500).json({ error: 'ปฏิเสธคำร้องไม่สำเร็จ', details: upErr })
      return
    }

    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
