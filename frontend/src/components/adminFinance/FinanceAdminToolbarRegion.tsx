import type { ReactNode } from 'react'

/** แถบลัด รีเฟรช บันทึกกิจกรรม ฟิลเตอร์/พรีเซ็ตรายงาน สรุปภาพรวม — ไม่เพิ่ม gap (แต่ละแผงจัด margin เอง) */
export function FinanceAdminToolbarRegion({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col" aria-label="แถบเครื่องมือและสรุปรายงาน">
      {children}
    </section>
  )
}
