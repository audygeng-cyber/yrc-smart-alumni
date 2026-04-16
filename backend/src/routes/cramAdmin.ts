import { Router } from 'express'
import { getServiceSupabase } from '../lib/supabase.js'

export const cramAdminRouter = Router()

/** GET /classrooms — รายการห้อง (optional ?active_only=1) */
cramAdminRouter.get('/classrooms', async (req, res) => {
  try {
    const supabase = getServiceSupabase()
    let q = supabase.from('cram_classrooms').select('*').order('sort_order', { ascending: true })
    if (req.query.active_only === '1' || req.query.active_only === 'true') {
      q = q.eq('active', true)
    }
    const { data, error } = await q
    if (error) {
      res.status(500).json({ error: 'Load failed', details: error })
      return
    }
    res.json({ ok: true, classrooms: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** POST /classrooms — body: { room_code, display_name, sort_order?, active? } */
cramAdminRouter.post('/classrooms', async (req, res) => {
  try {
    const room_code = typeof req.body?.room_code === 'string' ? req.body.room_code.trim() : ''
    const display_name = typeof req.body?.display_name === 'string' ? req.body.display_name.trim() : ''
    if (!room_code || !display_name) {
      res.status(400).json({ error: 'room_code and display_name are required' })
      return
    }
    const sort_order = typeof req.body?.sort_order === 'number' ? req.body.sort_order : 0
    const active = req.body?.active === false ? false : true

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('cram_classrooms')
      .insert({ room_code, display_name, sort_order, active })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: 'Insert failed', details: error })
      return
    }
    res.status(201).json({ ok: true, classroom: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** PATCH /classrooms/:id */
cramAdminRouter.patch('/classrooms/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }
    const patch: Record<string, unknown> = {}
    if (typeof req.body?.room_code === 'string') patch.room_code = req.body.room_code.trim()
    if (typeof req.body?.display_name === 'string') patch.display_name = req.body.display_name.trim()
    if (typeof req.body?.sort_order === 'number') patch.sort_order = req.body.sort_order
    if (typeof req.body?.active === 'boolean') patch.active = req.body.active
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('cram_classrooms').update(patch).eq('id', id).select('*').maybeSingle()
    if (error) {
      res.status(500).json({ error: 'Update failed', details: error })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Classroom not found' })
      return
    }
    res.json({ ok: true, classroom: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** GET /students?classroom_id= — รายชื่อนักเรียน (กรองตามห้อง) */
cramAdminRouter.get('/students', async (req, res) => {
  try {
    const classroom_id = typeof req.query.classroom_id === 'string' ? req.query.classroom_id.trim() : ''
    const supabase = getServiceSupabase()
    let q = supabase.from('cram_students').select('*').order('created_at', { ascending: true })
    if (classroom_id) {
      q = q.eq('classroom_id', classroom_id)
    }
    const { data, error } = await q
    if (error) {
      res.status(500).json({ error: 'Load failed', details: error })
      return
    }
    res.json({ ok: true, students: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** POST /students — body: { classroom_id, display_name, current_avg_score?, app_user_id? } */
cramAdminRouter.post('/students', async (req, res) => {
  try {
    const classroom_id = typeof req.body?.classroom_id === 'string' ? req.body.classroom_id.trim() : ''
    const display_name = typeof req.body?.display_name === 'string' ? req.body.display_name.trim() : ''
    if (!classroom_id || !display_name) {
      res.status(400).json({ error: 'classroom_id and display_name are required' })
      return
    }
    let current_avg_score: number | null = null
    if (req.body?.current_avg_score != null && req.body?.current_avg_score !== '') {
      const n = Number(req.body.current_avg_score)
      if (!Number.isFinite(n)) {
        res.status(400).json({ error: 'current_avg_score must be a number' })
        return
      }
      current_avg_score = n
    }
    const app_user_id =
      typeof req.body?.app_user_id === 'string' && req.body.app_user_id.trim() ? req.body.app_user_id.trim() : null

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('cram_students')
      .insert({
        classroom_id,
        display_name,
        current_avg_score,
        app_user_id,
      })
      .select('*')
      .single()
    if (error) {
      res.status(500).json({ error: 'Insert failed', details: error })
      return
    }
    res.status(201).json({ ok: true, student: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** PATCH /students/:id */
cramAdminRouter.patch('/students/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }
    const patch: Record<string, unknown> = {}
    if (typeof req.body?.display_name === 'string') patch.display_name = req.body.display_name.trim()
    if (typeof req.body?.classroom_id === 'string') patch.classroom_id = req.body.classroom_id.trim()
    if (req.body?.current_avg_score === null) {
      patch.current_avg_score = null
    } else if (req.body?.current_avg_score !== undefined && req.body?.current_avg_score !== '') {
      const n = Number(req.body.current_avg_score)
      if (!Number.isFinite(n)) {
        res.status(400).json({ error: 'current_avg_score must be a number' })
        return
      }
      patch.current_avg_score = n
    }
    if (req.body?.app_user_id === null) {
      patch.app_user_id = null
    } else if (typeof req.body?.app_user_id === 'string') {
      const u = req.body.app_user_id.trim()
      patch.app_user_id = u.length ? u : null
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No fields to update' })
      return
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase.from('cram_students').update(patch).eq('id', id).select('*').maybeSingle()
    if (error) {
      res.status(500).json({ error: 'Update failed', details: error })
      return
    }
    if (!data) {
      res.status(404).json({ error: 'Student not found' })
      return
    }
    res.json({ ok: true, student: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

/** DELETE /students/:id */
cramAdminRouter.delete('/students/:id', async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : ''
    if (!id) {
      res.status(400).json({ error: 'id is required' })
      return
    }
    const supabase = getServiceSupabase()
    const { error } = await supabase.from('cram_students').delete().eq('id', id)
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
