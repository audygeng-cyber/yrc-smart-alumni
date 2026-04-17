import type { RequestHandler } from 'express'

export const adminAuth: RequestHandler = (req, res, next) => {
  const expected = process.env.ADMIN_UPLOAD_KEY
  if (!expected) {
    res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ADMIN_UPLOAD_KEY' })
    return
  }
  const key = req.header('x-admin-key')
  if (key !== expected) {
    res.status(401).json({ error: 'ไม่ได้รับอนุญาต' })
    return
  }
  next()
}
