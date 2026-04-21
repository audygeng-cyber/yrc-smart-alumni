import { NavLink } from 'react-router-dom'
import { portalAccent, portalFocusRing } from '../../portal/portalLabels'

const focus = `tap-target inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${portalFocusRing}`

function navClass({ isActive }: { isActive: boolean }) {
  return `${focus} shrink-0 whitespace-nowrap ${isActive ? portalAccent.button : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
}

export type FinanceAdminTab = 'accounting' | 'meetings' | 'payments'

/** แท็บย่อยแผงการเงิน — แยกบัญชี / ประชุม / คำขอจ่าย */
export function FinanceAdminSubNav() {
  return (
    <nav
      className="mt-4 min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin]"
      aria-label="แยกหมวดงานการเงินและบัญชี"
    >
      <div className="flex w-max flex-nowrap gap-2 border-b border-slate-800 pb-4">
        <NavLink to="/admin/finance/accounting" className={navClass} end>
          บัญชี-การเงิน
        </NavLink>
        <NavLink to="/admin/finance/meetings" className={navClass}>
          สร้างการประชุม
        </NavLink>
        <NavLink to="/admin/finance/payments" className={navClass}>
          สร้าง/อนุมัติคำขอจ่ายเงิน
        </NavLink>
      </div>
    </nav>
  )
}
