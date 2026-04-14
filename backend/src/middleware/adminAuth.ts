import type { RequestHandler } from 'express'

export const adminAuth: RequestHandler = (req, res, next) => {
  const expected = process.env.ADMIN_UPLOAD_KEY
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_UPLOAD_KEY is not configured' })
    return
  }
  const key = req.header('x-admin-key')
  if (key !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
