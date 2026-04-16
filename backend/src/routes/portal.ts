import { Router } from 'express'
import { academyPortalPayload, committeePortalPayload, memberPortalPayload } from '../data/portalSnapshot.js'

/** GET /api/portal/member | committee | academy — ข้อมูล snapshot สำหรับ UI (เตรียมต่อ DB/รายงานจริง) */
export const portalRouter = Router()

portalRouter.get('/member', (_req, res) => {
  res.json(memberPortalPayload)
})

portalRouter.get('/committee', (_req, res) => {
  res.json(committeePortalPayload)
})

portalRouter.get('/academy', (_req, res) => {
  res.json(academyPortalPayload)
})
