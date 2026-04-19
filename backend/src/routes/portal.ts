import { Router } from 'express'
import {
  academyPortalPayload,
  committeePortalPayload,
  memberPortalPayload,
} from '../data/portalSnapshot.js'
import {
  buildAcademyPortalFromDb,
  buildCommitteePortalFromDb,
  buildMemberPortalFromDb,
} from '../lib/portalFromDb.js'
import { getServiceSupabase } from '../lib/supabase.js'
import { committeeMotionOutcome, majorityRequired } from '../util/meetingRules.js'

type CommitteeVoteChoice = 'approve' | 'reject' | 'abstain'

function isCommitteeVoteChoice(v: string): v is CommitteeVoteChoice {
  return v === 'approve' || v === 'reject' || v === 'abstain'
}

async function getAgendaVoteSummaryForPortal(agendaId: string) {
  const supabase = getServiceSupabase()
  const { data: votes, error } = await supabase.from('meeting_votes').select('vote').eq('agenda_id', agendaId)
  if (error) throw error
  let approve = 0
  let reject = 0
  let abstain = 0
  for (const row of votes ?? []) {
    const vote = typeof row.vote === 'string' ? row.vote : ''
    if (vote === 'approve') approve += 1
    else if (vote === 'reject') reject += 1
    else if (vote === 'abstain') abstain += 1
  }
  return { approve, reject, abstain, total: approve + reject + abstain }
}

/** GET /api/portal/member | committee | academy — รวมข้อมูลจาก Supabase เมื่อตั้งค่า env แล้ว ไม่เช่นนั้นใช้ snapshot */
export const portalRouter = Router()

portalRouter.get('/member', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    res.json(await buildMemberPortalFromDb(supabase))
  } catch {
    res.json(memberPortalPayload)
  }
})

portalRouter.get('/committee', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    res.json(await buildCommitteePortalFromDb(supabase))
  } catch {
    res.json(committeePortalPayload)
  }
})

