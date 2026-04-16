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

portalRouter.get('/academy', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    res.json(await buildAcademyPortalFromDb(supabase))
  } catch {
    res.json(academyPortalPayload)
  }
})
