import type { ReactNode } from 'react'

/** ครอบบล็อกรายงาน ปิดงวด บัญชี-การเงิน (สมุดรายรับ) ภาษี/ปี บริจาค — แต่ละส่วนย่อยจัดกรอบใน `FinanceAdminAccountingStack` */
export function FinanceAdminAccountingRegion({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-0" aria-label="แผงบัญชีและการเงิน — แบ่งเป็นส่วนย่อย">
      {children}
    </section>
  )
}