portalRouter.post('/committee/agendas/:id/vote', async (req, res) => {
  try {
    const agendaId = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    const voterName = typeof req.body?.voter_name === 'string' ? req.body.voter_name.trim() : ''
    const voterRoleCode = typeof req.body?.voter_role_code === 'string' ? req.body.voter_role_code.trim() : 'committee'
    const vote = typeof req.body?.vote === 'string' ? req.body.vote.trim() : ''
    if (!agendaId || !voterName || !isCommitteeVoteChoice(vote)) {
      res.status(400).json({ error: 'ต้องระบุ id, voter_name และ vote (approve/reject/abstain)' })
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

    const { data: existingRows, error: existingErr } = await supabase
      .from('meeting_votes')
      .select('id,voter_name')
      .eq('agenda_id', agendaId)
    if (existingErr) {
      res.status(500).json({ error: 'ตรวจสอบข้อมูลโหวตเดิมไม่สำเร็จ', details: existingErr })
      return
    }
    const existing = (existingRows ?? []).find(
      (row) => typeof row.voter_name === 'string' && row.voter_name.trim().toLowerCase() === voterName.toLowerCase(),
    )
    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('meeting_votes')
        .update({
          vote,
          voted_at: new Date().toISOString(),
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
        app_user_id: null,
        vote,
        voter_name: voterName,
        voter_role_code: voterRoleCode || 'committee',
      })
      if (insertErr) {
        res.status(500).json({ error: 'บันทึกคะแนนโหวตไม่สำเร็จ', details: insertErr })
        return
      }
    }

    const summary = await getAgendaVoteSummaryForPortal(agendaId)
    res.status(201).json({ ok: true, summary })
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

portalRouter.get('/committee/agendas/:id/vote-summary', async (req, res) => {
  try {
    const agendaId = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!agendaId) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: agenda, error: agendaErr } = await supabase
      .from('meeting_agendas')
      .select('id,meeting_session_id')
      .eq('id', agendaId)
      .maybeSingle()
    if (agendaErr || !agenda) {
      res.status(agendaErr ? 500 : 404).json({ error: agendaErr ? 'โหลดวาระไม่สำเร็จ' : 'ไม่พบวาระ', details: agendaErr })
      return
    }
    const summary = await getAgendaVoteSummaryForPortal(agendaId)
    if (agenda.meeting_session_id) {
      const { count, error: cErr } = await supabase
        .from('meeting_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_session_id', agenda.meeting_session_id)
      if (cErr) {
        res.status(500).json({ error: 'นับผู้เข้าประชุมไม่สำเร็จ', details: cErr })
        return
      }
      const attendees = count ?? 0
      const motion = committeeMotionOutcome(attendees, summary.approve)
      res.json({
        ok: true,
        summary,
        attendees,
        majorityRequired: motion.majorityRequired,
        quorumRequired: motion.quorumRequired,
        quorumMet: motion.quorumMet,
        approvedByVote: motion.approvedByVote,
      })
      return
    }
    const attendees = summary.total
    const majorityNeed = attendees > 0 ? majorityRequired(attendees) : 0
    res.json({
      ok: true,
      summary,
      attendees,
      majorityRequired: majorityNeed,
      quorumRequired: 0,
      quorumMet: true,
      approvedByVote: summary.approve >= majorityNeed && majorityNeed > 0,
    })
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

async function userHasCommitteeRole(
  supabase: ReturnType<typeof getServiceSupabase>,
  appUserId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('app_user_roles')
    .select('role_code')
    .eq('user_id', appUserId)
    .eq('role_code', 'committee')
    .maybeSingle()
  return Boolean(data)
}

portalRouter.post('/committee/meetings/:sessionId/rsvp', async (req, res) => {
  try {
    const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId.trim() : ''
    const line_uid = typeof req.body?.line_uid === 'string' ? req.body.line_uid.trim() : ''
    const statusRaw = typeof req.body?.status === 'string' ? req.body.status.trim() : 'yes'
    const status = statusRaw === 'no' ? 'no' : statusRaw === 'maybe' ? 'maybe' : 'yes'
    if (!sessionId || !line_uid) {
      res.status(400).json({ error: 'ต้องระบุ sessionId และ line_uid' })
      return
    }

    const supabase = getServiceSupabase()
    const { data: au, error: uErr } = await supabase.from('app_users').select('id').eq('line_uid', line_uid).maybeSingle()
    if (uErr) {
      res.status(500).json({ error: 'ค้นหาผู้ใช้แอปไม่สำเร็จ', details: uErr })
      return
    }
    if (!au?.id) {
      res.status(403).json({ error: 'ไม่พบบัญชีผู้ใช้แอปสำหรับ LINE นี้ — ให้เข้าแอปและซิงก์บทบาทก่อน' })
      return
    }
    const okCommittee = await userHasCommitteeRole(supabase, au.id as string)
    if (!okCommittee) {
      res.status(403).json({ error: 'เฉพาะผู้มีบทบาทกรรมการ (committee) เท่านั้นที่แจ้งความประสงค์เข้าประชุมล่วงหน้าได้' })
      return
    }
    const { data: session, error: sErr } = await supabase.from('meeting_sessions').select('id').eq('id', sessionId).maybeSingle()
    if (sErr) {
      res.status(500).json({ error: 'โหลดรอบประชุมไม่สำเร็จ', details: sErr })
      return
    }
    if (!session) {
      res.status(404).json({ error: 'ไม่พบรอบประชุม' })
      return
    }

    const now = new Date().toISOString()
    const payload = {
      meeting_session_id: sessionId,
      app_user_id: au.id,
      status,
      updated_at: now,
    }
    const { data: inserted, error: insErr } = await supabase.from('meeting_session_rsvp').insert(payload).select().single()
    const insCode = insErr ? (insErr as { code?: string }).code : undefined
    if (insErr && insCode !== '23505') {
      res.status(500).json({ error: 'บันทึกความประสงค์เข้าประชุมไม่สำเร็จ', details: insErr })
      return
    }
    if (insCode === '23505') {
      const { data: updated, error: upErr } = await supabase
        .from('meeting_session_rsvp')
        .update({ status, updated_at: now })
        .eq('meeting_session_id', sessionId)
        .eq('app_user_id', au.id)
        .select()
        .single()
      if (upErr || !updated) {
        res.status(500).json({ error: 'อัปเดตความประสงค์เข้าประชุมไม่สำเร็จ', details: upErr })
        return
      }
      res.status(200).json({ ok: true, rsvp: updated })
      return
    }
    res.status(201).json({ ok: true, rsvp: inserted })
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

portalRouter.get('/committee/meetings/:sessionId/rsvp-summary', async (req, res) => {
  try {
    const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId.trim() : ''
    if (!sessionId) {
      res.status(400).json({ error: 'ต้องระบุ sessionId' })
      return
    }
    const supabase = getServiceSupabase()
    const { data: rows, error } = await supabase.from('meeting_session_rsvp').select('status').eq('meeting_session_id', sessionId)
    if (error) {
      res.status(500).json({ error: 'โหลดสรุปความประสงค์ไม่สำเร็จ', details: error })
      return
    }
    let yes = 0
    let no = 0
    let maybe = 0
    for (const r of rows ?? []) {
      const s = typeof (r as { status?: string }).status === 'string' ? (r as { status: string }).status : ''
      if (s === 'yes') yes += 1
      else if (s === 'no') no += 1
      else if (s === 'maybe') maybe += 1
    }
    res.json({ ok: true, yes, no, maybe, total: yes + no + maybe })
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

portalRouter.get('/committee/documents/:id/download.txt', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_documents')
      .select('id,title,scope,meeting_session_id,agenda_id,document_url,document_text,created_at,updated_at')
      .eq('id', id)
      .eq('published_to_portal', true)
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
    res.setHeader('Content-Disposition', `attachment; filename="committee-document-${id}.txt"`)
    res.status(200).send(`\uFEFF${body}\n`)
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

portalRouter.get('/committee/meetings/:id/minutes.txt', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('id,title,minutes_markdown,minutes_recorded_by,minutes_updated_at')
      .eq('id', id)
      .eq('minutes_published', true)
      .maybeSingle()
    if (error || !data) {
      res.status(error ? 500 : 404).json({ error: error ? 'โหลดรายงานการประชุมไม่สำเร็จ' : 'ไม่พบข้อมูลประชุม', details: error })
      return
    }
    const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : `meeting-${id}`
    const updatedAt = typeof data.minutes_updated_at === 'string' ? data.minutes_updated_at : '-'
    const recordedBy = typeof data.minutes_recorded_by === 'string' ? data.minutes_recorded_by : '-'
    const markdown = typeof data.minutes_markdown === 'string' ? data.minutes_markdown : '(ไม่มีบันทึกรายงานการประชุม)'
    const body = [`หัวข้อประชุม: ${title}`, `meeting_session_id: ${id}`, `recorded_by: ${recordedBy}`, `updated_at: ${updatedAt}`, '', markdown].join('\n')
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="committee-minutes-${id}.txt"`)
    res.status(200).send(`\uFEFF${body}\n`)
  } catch {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' })
  }
})

portalRouter.get('/academy', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    res.json(await buildAcademyPortalFromDb(supabase))
  } catch {
    res.json(academyPortalPayload)
  }
})
