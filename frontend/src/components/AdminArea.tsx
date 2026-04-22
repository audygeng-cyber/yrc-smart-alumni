import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { themeLayout } from '../lib/themeTokens'
import { portalAccent, portalFocusRing } from '../portal/portalLabels'

const adminNavFocus = `tap-target inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${portalFocusRing}`

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `${adminNavFocus} shrink-0 whitespace-nowrap ${isActive ? portalAccent.button : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
}

/** โครงร่าง Admin: หัวเรื่อง + แท็บย่อย + `<Outlet />` สำหรับหน้าแรกหรือแผงแต่ละหมวด */
export function AdminLayout() {
  return (
    <div className={themeLayout.pageStack}>
      <header className={themeLayout.sectionCard}>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ศูนย์ผู้ดูแลระบบ</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-100">จัดการข้อมูลและเครื่องมือผู้ดูแล</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          แยกตามหมวดงาน — สมาชิก/ทะเบียน การเงิน โรงเรียนกวดวิชา และกิจกรรมโรงเรียน การกำหนดสิทธิ์ตามบทบาท (RBAC) สำหรับเมนูพอร์ทัลหลักตั้งได้ด้วย{' '}
          <code className="rounded bg-slate-950/80 px-1 py-0.5 text-slate-300">VITE_ENFORCE_APP_RBAC=true</code> และบทบาทใน Supabase — แผงด้านล่างยังต้องใช้ Admin key กับ API ตามเดิม
        </p>
        <p className="mt-2 max-w-3xl text-xs text-slate-400">
          หมายเหตุ: การบันทึกหรือปิดงวดในระบบนี้เป็นการจัดเก็บข้อมูลบัญชีในแอป — ไม่ได้แทนการรับรองงบการเงินตามกฎหมายหรือบทบาทผู้สอบบัญชีภายนอก
        </p>
        <nav
          className="mt-5 -mx-1 flex min-w-0 max-w-full touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
          aria-label="เมนูผู้ดูแลระบบ"
        >
          <NavLink to="/admin" end className={adminNavClass}>
            ภาพรวม
          </NavLink>
          <NavLink to="/admin/import" className={adminNavClass}>
            สมาชิกและนำเข้า
          </NavLink>
          <NavLink to="/admin/finance" className={adminNavClass}>
            การเงินและบัญชี
          </NavLink>
          <NavLink to="/admin/cram" className={adminNavClass}>
            โรงเรียนกวดวิชา
          </NavLink>
          <NavLink to="/admin/school-activities" className={adminNavClass}>
            กิจกรรมโรงเรียน
          </NavLink>
          <NavLink to="/admin/election-cards" className={adminNavClass}>
            รับบัตรเลือกตั้ง
          </NavLink>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}

type AdminCardProps = {
  to: string
  title: string
  description: string
  badge?: string
}

function AdminCard({ to, title, description, badge }: AdminCardProps) {
  return (
    <NavLink
      to={to}
      className={`block rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-fuchsia-800/50 hover:bg-slate-900/70 ${portalFocusRing}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {badge ? (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <p className="mt-3 text-xs font-medium text-fuchsia-400/90">เปิดแผง →</p>
    </NavLink>
  )
}

function AdminSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/** หน้าแรก `/admin` — ทางเข้าแยกตามหมวด */
export function AdminHomePage() {
  return (
    <div className="space-y-10">
      <AdminSection id="admin-section-members" title="ข้อมูลสมาชิกและทะเบียน">
        <AdminCard
          to="/admin/import"
          badge="นำเข้า"
          title="นำเข้าและล้างข้อมูลสมาชิก"
          description="อัปโหลด XLSX เทมเพลต ตรวจสอบหลังนำเข้า และเครื่องมือล้างข้อมูลทดสอบ (ใช้ Admin key)"
        />
        <AdminCard
          to="/requests"
          badge="คำร้อง"
          title="คำร้องขอแก้ไขข้อมูลสมาชิก"
          description="ตรวจคำร้องจากสมาชิกที่ขอแก้ไขข้อมูลในทะเบียน"
        />
        <AdminCard
          to="/admin/election-cards"
          badge="QR"
          title="รับบัตรเลือกตั้ง (QR บัตรสมาชิก)"
          description="สร้างงานรับบัตร ดูสถิติตามรุ่นและเปอร์เซ็นต์เทียบสมาชิก Active — สมาชิกสแกน QR ที่หน้า /open/member-identity"
        />
      </AdminSection>

      <AdminSection id="admin-section-finance" title="การเงินและบัญชี">
        <AdminCard
          to="/admin/finance/accounting"
          badge="บัญชี"
          title="บัญชี-การเงิน · ประชุม · คำขอจ่ายเงิน"
          description="แยกแท็บ: สมุดรายวันและรายงานบัญชี สร้างการประชุม และสร้าง/อนุมัติคำขอจ่ายเงิน"
        />
      </AdminSection>

      <AdminSection id="admin-section-committee-link" title="พอร์ทัลคณะกรรมการ (เชื่อมกับประชุม)">
        <AdminCard
          to="/committee/meetings"
          badge="พอร์ทัล"
          title="วาระและรายงานประชุม — `/committee/meetings`"
          description="เปิดในพอร์ทัลคณะกรรมการ (ไม่ใช่หน้าผู้ดูแล) — ต้องล็อกอิน LINE และผ่าน RBAC เส้นทาง `/committee/*` (บทบาทที่อนุญาตรวมบทบาท admin ในแอป — แยกจากการยืนยันด้วย Admin API key) หลังตั้งวาระในแผงการเงิน ใช้ที่นี่เพื่อดูวาระ ลงชื่อ และลงมติ"
        />
      </AdminSection>

      <AdminSection id="admin-section-cram" title="โรงเรียนกวดวิชา (CRAM)">
        <AdminCard
          to="/admin/cram"
          badge="CRAM"
          title="ห้องเรียนและนักเรียน"
          description="จัดการห้องเรียน คะแนน และรายชื่อนักเรียนในระบบกวดวิชา"
        />
      </AdminSection>

      <AdminSection id="admin-section-school" title="โรงเรียนและกิจกรรม">
        <AdminCard
          to="/admin/school-activities"
          badge="กิจกรรม"
          title="คอร์ส กิจกรรม และการบริจาค"
          description="ตั้งค่ากิจกรรม ขอบเขตกองเงิน เป้าหมายยอดบริจาค และสรุปที่เกี่ยวกับโรงเรียน"
        />
      </AdminSection>
    </div>
  )
}
