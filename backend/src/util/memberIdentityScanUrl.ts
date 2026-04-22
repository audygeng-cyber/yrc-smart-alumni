/**
 * ลิงก์สแกน QR บัตรสมาชิก — อ่านคู่กับ `docs/MEMBER_IDENTITY_QR_FLOW.md`
 * ใช้ origin แรกจาก FRONTEND_ORIGINS (เดียวกับ CORS) เพื่อให้ URL ใน QR ตรงกับโดเมนที่ deploy
 */

import { readMemberIdentityQrToken } from './memberIdentityQrToken.js'

const MEMBER_IDENTITY_OPEN_PATH = '/open/member-identity'

/** origin แรกจาก FRONTEND_ORIGINS (ไม่มี slash ท้าย) */
export function primaryFrontendOriginFromEnv(): string | null {
  const raw = process.env.FRONTEND_ORIGINS?.trim()
  if (!raw) return null
  const first = raw.split(',')[0]?.trim()
  if (!first) return null
  try {
    const u = new URL(first)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

/** ลิงก์เต็มที่ฝังใน QR (query `t` = member_identity_qr_token) */
export function buildMemberIdentityScanUrl(origin: string, token: string): string {
  const o = origin.replace(/\/$/, '')
  const t = encodeURIComponent(token.trim())
  return `${o}${MEMBER_IDENTITY_OPEN_PATH}?t=${t}`
}

/** ลบคอลัมน์ DB ดิบออกจาก object ก่อน merge ฟิลด์สำหรับ API */
export function spreadMemberRowWithoutRawIdentityToken(row: Record<string, unknown>): Record<string, unknown> {
  const { member_identity_qr_token: _omit, ...rest } = row
  return rest
}

/**
 * ฟิลด์ identity สำหรับ JSON — ถ้ามี `FRONTEND_ORIGINS` จะส่งแค่ `member_identity_scan_url`
 * ถ้ายังไม่ตั้ง origin จะส่ง `member_identity_qr_token` ให้ฝั่งเว็บประกอบ URL เอง
 */
export function memberIdentityScanFieldsOnly(row: Record<string, unknown>): {
  member_identity_scan_url: string | null
  member_identity_qr_token?: string
} {
  const token = readMemberIdentityQrToken(row)
  const origin = primaryFrontendOriginFromEnv()
  if (token && origin) {
    return { member_identity_scan_url: buildMemberIdentityScanUrl(origin, token) }
  }
  if (token) {
    return { member_identity_scan_url: null, member_identity_qr_token: token }
  }
  return { member_identity_scan_url: null }
}
