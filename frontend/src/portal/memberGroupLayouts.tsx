import { Link, NavLink, Outlet } from 'react-router-dom'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing } from './portalLabels'

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  `${themeTapTarget} shrink-0 rounded-lg px-3 py-2 text-xs font-medium sm:text-sm ${portalFocusRing} ${
    isActive ? `${themeAccent.buttonPrimary} text-white` : 'border border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
  }`

const associationItems: { to: string; label: string }[] = [
  { to: '/member/association/agendas', label: 'วาระการประชุมทั้งหมด' },
  { to: '/member/association/meeting-reports', label: 'รายงานการประชุมทั้งหมด' },
]

const cramItems: { to: string; label: string }[] = [
  { to: '/member/cram-school/student-stats', label: 'สถิตินักเรียน / วิชา / ห้อง' },
  { to: '/member/cram-school/agendas', label: 'วาระการประชุมทั้งหมด' },
  { to: '/member/cram-school/meeting-reports', label: 'รายงานการประชุมทั้งหมด' },
]

function AdminNote() {
  return (
    <p className="mt-3 rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
      รายการเหล่านี้บันทึกและเผยแพร่โดยผู้ดูแลระบบ — สมาชิกดูได้อย่างเดียว หากต้องการตรวจสอบฉบับเต็มหรืออัปโหลดเอกสาร ใช้แผง Admin ตามสิทธิ์
    </p>
  )
}

export function MemberAssociationLayout() {
  return (
    <div className="min-w-0 space-y-4">
      <header className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <h2 className="text-base font-semibold text-slate-100">กิจกรรมสมาคมศิษย์เก่า</h2>
        <p className="mt-1 text-sm text-slate-400">วาระและรายงานการประชุมของสมาคมฯ — แยกจากกองโรงเรียนยุพราชและโรงเรียนกวดวิชา</p>
        <AdminNote />
      </header>
      <nav
        className="-mx-1 flex min-w-0 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
        aria-label="เมนูย่อยสมาคมศิษย์เก่า"
      >
        {associationItems.map((item) => (
          <NavLink key={item.to} to={item.to} end className={subNavClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

export function MemberCramSchoolLayout() {
  return (
    <div className="min-w-0 space-y-4">
      <header className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <h2 className="text-base font-semibold text-slate-100">กิจกรรมโรงเรียนกวดวิชา</h2>
        <p className="mt-1 text-sm text-slate-400">สถิติการเรียนการสอนและรายงานประชุมโรงเรียนกวดวิชา — แยกจากสมาคมศิษย์เก่า</p>
        <AdminNote />
      </header>
      <nav
        className="-mx-1 flex min-w-0 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
        aria-label="เมนูย่อยโรงเรียนกวดวิชา"
      >
        {cramItems.map((item) => (
          <NavLink key={item.to} to={item.to} end className={subNavClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

type PlaceholderProps = {
  title: string
  description: string
  committeeLink?: string
  academyLink?: string
}

export function MemberPortalPlaceholderPage(props: PlaceholderProps) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label={props.title}>
      <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">{props.title}</h3>
      <p className="mt-2 text-sm text-slate-400">{props.description}</p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-400">
        <li>เอกสารฉบับนี้ sync จากระบบหลังบ้านเมื่อผู้ดูแลบันทึก — สมาชิกไม่แก้ไขได้ที่นี่</li>
        <li>รายงานที่เผยแพร่ผ่านพอร์ทัลมาจากข้อมูลที่ผู้ดูแลบันทึก — ไม่มีโมดูลบัญชีแยกประเภทในแอปนี้</li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {props.committeeLink ? (
          <Link
            to={props.committeeLink}
            className={`${themeTapTarget} inline-flex rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            พอร์ทัลคณะกรรมการ
          </Link>
        ) : null}
        {props.academyLink ? (
          <Link
            to={props.academyLink}
            className={`${themeTapTarget} inline-flex rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            พอร์ทัลโรงเรียนกวดวิชา (Academy)
          </Link>
        ) : null}
        <Link
          to="/admin"
          className={`${themeTapTarget} inline-flex rounded-lg border border-fuchsia-900/50 px-3 py-2 text-xs text-fuchsia-200 hover:bg-fuchsia-950/30 ${portalFocusRing}`}
        >
          แผงผู้ดูแล (Admin)
        </Link>
      </div>
    </section>
  )
}
