import type { Request, Response } from 'express'
import { normalizeWhitespace } from './normalize.js'

export function getRequestedBatch(row: { requested_data: unknown }): string | null {
  const d = row.requested_data
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const batch = (d as Record<string, unknown>).batch
  if (typeof batch !== 'string' || !batch.trim()) return null
  return normalizeWhitespace(batch)
}

export function isAdminRequest(req: Request): boolean {
  const expected = process.env.ADMIN_UPLOAD_KEY
  if (!expected) return false
  return req.header('x-admin-key') === expected
}

function parsePresidentMap(): Record<string, string> | null {
  const raw = process.env.PRESIDENT_KEYS_JSON
  if (!raw?.trim()) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && v.trim()) {
        out[normalizeWhitespace(k)] = v.trim()
      }
    }
    return out
  } catch {
    return null
  }
}

/** คีย์ที่คาดหวังสำหรับรุ่นนี้ — ไม่มีใน map = ไม่มีประธานรุ่นสำหรับรุ่นนี้ (เหลือแค่ Admin) */
export function expectedPresidentKeyForBatch(batch: string | null): string | null {
  const map = parsePresidentMap()
  if (map && batch) {
    const nb = normalizeWhitespace(batch)
    if (map[nb] !== undefined) return map[nb]
    for (const [k, v] of Object.entries(map)) {
      if (normalizeWhitespace(k) === nb) return v
    }
    return null
  }
  const single = process.env.PRESIDENT_UPLOAD_KEY?.trim()
  if (single) return single
  return null
}

/**
 * หลัง presidentAuth แล้ว — ถ้าไม่ใช่ Admin ต้องใช้ x-president-key ให้ตรงกับรุ่นในคำร้อง
 * @returns true ถ้าผ่าน (ควรทำงานต่อ)
 */
export function assertPresidentForRequestBatch(req: Request, row: { requested_data: unknown }, res: Response): boolean {
  if (isAdminRequest(req)) return true

  const pk = req.header('x-president-key')?.trim()
  if (!pk) {
    res.status(403).json({ error: 'ไม่ได้รับอนุญาต', code: 'MISSING_PRESIDENT_KEY' })
    return false
  }

  const batch = getRequestedBatch(row)
  const expected = expectedPresidentKeyForBatch(batch)

  if (expected === null) {
    res.status(403).json({
      error: 'ไม่ได้รับอนุญาต',
      code: 'NO_PRESIDENT_FOR_BATCH',
      message:
        batch == null
          ? 'คำร้องไม่มีรุ่นใน requested_data'
          : 'ยังไม่ได้กำหนดประธานรุ่นสำหรับรุ่นนี้ใน PRESIDENT_KEYS_JSON — ใช้ Admin เท่านั้น',
      batch,
    })
    return false
  }

  if (pk !== expected) {
    res.status(403).json({
      error: 'ไม่ได้รับอนุญาต',
      code: 'PRESIDENT_KEY_WRONG_BATCH',
      message: 'x-president-key ไม่ตรงกับรุ่นในคำร้อง',
    })
    return false
  }

  return true
}

/** ใช้ใน middleware: คีย์นี้เป็นคีย์ประธานรุ่นที่ลงทะเบียนไว้หรือไม่ */
export function isKnownPresidentKey(pk: string | undefined): boolean {
  if (!pk?.trim()) return false
  const k = pk.trim()
  const map = parsePresidentMap()
  if (map) return Object.values(map).includes(k)
  const single = process.env.PRESIDENT_UPLOAD_KEY?.trim()
  return Boolean(single && k === single)
}
