import rateLimit from 'express-rate-limit'
import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { readMemberIdentityQrToken } from '../util/memberIdentityQrToken.js'
import { isMemberMembershipActive } from '../util/memberMembership.js'

export const electionPublicRouter = Router()

type ElectionEventRow = {
  id: string
  slug: string
  title_th: string
  is_active: boolean
  claim_starts_at: string | null
  claim_ends_at: string | null
}

const electionCardClaimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
})

function parseUuid(s: unknown): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim().toLowerCase()
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(t)
  ) {
    return null
  }
  return t
}

function isWithinClaimWindow(ev: {
  claim_starts_at: string | null
  claim_ends_at: string | null
}): boolean {
  const now = Date.now()
  if (ev.claim_starts_at) {
    const s = new Date(ev.claim_starts_at).getTime()
    if (Number.isFinite(s) && s > now) return false
  }
  if (ev.claim_ends_at) {
    const e = new Date(ev.claim_ends_at).getTime()
    if (Number.isFinite(e) && e < now) return false
  }
  return true
}

/** รายการงานที่เปิดรับบัตรตอนนี้ (ไม่ต้องล็อกอิน) */
electionPublicRouter.get('/events/active', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: rows, error } = await supabase
      .from('election_events')
      .select('id, slug, title_th, claim_starts_at, claim_ends_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'โหลดรายการงานไม่สำเร็จ', details: error.message })
      return
    }

    const events = (rows ?? []).filter((ev) => isWithinClaimWindow(ev))
    res.json({ ok: true, events })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/**
 * บันทึกการรับบัตรจากการสแกน QR
 * Body: { t: string (member_identity_qr_token), election_event_slug?: string, election_event_id?: uuid }
 */
electionPublicRouter.post('/card-claim', electionCardClaimLimiter, async (req, res) => {
  try {
    const t = readMemberIdentityQrToken({ member_identity_qr_token: (req.body as { t?: unknown })?.t })
    const slugRaw = typeof req.body?.election_event_slug === 'string' ? req.body.election_event_slug.trim() : ''
    const slug = slugRaw.toLowerCase()
    const eventId = parseUuid(req.body?.election_event_id)

    if (!t) {
      res.status(400).json({ error: 'ต้องส่งโทเคน t (UUID จาก QR) ให้ถูกรูปแบบ' })
      return
    }
    if (!slug && !eventId) {
      res.status(400).json({ error: 'ต้องส่ง election_event_slug หรือ election_event_id' })
      return
    }

    const supabase = getServiceSupabase()

    const { data: mem, error: mErr } = await supabase
      .from('members')
      .select('id, membership_status, batch, member_identity_qr_token')
      .eq('member_identity_qr_token', t)
      .maybeSingle()

    if (mErr) {
      res.status(500).json({ error: 'ค้นหาสมาชิกไม่สำเร็จ', details: mErr.message })
      return
    }
    if (!mem) {
      res.status(404).json({ error: 'ไม่พบสมาชิกจากโทเคนนี้' })
      return
    }
    if (!isMemberMembershipActive(mem.membership_status)) {
      res.status(403).json({
        error: 'สมาชิกภาพในทะเบียนไม่ Active — ไม่สามารถบันทึกการรับบัตรในระบบนี้',
      })
      return
    }

    let event: ElectionEventRow | null = null

    if (eventId) {
      const { data, error } = await supabase.from('election_events').select('*').eq('id', eventId).maybeSingle()
      if (error) {
        res.status(500).json({ error: 'โหลดงานไม่สำเร็จ', details: error.message })
        return
      }
      event = data as ElectionEventRow | null
    } else {
      const { data, error } = await supabase.from('election_events').select('*').eq('slug', slug).maybeSingle()
      if (error) {
        res.status(500).json({ error: 'โหลดงานไม่สำเร็จ', details: error.message })
        return
      }
      event = data as ElectionEventRow | null
    }

    if (!event || !event.is_active) {
      res.status(404).json({ error: 'ไม่พบงานที่เปิดรับบัตร' })
      return
    }
    if (!isWithinClaimWindow(event)) {
      res.status(400).json({ error: 'งานนี้อยู่นอกช่วงเวลารับบัตร' })
      return
    }

    const batchSnap =
      mem.batch != null && String(mem.batch).trim() !== '' ? String(mem.batch).trim() : null

    const { error: insErr } = await supabase.from('election_card_claims').insert({
      election_event_id: event.id,
      member_id: mem.id as string,
      source: 'scan',
      batch_snapshot: batchSnap,
    })

    if (insErr) {
      if (insErr.code === '23505') {
        res.status(409).json({ error: 'รับบัตรในงานนี้แล้ว' })
        return
      }
      res.status(500).json({ error: 'บันทึกการรับบัตรไม่สำเร็จ', details: insErr.message })
      return
    }

    res.json({
      ok: true,
      election_event_slug: event.slug,
      election_event_title_th: event.title_th,
      claimed_at: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
