import { Router } from 'express'

export const membersRouter = Router()

/** Placeholder — ต่อด้วย LINE verify + RLS ผ่าน client ฝั่งผู้ใช้ */
membersRouter.get('/', (_req, res) => {
  res.json({
    message: 'Member listing will be added with auth and Supabase RLS.',
  })
})
