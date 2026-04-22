import type { Request, Response } from 'express'
import { normalizeWhitespace } from './normalize.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PresidentKeyEntry = {
  /** รุ่น (normalizeWhitespace แล้ว) — ต้องตรงกับค่า batch ในทะเบียนเมื่อซิงก์ */
  batchKey: string
  /** คีย์ที่ส่งใน x-president-key */
  presidentKey: string
  /** ถ้ามี จะใช้ซิงก์มิติ batch_president ใน member_distinctions (อ้าง members.id) */
  memberId: string | null
}

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

function parseEntryValue(batchKeyNorm: string, v: unknown): PresidentKeyEntry | null {
  if (typeof v === 'string' && v.trim()) {
    return { batchKey: batchKeyNorm, presidentKey: v.trim(), memberId: null }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    const keyRaw = o.president_key ?? o.key
    const presidentKey = typeof keyRaw === 'string' && keyRaw.trim() ? keyRaw.trim() : ''
    if (!presidentKey) return null
    const midRaw = o.member_id
    let memberId: string | null = null
    if (typeof midRaw === 'string' && midRaw.trim()) {
      const t = midRaw.trim()
      memberId = UUID_RE.test(t) ? t.toLowerCase() : null
    }
    return { batchKey: batchKeyNorm, presidentKey, memberId }
  }
  return null
}

/**
 * แปลง PRESIDENT_KEYS_JSON — รองรับ legacy `{"2520":"secret"}` และแบบขยาย
 * `{"2520":{"key":"secret","member_id":"<uuid>"}}` หรือใช้ `president_key` แทน `key`
 */
export function parsePresidentKeyEntries(): PresidentKeyEntry[] | null {
  const raw = process.env.PRESIDENT_KEYS_JSON
  if (!raw?.trim()) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null
    const byBatch = new Map<string, PresidentKeyEntry>()
    for (const [k, v] of Object.entries(o)) {
      const batchKey = normalizeWhitespace(k)
      if (!batchKey) continue
      const entry = parseEntryValue(batchKey, v)
      if (entry) byBatch.set(batchKey, entry)
    }
    return byBatch.size > 0 ? [...byBatch.values()] : null
  } catch {
    return null
  }
}

/** รายการที่มี member_id — สำหรับซิงก์ทะเบียน (ตรวจซ้ำของ member_id) */
export function getPresidentRegistrySyncTargets():
  | { ok: true; targets: { batchKey: string; memberId: string }[] }
  | { ok: false; error: string } {
  const entries = parsePresidentKeyEntries()
  if (!entries?.length) return { ok: true, targets: [] }

  const withId = entries.filter((e): e is PresidentKeyEntry & { memberId: string } => Boolean(e.memberId))
  const seen = new Set<string>()
  for (const e of withId) {
    if (seen.has(e.memberId)) {
      return { ok: false, error: `member_id ซ้ำใน PRESIDENT_KEYS_JSON: ${e.memberId}` }
    }
    seen.add(e.memberId)
  }
  return { ok: true, targets: withId.map((e) => ({ batchKey: e.batchKey, memberId: e.memberId })) }
}

/** คีย์ที่คาดหวังสำหรับรุ่นนี้ — ไม่มีใน map = ไม่มีประธานรุ่นสำหรับรุ่นนี้ (เหลือแค่ Admin) */
export function expectedPresidentKeyForBatch(batch: string | null): string | null {
  const entries = parsePresidentKeyEntries()
  if (entries && batch) {
    const nb = normalizeWhitespace(batch)
    const hit = entries.find((e) => e.batchKey === nb) ?? entries.find((e) => normalizeWhitespace(e.batchKey) === nb)
    if (hit) return hit.presidentKey
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
  const entries = parsePresidentKeyEntries()
  if (entries?.length) return entries.some((e) => e.presidentKey === k)
  const single = process.env.PRESIDENT_UPLOAD_KEY?.trim()
  return Boolean(single && k === single)
}
