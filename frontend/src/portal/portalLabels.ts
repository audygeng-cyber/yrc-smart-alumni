/** วงโฟกัสคีย์บอร์ด — ต่อท้าย className ของลิงก์/ปุ่มในพอร์ทัล */
export const portalFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

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
