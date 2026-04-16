import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { notifyNewMemberRequest } from '../lib/webPush.js'
import { parseMemberSelfUpdates } from '../util/memberSelfUpdate.js'
import { normalizeWhitespace } from '../util/normalize.js'

export const membersRouter = Router()

async function fetchMemberRowById(supabase: ReturnType<typeof getServiceSupabase>, id: string) {
  const { data, error } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

membersRouter.get('/', (_req, res) => {
  res.json({
    message: 'Member listing will be added with auth and Supabase RLS.',
  })
})

/**
 * โหลดข้อมูลสมาชิกจาก line_uid ที่ผูกไว้แล้ว — ใช้กู้ session ฝั่ง frontend หลัง refresh
 * Body: { line_uid }
 */
membersRouter.post('/session-member', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'line_uid is required' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()

    if (error) {
      res.status(500).json({ error: 'Lookup failed', details: error })
      return
    }
    if (!row?.id) {
      res.status(404).json({ code: 'MEMBER_NOT_LINKED', error: 'ยังไม่พบสมาชิกที่ผูก Line UID นี้' })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** ตรวจสอบคำร้องล่าสุดของ LINE UID นี้ */
membersRouter.post('/request-status', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'line_uid is required' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('member_update_requests')
      .select('id,request_type,status,created_at,president_approved_at,admin_approved_at,rejected_at,rejection_reason')
      .eq('line_uid', line_uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: 'Lookup failed', details: error })
      return
    }
    if (!row) {
      res.status(404).json({ code: 'REQUEST_NOT_FOUND', error: 'ยังไม่พบคำร้องของ Line UID นี้' })
      return
    }

    res.json({ ok: true, request: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/**
 * ผูก Line UID กับสมาชิกที่มีอยู่แล้ว (กฎ: รุ่น + ชื่อ + นามสกุล ตรงกันหนึ่งแถวเท่านั้น)
 * แนะนำให้ได้ line_uid จาก POST /api/auth/line/token (ตรวจ id_token กับ LINE แล้ว)
 */
membersRouter.post('/verify-link', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const batch = typeof req.body?.batch === 'string' ? req.body.batch : ''
    const first_name = typeof req.body?.first_name === 'string' ? req.body.first_name : ''
    const last_name = typeof req.body?.last_name === 'string' ? req.body.last_name : ''

    if (!line_uid || !batch || !first_name || !last_name) {
      res.status(400).json({ error: 'line_uid, batch, first_name, last_name are required' })
      return
    }

    const nb = normalizeWhitespace(batch)
    const nf = normalizeWhitespace(first_name)
    const nl = normalizeWhitespace(last_name)

    const supabase = getServiceSupabase()

    const { data: rows, error: qErr } = await supabase
      .from('members')
      .select('id, line_uid')
      .eq('batch', nb)
      .eq('first_name', nf)
      .eq('last_name', nl)

    if (qErr) {
      res.status(500).json({ error: 'Lookup failed', details: qErr })
      return
    }

    const list = rows ?? []
    if (list.length === 0) {
      res.status(404).json({
        code: 'NOT_IN_REGISTRY',
        error: 'ไม่พบข้อมูลในทะเบียนสมาชิก',
      })
      return
    }

    if (list.length > 1) {
      res.status(409).json({
        code: 'AMBIGUOUS_MATCH',
        error: 'พบข้อมูลซ้ำในระบบ กรุณาติดต่อผู้ดูแล',
        count: list.length,
      })
      return
    }

    const member = list[0]!

    if (member.line_uid && member.line_uid !== line_uid) {
      res.status(409).json({
        code: 'MEMBER_ALREADY_LINKED',
        error: 'สมาชิกนี้ผูกบัญชี LINE อื่นแล้ว',
      })
      return
    }

    const { data: uidOwner, error: uidErr } = await supabase
      .from('members')
      .select('id')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (uidErr) {
      res.status(500).json({ error: 'Line UID check failed', details: uidErr })
      return
    }

    if (uidOwner && uidOwner.id !== member.id) {
      res.status(409).json({
        code: 'LINE_UID_TAKEN',
        error: 'บัญชี LINE นี้ถูกใช้กับสมาชิกอื่นแล้ว',
      })
      return
    }

    if (member.line_uid === line_uid) {
      const full = await fetchMemberRowById(supabase, member.id as string)
      res.json({ ok: true, memberId: member.id, alreadyLinked: true, member: full })
      return
    }

    const { error: upErr } = await supabase
      .from('members')
      .update({ line_uid, updated_at: new Date().toISOString() })
      .eq('id', member.id)

    if (upErr) {
      res.status(500).json({ error: 'Update failed', details: upErr })
      return
    }

    const full = await fetchMemberRowById(supabase, member.id as string)
    res.json({ ok: true, memberId: member.id, linked: true, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/**
 * สมาชิกที่ผูก line_uid แล้ว — อัปเดตฟิลด์รอง (ไม่แก้ รุ่น/ชื่อ/นามสกุล จากฟอร์มนี้)
 * Body: { line_uid, updates: { "เบอร์โทรศัพท์": "...", ... } } หรือใช้ชื่อคอลัมน์ DB
 */
membersRouter.post('/update-self', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const rawUpdates = req.body?.updates
    if (!line_uid) {
      res.status(400).json({ error: 'line_uid is required' })
      return
    }
    if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
      res.status(400).json({ error: 'updates object is required' })
      return
    }

    const updates = parseMemberSelfUpdates(rawUpdates as Record<string, unknown>)
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'ไม่มีฟิลด์ที่อนุญาตให้แก้ หรือค่าว่างทั้งหมด' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error: qErr } = await supabase
      .from('members')
      .select('id, line_uid')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (qErr) {
      res.status(500).json({ error: 'Lookup failed', details: qErr })
      return
    }
    if (!row) {
      res.status(403).json({
        error: 'ยังไม่พบสมาชิกที่ผูก Line UID นี้ — ใช้ "ตรวจสอบและผูก" ก่อน',
      })
      return
    }

    const { error: upErr } = await supabase
      .from('members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    if (upErr) {
      res.status(500).json({ error: 'Update failed', details: upErr })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** สมัครใหม่: บันทึกคำร้อง (รอประธานรุ่น → Admin) */
membersRouter.post('/register-request', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'JSON body required' })
      return
    }

    const line_uid = typeof req.body.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'line_uid is required' })
      return
    }

    const body = req.body as Record<string, unknown>
    const requested_data: Record<string, unknown> = { ...body }
    delete requested_data.line_uid

    const supabase = getServiceSupabase()

    const { data: uidOwner, error: uidErr } = await supabase
      .from('members')
      .select('id')
      .eq('line_uid', line_uid)
      .maybeSingle()

    if (uidErr) {
      res.status(500).json({ error: 'Line UID check failed', details: uidErr })
      return
    }

    if (uidOwner) {
      res.status(409).json({ code: 'LINE_UID_TAKEN', error: 'บัญชี LINE นี้ลงทะเบียนแล้ว' })
      return
    }

    const { data: row, error: insErr } = await supabase
      .from('member_update_requests')
      .insert({
        line_uid,
        request_type: 'new_registration',
        requested_data,
        status: 'pending_president',
      })
      .select('id')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'Failed to create request', details: insErr })
      return
    }

    void notifyNewMemberRequest(row.id as string)

    res.status(201).json({ ok: true, requestId: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
