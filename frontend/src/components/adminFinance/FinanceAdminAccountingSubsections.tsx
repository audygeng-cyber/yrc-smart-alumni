import type { ReactNode } from 'react'

/** รายงานภาพรวม ปิดงวด และงบทดลอง — แยกจากบล็อกบัญชี-การเงินด้านล่าง */
export function FinanceAdminReportsOverviewSection({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-slate-800/90 bg-slate-950/30 p-4"
      aria-labelledby="finance-reports-overview-heading"
    >
      <header className="border-b border-slate-800/80 pb-3">
        <h2 id="finance-reports-overview-heading" className="text-sm font-semibold tracking-tight text-slate-100">
          รายงานและปิดงวด
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">งบ P/L · ปิดงวดบัญชี · งบทดลอง — ใช้ตัวกรองวันที่/หน่วยงานด้านบน</p>
      </header>
      {children}
    </section>
  )
}

/**
 * บัญชี-การเงิน — รวมสมุดรายรับ (บันทึกผ่านสมุดรายวันแบบคู่บัญชี) และรายงาน GL / งบกำไร / งบดุล
 */
export function FinanceAdminAccountingFinanceSection({ children }: { children: ReactNode }) {
  return (
    <section
      className="mt-6 flex flex-col gap-3 rounded-xl border border-emerald-900/45 bg-emerald-950/15 p-4"
      aria-labelledby="finance-accounting-finance-heading"
    >
      <header className="border-b border-emerald-900/35 pb-3">
        <h2 id="finance-accounting-finance-heading" className="text-sm font-semibold tracking-tight text-emerald-100">
          บัญชี-การเงิน
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">
          ส่วน <span className="text-emerald-200/90">สมุดรายรับ</span> ใช้บันทึกรายการรับรู้รายได้และเงินเข้า (ระบบ backend เป็นสมุดรายวันแบบคู่บัญชี) — คู่กับรายงาน GL และงบการเงินในคอลัมน์ถัดไป
        </p>
      </header>
      {children}
    </section>
  )
}

/** เครื่องมือรอบปีบัญชี ภาษี และสินทรัพย์ถาวร */
export function FinanceAdminFiscalToolsSection({ children }: { children: ReactNode }) {
  return (
    <section
      className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-900/35 bg-amber-950/10 p-4"
      aria-labelledby="finance-fiscal-tools-heading"
    >
      <header className="border-b border-amber-900/30 pb-3">
        <h2 id="finance-fiscal-tools-heading" className="text-sm font-semibold tracking-tight text-amber-100">
          รอบปีบัญชี · ภาษี · สินทรัพย์
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">ปิดปี สินทรัพย์ถาวร และรายงานภาษีรายเดือน</p>
      </header>
      {children}
    </section>
  )
}

/** รายงานบริจาคแยกตามมุมมอง */
export function FinanceAdminDonationsSection({ children }: { children: ReactNode }) {
  return (
    <section
      className="mt-6 flex flex-col gap-3 rounded-xl border border-violet-900/40 bg-violet-950/15 p-4"
      aria-labelledby="finance-donations-heading"
    >
      <header className="border-b border-violet-900/35 pb-3">
        <h2 id="finance-donations-heading" className="text-sm font-semibold tracking-tight text-violet-100">
          บริจาคและการแบ่งมุมมอง
        </h2>
        <p className="mt-1 text-[11px] text-slate-500">สรุปบริจาคตามผู้บริจาค / รุ่น / หน่วยงาน</p>
      </header>
      {children}
    </section>
  )
}
