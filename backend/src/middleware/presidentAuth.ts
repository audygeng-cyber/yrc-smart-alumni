import type { RequestHandler } from 'express'
import { isKnownPresidentKey } from '../util/presidentKeys.js'

/**
 * Admin: x-admin-key
 * ประธานรุ่น: x-president-key ต้องเป็นคีย์ที่รู้จัก (ค่าเดียวใน PRESIDENT_UPLOAD_KEY หรืออยู่ใน PRESIDENT_KEYS_JSON)
 * การจับคู่ “รุ่นไหนใช้คีย์ไหน” ตรวจซ้ำใน handler ด้วย assertPresidentForRequestBatch
 */
export const presidentAuth: RequestHandler = (req, res, next) => {
  const adminExpected = process.env.ADMIN_UPLOAD_KEY

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

  if (isKnownPresidentKey(pk)) {
    next()
    return
  }

  res.status(401).json({
    error: 'Unauthorized',
    hint: 'ใช้ x-admin-key หรือ x-president-key ที่ตรงกับ PRESIDENT_UPLOAD_KEY / PRESIDENT_KEYS_JSON',
  })
}
