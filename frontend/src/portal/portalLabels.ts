import { themeAccent } from '../lib/themeTokens'

/** วงโฟกัสคีย์บอร์ด — ต่อท้าย className ของลิงก์/ปุ่มในพอร์ทัล (เดียวกับ `themeAccent.focusRing`) */
export const portalFocusRing = themeAccent.focusRing

/** สีหลักบานเย็น — ปุ่มและเมนู active (อ้างอิงจาก `themeAccent`) */
export const portalAccent = {
  button: themeAccent.navItemActive,
  buttonStrong: themeAccent.buttonPrimaryStrong,
} as const

/** path ต่อท้าย apiBase สำหรับ snapshot — ต้องตรงกับ backend `routes/portal` */
export const portalSnapshotPath = {
  member: '/api/portal/member',
  committee: '/api/portal/committee',
  academy: '/api/portal/academy',
} as const

/** ข้อความต่อท้าย "พอร์ทัล" ใน PortalNotFound — ใช้ให้ตรงกับแต่ละพอร์ทัล */
export const portalNotFoundScopeLabel = {
  committee: 'คณะกรรมการ',
  member: 'สมาชิก',
  academy: 'โรงเรียนกวดวิชา',
} as const
