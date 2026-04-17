import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'

export const schoolActivitiesAdminRouter = Router()

/** GET / — รายการกิจกรรม/คอร์ส (?active_only=1) */
schoolActivitiesAdminRouter.get('/', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    let q = supabase.from('school_activities').select('*').order('category', { ascending: true }).order('title', { ascending: true })
    if (req.query.active_only === '1' || req.query.active_only === 'true') {
      q = q.eq('active', true)
    }
    const { data, error } = await q
    if (error) {
      res.status(500).json({ error: 'Load failed', details: error })
      return
    }
    res.json({ ok: true, activities: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** POST / — body: { title, category, description?, active?, created_by? } */
schoolActivitiesAdminRouter.post('/', async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const category = typeof req.body?.category === 'string' ? req.body.category.trim() : ''
    if (!title || !category) {
      res.status(400).json({ error: 'title and category are required' })
      return
    }
    const description =
      typeof req.body?.description === 'string' && req.body.description.trim() ? req.body.description.trim() : null
    const active = req.body?.active === false ? false : true
    const created_by =
      typeof req.body?.created_by === 'string' && req.body.created_by.trim() ? req.body.created_by.trim() : null

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('school_activities')
      .insert({ title, category, description, active, created_by })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: 'Insert failed', details: error })
      return
    }
    res.status(201).json({ ok: true, activity: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** PATCH /:id */
schoolActivitiesAdminRouter.patch('/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
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
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
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
      res.status(500).json({ error: 'Update failed', details: error })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Activity not found' })
      return
    }
    res.json({ ok: true, activity: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** DELETE /:id */
schoolActivitiesAdminRouter.delete('/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('school_activities').delete().eq('id', id)
    if (error) {
      res.status(500).json({ error: 'Delete failed', details: error })
      return
    }
    res.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
