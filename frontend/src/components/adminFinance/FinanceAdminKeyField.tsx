import { ADMIN_UPLOAD_STORAGE_KEY } from '../../lib/adminApi'
import { portalFocusRing } from '../../portal/portalLabels'

type Props = {
  adminKey: string
  setAdminKey: (v: string) => void
}

/** ช่อง Admin key สำหรับแผงการเงิน — เก็บใน session เดียวกับแผงนำเข้า/อื่นๆ */
export function FinanceAdminKeyField({ adminKey, setAdminKey }: Props) {
  return (
    <label className="mt-4 block max-w-xl text-sm text-slate-300">
      Admin key (x-admin-key)
      <input
        type="password"
        autoComplete="off"
        value={adminKey}
        onChange={(e) => {
          const v = e.target.value
          setAdminKey(v)
          sessionStorage.setItem(ADMIN_UPLOAD_STORAGE_KEY, v)
        }}
        aria-label="Admin key สำหรับ API การเงิน"
        className={`mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus-visible:border-emerald-600 ${portalFocusRing}`}
        placeholder="ค่าเดียวกับ ADMIN_UPLOAD_KEY ใน backend/.env"
      />
    </label>
  )
}
