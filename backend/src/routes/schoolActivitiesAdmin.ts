import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'
import { rowsToCsv } from '../util/csvRows.js'
import { withUtf8Bom } from '../util/csvUtf8.js'

export const schoolActivitiesAdminRouter = Router()

/** GET /donations/summary — สรุปบริจาคแยกกองโรงเรียนยุพราช (ไม่รวมในรายงาน finance นิติบุคคลสมาคม/กวดวิชา) */
schoolActivitiesAdminRouter.get('/donations/summary', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: acts, error: aErr } = await supabase
      .from('school_activities')
      .select('id,title,category,fund_scope,target_amount,active')
      .eq('fund_scope', 'yupparaj_school')
      .order('title', { ascending: true })
    if (aErr) {
      res.status(500).json({ error: 'โหลดกิจกรรมไม่สำเร็จ', details: aErr })
      return
    }

    const { data: dons, error: dErr } = await supabase
      .from('donations')
      .select(
        'id,activity_id,amount,created_at,transfer_at,donor_first_name,donor_last_name,donor_batch,donor_batch_name,slip_file_url,note',
      )
      .eq('fund_scope', 'yupparaj_school')
      .order('created_at', { ascending: false })
      .limit(800)
    if (dErr) {
      res.status(500).json({ error: 'โหลดการบริจาคไม่สำเร็จ', details: dErr })
      return
    }

    const raisedByActivity = new Map<string, number>()
    let totalYup = 0
    for (const r of dons ?? []) {
      const a = Number((r as { amount?: unknown }).amount ?? 0)
      totalYup += Number.isFinite(a) ? a : 0
      const aid = (r as { activity_id?: string | null }).activity_id
      if (aid) {
        const k = String(aid)
        raisedByActivity.set(k, (raisedByActivity.get(k) ?? 0) + (Number.isFinite(a) ? a : 0))
      }
    }

    const activities = (acts ?? []).map((a: Record<string, unknown>) => {
      const id = String(a.id ?? '')
      const tgt = a.target_amount != null ? Number(a.target_amount) : null
      const raised = raisedByActivity.get(id) ?? 0
      return {
        id,
        title: String(a.title ?? ''),
        category: String(a.category ?? ''),
        active: a.active === true,
        targetAmount: tgt != null && Number.isFinite(tgt) ? tgt : null,
        raisedAmount: raised,
        progressPercent:
          tgt != null && tgt > 0 && Number.isFinite(raised) ? Math.min(100, Math.round((raised / tgt) * 100)) : null,
      }
    })

    res.json({
      ok: true,
      note: 'ยอดนี้ไม่ถือเป็นรายรับของนิติบุคคลสมาคมศิษย์เก่าหรือโรงเรียนกวดวิชา — เป็นกองโรงเรียนยุพราชวิทยาลัยแยกต่างหาก',
      totalYupparajAmount: totalYup,
      donationCount: (dons ?? []).length,
      activities,
      recentDonations: (dons ?? []).slice(0, 50).map((r) => {
        const row = r as {
          id: string
          activity_id?: string | null
          amount?: unknown
          created_at?: string
          transfer_at?: string | null
          donor_first_name?: string | null
          donor_last_name?: string | null
          donor_batch?: string | null
          donor_batch_name?: string | null
          slip_file_url?: string | null
          note?: string | null
        }
        const name = [row.donor_first_name, row.donor_last_name].filter(Boolean).join(' ').trim() || '—'
        return {
          id: row.id,
          activityId: row.activity_id ?? null,
          amount: Number(row.amount ?? 0),
          createdAt: row.created_at ?? null,
          transferAt: row.transfer_at ?? null,
          donorName: name,
          donorBatch: row.donor_batch ?? null,
          donorBatchName: row.donor_batch_name ?? null,
          slipFileUrl: row.slip_file_url ?? null,
          note: row.note ?? null,
        }
      }),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** GET /donations/yupparaj-export.csv */
schoolActivitiesAdminRouter.get('/donations/yupparaj-export.csv', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { data: dons, error } = await supabase
      .from('donations')
      .select(
        'id,created_at,transfer_at,activity_id,amount,donor_first_name,donor_last_name,donor_batch,donor_batch_name,slip_file_url,note',
      )
      .eq('fund_scope', 'yupparaj_school')
      .order('created_at', { ascending: false })
      .limit(5000)
    if (error) {
      res.status(500).json({ error: 'โหลดการบริจาคไม่สำเร็จ', details: error })
      return
    }
    const rows = (dons ?? []).map((d) => {
      const r = d as Record<string, unknown>
      return {
        donation_id: r.id,
        created_at: r.created_at,
        transfer_at: r.transfer_at,
        activity_id: r.activity_id,
        amount: r.amount,
        donor_first_name: r.donor_first_name,
        donor_last_name: r.donor_last_name,
        donor_batch: r.donor_batch,
        donor_batch_name: r.donor_batch_name,
        slip_file_url: r.slip_file_url,
        note: r.note,
      }
    })
    const csv = rowsToCsv(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="yupparaj-school-donations.csv"')
    res.send(withUtf8Bom(csv))
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** GET / — รายการกิจกรรม/คอร์ส (?active_only=1) */
schoolActivitiesAdminRouter.get('/', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    let q = supabase.from('school_activities').select('*').order('title', { ascending: true })
    if (req.query.active_only === '1' || req.query.active_only === 'true') {
      q = q.eq('active', true)
    }
    const { data, error } = await q
    if (error) {
      res.status(500).json({ error: 'โหลดข้อมูลไม่สำเร็จ', details: error })
      return
    }
    res.json({ ok: true, activities: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** POST / — body: { title, category?, description?, active?, created_by?, fund_scope?, target_amount? } — category ไม่บังคับ (ค่าว่าง) */
schoolActivitiesAdminRouter.post('/', async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : ''
    if (!title) {
      res.status(400).json({ error: 'ต้องระบุ title (ชื่อกิจกรรม)' })
      return
    }
    const description =
      typeof req.body?.description === 'string' && req.body.description.trim() ? req.body.description.trim() : null
    const active = req.body?.active === false ? false : true
    const created_by =
      typeof req.body?.created_by === 'string' && req.body.created_by.trim() ? req.body.created_by.trim() : null

    let fund_scope: 'yupparaj_school' | 'association' | 'cram_school' = 'association'
    if (typeof req.body?.fund_scope === 'string') {
      const fs = req.body.fund_scope.trim()
      if (fs === 'yupparaj_school' || fs === 'association' || fs === 'cram_school') fund_scope = fs
    }
    let target_amount: number | null = null
    if (req.body?.target_amount != null && req.body?.target_amount !== '') {
      const t = Number(req.body.target_amount)
      target_amount = Number.isFinite(t) && t >= 0 ? t : null
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('school_activities')
      .insert({ title, category: category || '', description, active, created_by, fund_scope, target_amount })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: 'เพิ่มข้อมูลไม่สำเร็จ', details: error })
      return
    }
    res.status(201).json({ ok: true, activity: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** PATCH /:id */
schoolActivitiesAdminRouter.patch('/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const patch: Record<string, unknown> = {}
    if (typeof req.body?.title === 'string') patch.title = req.body.title.trim()
    if (typeof req.body?.category === 'string') patch.category = req.body.category.trim()
    if (req.body?.description === null) {
      patch.description = null
    } else if (typeof req.body?.description === 'string') {
      const d = req.body.description.trim()
      patch.description = d.length ? d : null
    }
    if (typeof req.body?.active === 'boolean') patch.active = req.body.active
    if (typeof req.body?.fund_scope === 'string') {
      const fs = req.body.fund_scope.trim()
      if (fs === 'yupparaj_school' || fs === 'association' || fs === 'cram_school') patch.fund_scope = fs
    }
    if (req.body?.target_amount === null) {
      patch.target_amount = null
    } else if (req.body?.target_amount !== undefined && req.body?.target_amount !== '') {
      const t = Number(req.body.target_amount)
      if (Number.isFinite(t) && t >= 0) patch.target_amount = t
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'ไม่มีฟิลด์สำหรับอัปเดต' })
      return
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('school_activities')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) {
      res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ', details: error })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'ไม่พบกิจกรรม' })
      return
    }
    res.json({ ok: true, activity: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})

/** DELETE /:id */
schoolActivitiesAdminRouter.delete('/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'ต้องระบุ id' })
      return
    }
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('school_activities').delete().eq('id', id)
    if (error) {
      res.status(500).json({ error: 'ลบข้อมูลไม่สำเร็จ', details: error })
      return
    }
    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
    res.status(500).json({ error: message })
  }
})
