import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAppRoles } from '../context/useAppRoles'
import { rolesAllow } from '../lib/appRoles'
import { themeAccent } from '../lib/themeTokens'

const denyRing = themeAccent.focusRing

function AccessDenied() {
  return (
    <section
      className="rounded-xl border border-amber-900/45 bg-amber-950/25 p-8 text-center"
      role="alert"
      aria-live="polite"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-200/90">ไม่มีสิทธิ์เข้าถึง</h2>
      <p className="mt-3 text-sm text-slate-300">
        บัญชี LINE นี้ยังไม่มีบทบาทที่อนุญาตในส่วนนี้ — กลับหน้าหลักเพื่อเลือกเมนูอื่น หรือติดต่อผู้ดูแลระบบหากต้องการสิทธิ์เพิ่ม
      </p>
      <Link
        to="/"
        className={`tap-target mt-6 inline-flex items-center justify-center rounded-lg ${themeAccent.buttonPrimary} px-4 py-2 text-sm font-medium ${denyRing}`}
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
          className={`tap-target inline-flex items-center justify-center rounded-lg ${themeAccent.buttonPrimaryStrong} px-4 py-2 text-sm font-medium ${denyRing}`}
        >
          ลองอีกครั้ง
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`tap-target inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-100 hover:bg-slate-700 ${denyRing}`}
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
