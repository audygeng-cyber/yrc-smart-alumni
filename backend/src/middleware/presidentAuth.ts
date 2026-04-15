import type { RequestHandler } from 'express'

/**
 * ประธานรุ่น: ใช้ x-president-key ตรง PRESIDENT_UPLOAD_KEY
 * Admin: ใช้ x-admin-key ตรง ADMIN_UPLOAD_KEY ได้ทุกขั้นรวมถึงอนุมัติฝั่งประธานรุ่น
 */
export const presidentAuth: RequestHandler = (req, res, next) => {
  const adminExpected = process.env.ADMIN_UPLOAD_KEY
  const presExpected = process.env.PRESIDENT_UPLOAD_KEY

  if (!adminExpected) {
    res.status(500).json({ error: 'ADMIN_UPLOAD_KEY is not configured' })
    return
  }

  const ak = req.header('x-admin-key')
  const pk = req.header('x-president-key')

  if (ak === adminExpected) {
    next()
    return
  }

  if (presExpected && pk === presExpected) {
    next()
    return
  }

  res.status(401).json({
    error: 'Unauthorized',
    hint: 'ใช้ x-admin-key หรือ x-president-key (ถ้าตั้ง PRESIDENT_UPLOAD_KEY ใน server)',
  })
}
