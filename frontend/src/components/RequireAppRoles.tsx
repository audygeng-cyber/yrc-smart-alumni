import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppRoles } from '../context/useAppRoles'
import { rolesAllow } from '../lib/appRoles'

const denyRing = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`

function AccessDenied() {
  return (
    <section
      className="rounded-xl border border-amber-900/45 bg-amber-950/25 p-8 text-center"
      role="alert"
      aria-live="polite"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-200/90">ไม่มีสิทธิ์เข้าถึง</h2>
      <p className="mt-3 text-sm text-slate-300">
        บัญชี LINE นี้ยังไม่มีบทบาทที่อนุญาตในส่วนนี้ — ติดต่อผู้ดูแลระบบหากต้องการเข้าถึง
      </p>
      <Link
        to="/"
        className={`mt-6 inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 ${denyRing}`}
      >
        กลับหน้าหลัก
      </Link>
    </section>
  )
}

function RbacLoading() {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400"
      role="status"
      aria-live="polite"
    >
      กำลังตรวจสอบสิทธิ์…
    </div>
  )
}

type Props = {
  lineUid: string
  allow: readonly string[]
  children: ReactNode
}

/**
 * เมื่อ `VITE_ENFORCE_APP_RBAC=true` จะบังคับให้มีบทบาทใน `allow` (และมี LINE UID)
 * เมื่อปิดการบังคับ จะแสดง children โดยไม่ตรวจ
 */
function RolesFetchFailed() {
  const { refetchRoles } = useAppRoles()
  return (
    <section
      className="rounded-xl border border-rose-900/45 bg-rose-950/20 p-8 text-center"
      role="alert"
      aria-live="polite"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-rose-200/90">โหลดสิทธิ์ไม่สำเร็จ</h2>
      <p className="mt-3 text-sm text-slate-300">
        ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบบทบาท — ตรวจว่า API ทำงานอยู่ แล้วลองใหม่หรือรีเฟรชหน้า
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => refetchRoles()}
          className={`inline-flex rounded-lg bg-emerald-900/50 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-900/70 ${denyRing}`}
        >
          ลองอีกครั้ง
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 ${denyRing}`}
        >
          รีเฟรชหน้า
        </button>
      </div>
    </section>
  )
}

export function RequireAppRoles({ lineUid, allow, children }: Props) {
  const { enforced, roles, loading, rolesFetchFailed } = useAppRoles()

  if (!enforced) {
    return <>{children}</>
  }

  if (!lineUid.trim()) {
    return <Navigate to="/auth/link" replace />
  }

  if (loading) {
    return <RbacLoading />
  }

  if (rolesFetchFailed) {
    return <RolesFetchFailed />
  }

  if (!rolesAllow(roles, allow)) {
    return <AccessDenied />
  }

  return <>{children}</>
}
