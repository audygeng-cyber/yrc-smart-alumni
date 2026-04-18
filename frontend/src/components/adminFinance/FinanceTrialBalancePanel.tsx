import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { TrialBalancePayload } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceTrialBalancePanelProps = {
  trialBalance: TrialBalancePayload
  onExportViewCsv: () => void
}

export function FinanceTrialBalancePanel({ trialBalance, onExportViewCsv }: FinanceTrialBalancePanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="รายงาน Trial Balance">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium">Trial Balance (งบทดลอง)</p>
        <button
          type="button"
          onClick={onExportViewCsv}
          aria-label="ส่งออกข้อมูล Trial Balance ของมุมมองปัจจุบัน"
          className={`rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700 ${portalFocusRing}`}
        >
          ส่งออก CSV ของมุมมองนี้
        </button>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Journal entries: {formatThNumber(trialBalance.journalEntryCount)} | เดบิตรวม{' '}
        {formatThNumber(trialBalance.totals.totalDebit)} | เครดิตรวม {formatThNumber(trialBalance.totals.totalCredit)} | กำไรสุทธิ{' '}
        {formatThNumber(trialBalance.totals.netIncome)}
      </p>
      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="min-w-full text-left text-[11px] text-slate-300" aria-label="ตาราง Trial Balance">
          <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-2 py-1.5">
                หน่วยงาน
              </th>
              <th scope="col" className="px-2 py-1.5">
                รหัส
              </th>
              <th scope="col" className="px-2 py-1.5">
                ชื่อบัญชี
              </th>
              <th scope="col" className="px-2 py-1.5">
                ประเภท
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                เดบิต
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                เครดิต
              </th>
              <th scope="col" className="px-2 py-1.5 text-right">
                สุทธิ
              </th>
            </tr>
          </thead>
          <tbody>
            {trialBalance.rows.slice(0, 200).map((row) => (
              <tr key={`${row.legalEntityCode}:${row.accountCode}`} className="border-t border-slate-800/80">
                <td className="px-2 py-1.5">{row.legalEntityCode}</td>
                <td className="px-2 py-1.5">{row.accountCode}</td>
                <td className="px-2 py-1.5">{row.accountName}</td>
                <td className="px-2 py-1.5">{row.accountType}</td>
                <td className="px-2 py-1.5 text-right">{formatThNumber(row.debit)}</td>
                <td className="px-2 py-1.5 text-right">{formatThNumber(row.credit)}</td>
                <td className="px-2 py-1.5 text-right">{formatThNumber(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {trialBalance.rows.length > 200 ? (
        <p className="mt-2 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          แสดง 200 รายการแรกจากทั้งหมด {formatThNumber(trialBalance.rows.length)} รายการ (ส่งออก CSV ได้ครบทั้งหมด)
        </p>
      ) : null}
    </div>
  )
}
