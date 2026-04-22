/**
 * ลิงก์สแกน QR ประจำตัว — สอดคล้อง backend `member_identity_scan_url` + docs/MEMBER_IDENTITY_QR_FLOW.md
 */
export function memberIdentityScanUrlForQr(m: Record<string, unknown>): string {
  const direct = m.member_identity_scan_url
  if (typeof direct === 'string' && /^https?:\/\//i.test(direct.trim())) return direct.trim()
  const tok = m.member_identity_qr_token
  if (typeof tok === 'string' && tok.trim().length > 0 && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/open/member-identity?t=${encodeURIComponent(tok.trim())}`
  }
  return ''
}
