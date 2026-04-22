import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'

export const electionAdminRouter = Router()

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

export function normalizeElectionSlugInput(raw: string): string | null {
  const x = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  if (x.length < 2 || x.length > 64) return null
  return x
}

electionAdminRouter.get('/', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('election_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'โหลดรายการงานไม่สำเร็จ', details: error.message })
      return
    }
    res.json({ ok: true, events: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

electionAdminRouter.post('/', async (req, res) => {
  try {
    const slug = normalizeElectionSlugInput(String(req.body?.slug ?? ''))
    const title_th = typeof req.body?.title_th === 'string' ? req.body.title_th.trim() : ''
    if (!slug || title_th.length < 2) {
      res.status(400).json({ error: 'ต้องมี slug (a-z 0-9 - ความยาว 2–64) และ title_th อย่างน้อย 2 ตัวอักษร' })
      return
    }

    const is_active = req.body?.is_active === false ? false : true
    const claim_starts_at =
      typeof req.body?.claim_starts_at === 'string' && req.body.claim_starts_at.trim()
        ? req.body.claim_starts_at.trim()
        : null
    const claim_ends_at =
      typeof req.body?.claim_ends_at === 'string' && req.body.claim_ends_at.trim()
        ? req.body.claim_ends_at.trim()
        : null

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('election_events')
      .insert({
        slug,
        title_th,
        is_active,
        claim_starts_at,
        claim_ends_at,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'slug นี้มีในระบบแล้ว' })
        return
      }
      res.status(500).json({ error: 'สร้างงานไม่สำเร็จ', details: error.message })
      return
    }
    res.status(201).json({ ok: true, event: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

electionAdminRouter.patch('/:id', async (req, res) => {
  try {
    const id = parseUuid(req.params.id)
    if (!id) {
      res.status(400).json({ error: 'รหัสงานไม่ถูกต้อง' })
      return
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof req.body?.title_th === 'string' && req.body.title_th.trim().length >= 2) {
      patch.title_th = req.body.title_th.trim()
    }
    if (typeof req.body?.is_active === 'boolean') patch.is_active = req.body.is_active
    if (req.body?.claim_starts_at === null) patch.claim_starts_at = null
    else if (typeof req.body?.claim_starts_at === 'string' && req.body.claim_starts_at.trim()) {
      patch.claim_starts_at = req.body.claim_starts_at.trim()
    }
    if (req.body?.claim_ends_at === null) patch.claim_ends_at = null
    else if (typeof req.body?.claim_ends_at === 'string' && req.body.claim_ends_at.trim()) {
      patch.claim_ends_at = req.body.claim_ends_at.trim()
    }

    const patchKeys = Object.keys(patch).filter((k) => k !== 'updated_at')
    if (patchKeys.length === 0) {
      res.status(400).json({ error: 'ไม่มีฟิลด์ที่อนุญาตให้อัปเดต' })
      return
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('election_events').update(patch).eq('id', id).select('*').maybeSingle()

    if (error) {
      res.status(500).json({ error: 'อัปเดตงานไม่สำเร็จ', details: error.message })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'ไม่พบงาน' })
      return
    }
    res.json({ ok: true, event: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

electionAdminRouter.get('/:id/stats', async (req, res) => {
  try {
    const id = parseUuid(req.params.id)
    if (!id) {
      res.status(400).json({ error: 'รหัสงานไม่ถูกต้อง' })
      return
    }

    const supabase = getServiceSupabase()

    const { data: ev, error: evErr } = await supabase.from('election_events').select('id, slug, title_th').eq('id', id).maybeSingle()
    if (evErr) {
      res.status(500).json({ error: 'โหลดงานไม่สำเร็จ', details: evErr.message })
      return
    }
    if (!ev) {
      res.status(404).json({ error: 'ไม่พบงาน' })
      return
    }

    const { data: claims, error: cErr } = await supabase
      .from('election_card_claims')
      .select('batch_snapshot')
      .eq('election_event_id', id)

    if (cErr) {
      res.status(500).json({ error: 'โหลดการรับบัตรไม่สำเร็จ', details: cErr.message })
      return
    }

    const { data: activeRpc, error: aErr } = await supabase.rpc('count_membership_active')
    if (aErr) {
      res.status(500).json({ error: 'นับสมาชิก Active ไม่สำเร็จ', details: aErr.message })
      return
    }

    const claims_count = claims?.length ?? 0
    const active_members_total =
      typeof activeRpc === 'bigint'
        ? Number(activeRpc)
        : typeof activeRpc === 'number'
          ? activeRpc
          : parseInt(String(activeRpc ?? '0'), 10) || 0

    const byBatchMap = new Map<string, number>()
    for (const row of claims ?? []) {
      const k =
        row.batch_snapshot != null && String(row.batch_snapshot).trim() !== ''
          ? String(row.batch_snapshot).trim()
          : '(ไม่ระบุรุ่น)'
      byBatchMap.set(k, (byBatchMap.get(k) ?? 0) + 1)
    }
    const by_batch = [...byBatchMap.entries()]
      .map(([batch_label, claimed_count]) => ({ batch_label, claimed_count }))
      .sort((a, b) => b.claimed_count - a.claimed_count || a.batch_label.localeCompare(b.batch_label, 'th'))

    const pct_of_active_members =
      active_members_total > 0 ? Math.round((claims_count / active_members_total) * 10000) / 100 : 0

    res.json({
      ok: true,
      election_event_id: ev.id,
      slug: ev.slug,
      title_th: ev.title_th,
      claims_count,
      active_members_total,
      pct_of_active_members,
      by_batch,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
