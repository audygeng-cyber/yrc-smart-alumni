/** เปิดใช้การกันเส้นทางและเมนูตามบทบาทจาก API — ตั้ง `VITE_ENFORCE_APP_RBAC=true` ใน frontend/.env */
export function enforceAppRbac(): boolean {
  return import.meta.env.VITE_ENFORCE_APP_RBAC === 'true'
}

/**
 * ชุดบทบาทสำหรับแต่ละพื้นที่ (บทบาท `admin` ในแอปรวมอยู่ในพอร์ทัลหลัก รวม `committee` — สอดคล้องลิงก์จาก `/admin` ไป `/committee/meetings`)
 */
export const RBAC_NAV = {
  member: ['member', 'admin'] as const,
  committee: ['committee', 'committee_authorized_3of5', 'bank_signer_3of5', 'admin'] as const,
  academy: ['teacher', 'parent', 'student', 'cram_executive', 'admin'] as const,
  admin: ['admin'] as const,
  requests: ['committee', 'committee_authorized_3of5', 'bank_signer_3of5', 'admin'] as const,
}

export function rolesAllow(roles: readonly string[], allow: readonly string[]): boolean {
  return allow.some((a) => roles.includes(a))
}
