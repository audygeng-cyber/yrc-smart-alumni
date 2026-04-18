import { NavLink } from 'react-router-dom'
import { portalFocusRing } from '../../portal/portalLabels'

const focus = `rounded-lg px-3 py-2 text-sm font-medium ${portalFocusRing}`

function navClass({ isActive }: { isActive: boolean }) {
  return `${focus} ${isActive ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
}

export type FinanceAdminTab = 'accounting' | 'meetings' | 'payments'

/** แท็บย่อยแผงการเงิน — แยกบัญชี / ประชุม / คำขอจ่าย */
export function FinanceAdminSubNav() {
  return (
    <nav
      className="mt-4 flex flex-wrap gap-2 border-b border-slate-800 pb-4"
      aria-label="แยกหมวดงานการเงินและบัญชี"
    >
      <NavLink to="/admin/finance/accounting" className={navClass} end>
        บัญชี-การเงิน
      </NavLink>
      <NavLink to="/admin/finance/meetings" className={navClass}>
        สร้างการประชุม
      </NavLink>
      <NavLink to="/admin/finance/payments" className={navClass}>
        สร้าง/อนุมัติคำขอจ่ายเงิน
      </NavLink>
    </nav>
  )
}
