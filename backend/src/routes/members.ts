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
    message: 'กำลังเตรียมหน้ารายการสมาชิก โดยจะเปิดใช้งานร่วมกับ auth และ Supabase RLS',
  })
})

/**
 * โหลดข้อมูลสมาชิกจาก line_uid ที่ผูกไว้แล้ว — ใช้กู้เซสชันฝั่ง frontend หลัง refresh
 * Body: { line_uid }
 */
membersRouter.post('/session-member', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()

    if (error) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: error })
      return
    }
    if (!row?.id) {
      res.status(404).json({ code: 'MEMBER_NOT_LINKED', error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** ตรวจสอบคำร้องล่าสุดของ LINE UID นี้ */
membersRouter.post('/request-status', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: row, error } = await supabase
      .from('member_update_requests')
      .select(
        'id,request_type,status,created_at,president_approved_at,admin_approved_at,rejected_at,rejection_reason,requested_data,action_history',
      )
      .eq('line_uid', line_uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: error })
      return
    }
    if (!row) {
      res.status(404).json({ code: 'REQUEST_NOT_FOUND', error: 'ยังไม่พบคำร้องของ LINE UID นี้' })
      return
    }

    res.json({ ok: true, request: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * ผูก LINE UID กับสมาชิกที่มีอยู่แล้ว (กฎ: รุ่น + ชื่อ + นามสกุล ตรงกันหนึ่งแถวเท่านั้น)
 * แนะนำให้ได้ line_uid จาก POST /api/auth/line/token (ตรวจ id_token กับ LINE แล้ว)
 */
membersRouter.post('/verify-link', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const batch = typeof req.body?.batch === 'string' ? req.body.batch : ''
    const first_name = typeof req.body?.first_name === 'string' ? req.body.first_name : ''
    const last_name = typeof req.body?.last_name === 'string' ? req.body.last_name : ''

    if (!line_uid || !batch || !first_name || !last_name) {
      res.status(400).json({ error: 'ต้องระบุ line_uid, batch, first_name และ last_name' })
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
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
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
      res.status(500).json({ error: 'ตรวจสอบ LINE UID ไม่สำเร็จ', details: uidErr })
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
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ', details: upErr })
      return
    }

    const full = await fetchMemberRowById(supabase, member.id as string)
    res.json({ ok: true, memberId: member.id, linked: true, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
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
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }
    if (!rawUpdates || typeof rawUpdates !== 'object' || Array.isArray(rawUpdates)) {
      res.status(400).json({ error: 'ต้องระบุ updates object' })
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
      res.status(500).json({ error: 'ค้นหาข้อมูลไม่สำเร็จ', details: qErr })
      return
    }
    if (!row) {
      res.status(403).json({
        error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้ — ใช้ "ตรวจสอบและผูก" ก่อน',
      })
      return
    }

    const { error: upErr } = await supabase
      .from('members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    if (upErr) {
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ', details: upErr })
      return
    }

    const full = await fetchMemberRowById(supabase, row.id as string)
    res.json({ ok: true, memberId: row.id, member: full })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** สมัครใหม่: บันทึกคำร้อง (รอประธานรุ่น → Admin) */
membersRouter.post('/register-request', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'ต้องส่ง JSON body' })
      return
    }

    const line_uid = typeof req.body.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
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
      res.status(500).json({ error: 'ตรวจสอบ LINE UID ไม่สำเร็จ', details: uidErr })
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
        action_history: [
          {
            action: 'submitted',
            actor: 'member',
            at: new Date().toISOString(),
            comment: null,
            from_status: null,
            to_status: 'pending_president',
          },
        ],
        status: 'pending_president',
      })
      .select('id')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'สร้างคำร้องไม่สำเร็จ', details: insErr })
      return
    }

    void notifyNewMemberRequest(row.id as string)

    res.status(201).json({ ok: true, requestId: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

type FundScope = 'yupparaj_school' | 'association' | 'cram_school'

function isFundScope(s: string): s is FundScope {
  return s === 'yupparaj_school' || s === 'association' || s === 'cram_school'
}

/**
 * ประวัติการบริจาคของสมาชิก (ผ่านพอร์ทัล)
 * Body: { line_uid }
 */
membersRouter.post('/donations/history', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    if (!line_uid) {
      res.status(400).json({ error: 'ต้องระบุ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: member, error: mErr } = await supabase.from('members').select('id').eq('line_uid', line_uid).maybeSingle()
    if (mErr) {
      res.status(500).json({ error: 'โหลดข้อมูลสมาชิกไม่สำเร็จ', details: mErr })
      return
    }
    if (!member) {
      res.status(403).json({ error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }

    const { data: donRows, error: dErr } = await supabase
      .from('donations')
      .select('id, amount, created_at, transfer_at, activity_id, slip_file_url, note, fund_scope')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(40)
    if (dErr) {
      res.status(500).json({ error: 'โหลดประวัติการบริจาคไม่สำเร็จ', details: dErr })
      return
    }

    const activityIds = Array.from(
      new Set((donRows ?? []).map((r) => (r.activity_id == null ? '' : String(r.activity_id))).filter(Boolean)),
    )
    const titleById = new Map<string, { title: string; category: string }>()
    if (activityIds.length > 0) {
      const { data: acts } = await supabase.from('school_activities').select('id, title, category').in('id', activityIds)
      for (const a of acts ?? []) {
        const row = a as { id: string; title?: string | null; category?: string | null }
        titleById.set(String(row.id), {
          title: String(row.title ?? '').trim() || '—',
          category: String(row.category ?? '').trim() || 'ทั่วไป',
        })
      }
    }

    const donations = (donRows ?? []).map((r) => {
      const aid = r.activity_id == null ? '' : String(r.activity_id)
      const act = aid ? titleById.get(aid) : undefined
      const n = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount ?? 0)
      return {
        id: String(r.id),
        amount: Number.isFinite(n) ? n : 0,
        createdAt: r.created_at ?? null,
        transferAt: (r as { transfer_at?: string | null }).transfer_at ?? null,
        activityId: aid || null,
        activityTitle: act?.title ?? null,
        activityCategory: act?.category ?? null,
        fundScope: r.fund_scope != null && String(r.fund_scope).trim() ? String(r.fund_scope) : null,
        slipFileUrl: r.slip_file_url ?? null,
        note: r.note ?? null,
      }
    })

    res.json({ ok: true, donations })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * บริจาคผ่านพอร์ทัลสมาชิก (กิจกรรมโรงเรียนยุพราช / สมาคม / กวดวิชา — ตาม fund_scope ของกิจกรรม)
 * Body: { line_uid, activity_id, amount, transfer_at?, slip_file_url?, note? }
 * ยอด yupparaj_school ไม่ผูก legal_entity ของสมาคม/กวดวิชา (แยกบัญชีเชิงนโยบาย)
 */
membersRouter.post('/donations', async (req, res) => {
  try {
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const activity_id = typeof req.body?.activity_id === 'string' ? req.body.activity_id.trim() : ''
    const amount = Number(req.body?.amount)
    const note = typeof req.body?.note === 'string' && req.body.note.trim() ? req.body.note.trim() : null
    const slip_file_url =
      typeof req.body?.slip_file_url === 'string' && req.body.slip_file_url.trim()
        ? req.body.slip_file_url.trim()
        : null
    let transfer_at: string | null = null
    if (typeof req.body?.transfer_at === 'string' && req.body.transfer_at.trim()) {
      const t = new Date(req.body.transfer_at.trim())
      transfer_at = Number.isFinite(t.getTime()) ? t.toISOString() : null
    }

    if (!line_uid || !activity_id || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'ต้องระบุ line_uid, activity_id และ amount > 0' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: member, error: mErr } = await supabase.from('members').select('*').eq('line_uid', line_uid).maybeSingle()
    if (mErr) {
      res.status(500).json({ error: 'โหลดข้อมูลสมาชิกไม่สำเร็จ', details: mErr })
      return
    }
    if (!member) {
      res.status(403).json({ error: 'ยังไม่พบสมาชิกที่ผูก LINE UID นี้' })
      return
    }

    const { data: activity, error: aErr } = await supabase
      .from('school_activities')
      .select('id, active, fund_scope')
      .eq('id', activity_id)
      .maybeSingle()
    if (aErr) {
      res.status(500).json({ error: 'โหลดกิจกรรมไม่สำเร็จ', details: aErr })
      return
    }
    if (!activity || activity.active !== true) {
      res.status(400).json({ error: 'ไม่พบกิจกรรมหรือกิจกรรมปิดรับบริจาค' })
      return
    }

    const rawScope = typeof activity.fund_scope === 'string' ? activity.fund_scope.trim() : 'association'
    const fund_scope: FundScope = isFundScope(rawScope) ? rawScope : 'association'

    let legal_entity_id: string | null = null
    if (fund_scope === 'association' || fund_scope === 'cram_school') {
      const code = fund_scope === 'association' ? 'association' : 'cram_school'
      const { data: ent, error: eErr } = await supabase.from('legal_entities').select('id').eq('code', code).maybeSingle()
      if (eErr) {
        res.status(500).json({ error: 'โหลดนิติบุคคลไม่สำเร็จ', details: eErr })
        return
      }
      legal_entity_id = ent?.id ? String(ent.id) : null
    }

    const { data: appUser } = await supabase.from('app_users').select('id').eq('line_uid', line_uid).maybeSingle()

    const donor_first_name = typeof member.first_name === 'string' ? member.first_name : null
    const donor_last_name = typeof member.last_name === 'string' ? member.last_name : null
    const donor_batch = typeof member.batch === 'string' ? member.batch : null
    const donor_batch_name = typeof member.batch_name === 'string' ? member.batch_name : null

    const { data: row, error: insErr } = await supabase
      .from('donations')
      .insert({
        activity_id,
        member_id: member.id,
        app_user_id: appUser?.id ?? null,
        batch: donor_batch,
        amount,
        currency: 'THB',
        transfer_at,
        slip_file_url,
        note,
        legal_entity_id,
        fund_scope,
        donor_first_name,
        donor_last_name,
        donor_batch,
        donor_batch_name,
      })
      .select('id,amount,activity_id,fund_scope,created_at,transfer_at,slip_file_url')
      .single()

    if (insErr || !row) {
      res.status(500).json({ error: 'บันทึกการบริจาคไม่สำเร็จ', details: insErr })
      return
    }

    res.status(201).json({ ok: true, donation: row })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
