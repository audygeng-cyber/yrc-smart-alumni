import { createContext } from 'react'

export type AppRolesContextValue = {
  enforced: boolean
  roles: string[]
  loading: boolean
  /** true เมื่อบังคับ RBAC และโหลด `/api/members/app-roles` ไม่สำเร็จ — ไม่ใช่ “ไม่มีสิทธิ์” */
  rolesFetchFailed: boolean
  /** เรียก `/api/members/app-roles` อีกครั้ง (เมื่อบังคับ RBAC และมี LINE UID) */
  refetchRoles: () => void
}

export const AppRolesContext = createContext<AppRolesContextValue | null>(null)
