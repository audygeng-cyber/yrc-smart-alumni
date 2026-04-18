import { useContext } from 'react'
import { AppRolesContext, type AppRolesContextValue } from './appRolesContextBase'

/** นอก Provider คืนค่าเหมือนปิดการบังคับ RBAC */
export function useAppRoles(): AppRolesContextValue {
  const v = useContext(AppRolesContext)
  if (!v) {
    return { enforced: false, roles: [], loading: false, rolesFetchFailed: false, refetchRoles: () => {} }
  }
  return v
}
