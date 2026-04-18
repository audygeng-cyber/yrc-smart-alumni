import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readLineEntrySource } from '../lib/lineEntrySource'
import { AppRolesContext, type AppRolesContextValue } from './appRolesContextBase'

type Props = {
  apiBase: string
  lineUid: string
  enforced: boolean
  /** เพิ่มเมื่อมีการอ่าน `?entry=` หรือตั้งช่องทางจากหน้า QR — ให้ refetch บทบาทพร้อม entry_source */
  entrySourceVersion: number
  /** เพิ่มเมื่อผูกสมาชิกสำเร็จหรือกู้เซสชันพบสมาชิก — ให้ refetch หลัง backend sync `app_users` */
  linkedMemberVersion: number
  children: ReactNode
}

export function AppRolesProvider({
  apiBase,
  lineUid,
  enforced,
  entrySourceVersion,
  linkedMemberVersion,
  children,
}: Props) {
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [rolesFetchFailed, setRolesFetchFailed] = useState(false)
  const [fetchNonce, setFetchNonce] = useState(0)

  const refetchRoles = useCallback(() => {
    if (!lineUid.trim()) return
    setFetchNonce((n) => n + 1)
  }, [lineUid])

  /**
   * เรียก app-roles ทุกครั้งที่มี line_uid — ให้ backend สร้าง/ซิงก์ app_users และบันทึก entry แม้ไม่เปิด VITE_ENFORCE_APP_RBAC
   * โหลดแบบบล็อก (loading) เฉพาะเมื่อ enforced — กันเมนูหายชั่วคราวในโหมด production RBAC
   */
  useEffect(() => {
    const uid = lineUid.trim()
    if (!uid) {
      queueMicrotask(() => {
        setRoles([])
        setLoading(false)
        setRolesFetchFailed(false)
      })
      return
    }
    let cancelled = false
    if (enforced) {
      queueMicrotask(() => {
        setLoading(true)
        setRolesFetchFailed(false)
      })
    }
    const entry_source = readLineEntrySource()
    fetch(`${apiBase}/api/members/app-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_uid: uid,
        ...(entry_source ? { entry_source } : {}),
      }),
    })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; roles?: unknown }
        if (cancelled) return
        if (!r.ok || j.ok !== true) {
          setRoles([])
          if (enforced) setRolesFetchFailed(true)
          return
        }
        const raw = j.roles
        setRoles(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [])
        if (enforced) setRolesFetchFailed(false)
      })
      .catch(() => {
        if (!cancelled) {
          setRoles([])
          if (enforced) setRolesFetchFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled && enforced) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enforced, lineUid, apiBase, entrySourceVersion, linkedMemberVersion, fetchNonce])

  const value = useMemo<AppRolesContextValue>(
    () => ({ enforced, roles, loading, rolesFetchFailed, refetchRoles }),
    [enforced, roles, loading, rolesFetchFailed, refetchRoles],
  )
  return <AppRolesContext.Provider value={value}>{children}</AppRolesContext.Provider>
}
