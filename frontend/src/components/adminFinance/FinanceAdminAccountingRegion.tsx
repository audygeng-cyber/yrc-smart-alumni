import type { ReactNode } from 'react'

/** ครอบบล็อกรายงาน P/L, ปิดงวด, trial balance, สมุดรายวัน/GL, เครื่องมือบัญชี/ภาษี, บริจาค — ไม่เพิ่ม gap (แต่ละแผงจัด margin เอง) */
export function FinanceAdminAccountingRegion({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col" aria-label="รายงานและเครื่องมือบัญชี">
      {children}
    </section>
  )
}
