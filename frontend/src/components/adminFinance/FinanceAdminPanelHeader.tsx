import { ACCOUNTING_OWNER_DOCS_URL } from './financeOwnerScopeCopy'

export function FinanceAdminPanelHeader() {
  return (
    <>
      <h2 className="text-sm font-medium uppercase tracking-wide text-fuchsia-200/90">
        แผงผู้ดูแลการเงิน (Admin Finance)
      </h2>
      <p className="mt-2 text-xs text-slate-400">
        แยกหมวดด้านล่าง: บัญชี-การเงิน · สร้างการประชุม · สร้าง/อนุมัติคำขอจ่ายเงิน — ใช้ Admin key เดียวกับแผงผู้ดูแลอื่น (เก็บในเซสชันเบราว์เซอร์เดียวกัน)
      </p>
      <aside
        className="mt-3 rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-3 text-[11px] leading-snug text-slate-300"
        aria-label="ขอบเขตโมดูลบัญชีตามความต้องการเจ้าของผลิตภัณฑ์"
      >
        <p className="font-medium text-cyan-100/95">ขอบเขตบัญชี (สรุป)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
          <li>ระบบรองรับการบันทึกและรายงานในกรอบโปรเจกต์ พร้อมส่งออกข้อมูล</li>
          <li>
            ไฟล์ CSV จากปุ่มส่งออกด้านล่างเปิดใน <strong className="text-slate-300">Excel</strong> ได้ — ใช้เป็นวัตถุดิบให้{' '}
            <strong className="text-slate-300">ผู้ตรวจสอบบัญชี</strong> นำไปปิดงบการเงินนอกระบบ
          </li>
          <li>
            <strong className="text-slate-300">แอปนี้ไม่รับรองหรือปิดงบการเงินแทนผู้ตรวจ</strong> — &quot;ปิดงวด&quot; / &quot;ปิดปี&quot; ในที่นี้หมายถึงกระบวนการบันทึกภายใน/สแนปช็อตสำหรับส่งมอบ ไม่เทียบเท่าการรับรองงบตามกฎหมาย
          </li>
        </ul>
        <p className="mt-2">
          <a
            href={ACCOUNTING_OWNER_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 underline decoration-cyan-700/80 underline-offset-2 hover:text-cyan-200"
          >
            อ่านความต้องการเต็ม (ACCOUNTING_OWNER_REQUIREMENTS)
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/audygeng-cyber/yrc-smart-alumni/blob/master/docs/ACCOUNTING_FLOW.md"
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 underline decoration-cyan-700/80 underline-offset-2 hover:text-cyan-200"
          >
            ACCOUNTING_FLOW
          </a>
        </p>
      </aside>
    </>
  )
}
