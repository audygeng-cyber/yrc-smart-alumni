import type { Dispatch, SetStateAction } from 'react'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type {
  BalanceSheetPayload,
  GeneralLedgerPayload,
  IncomeStatementPayload,
  JournalListItem,
} from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type JournalDetailState = {
  journal: Record<string, unknown>
  lines: Array<Record<string, unknown> & { account_code?: string; account_name?: string }>
  totals: { debit: number; credit: number; isBalanced: boolean }
} | null

export type FinanceJournalsGlPanelProps = {
  loading: boolean
  journalStatusFilter: '' | 'draft' | 'posted' | 'voided'
  setJournalStatusFilter: Dispatch<SetStateAction<'' | 'draft' | 'posted' | 'voided'>>
  onLoadJournals: () => void
  journalList: JournalListItem[]
  onLoadJournalDetail: (id: string) => void
  journalDraftEntity: 'association' | 'cram_school'
  setJournalDraftEntity: Dispatch<SetStateAction<'association' | 'cram_school'>>
  journalDraftDate: string
  setJournalDraftDate: Dispatch<SetStateAction<string>>
  journalDraftRef: string
  setJournalDraftRef: Dispatch<SetStateAction<string>>
  journalDraftBy: string
  setJournalDraftBy: Dispatch<SetStateAction<string>>
  journalDraftMemo: string
  setJournalDraftMemo: Dispatch<SetStateAction<string>>
  onCreateJournalDraft: () => void
  journalActiveId: string
  journalLineAccount: string
  setJournalLineAccount: Dispatch<SetStateAction<string>>
  journalLineDebit: string
  setJournalLineDebit: Dispatch<SetStateAction<string>>
  journalLineCredit: string
  setJournalLineCredit: Dispatch<SetStateAction<string>>
  journalLineDesc: string
  setJournalLineDesc: Dispatch<SetStateAction<string>>
  journalLineBy: string
  setJournalLineBy: Dispatch<SetStateAction<string>>
  onAddJournalLine: () => void
  journalPostBy: string
  setJournalPostBy: Dispatch<SetStateAction<string>>
  onPostJournal: () => void
  journalVoidReason: string
  setJournalVoidReason: Dispatch<SetStateAction<string>>
  journalVoidBy: string
  setJournalVoidBy: Dispatch<SetStateAction<string>>
  onVoidJournal: () => void
  journalDetail: JournalDetailState
  /** Prefill payment request tools with this journal (same legal entity; not voided). */
  onLinkJournalToPaymentRequest?: () => void
  onLoadIncomeStatement: () => void
  bsAsOf: string
  setBsAsOf: Dispatch<SetStateAction<string>>
  onLoadBalanceSheet: () => void
  glAccountCode: string
  setGlAccountCode: Dispatch<SetStateAction<string>>
  onLoadGeneralLedger: () => void
  incomeStatement: IncomeStatementPayload | null
  balanceSheet: BalanceSheetPayload | null
  generalLedger: GeneralLedgerPayload | null
}

export function FinanceJournalsGlPanel({
  loading,
  journalStatusFilter,
  setJournalStatusFilter,
  onLoadJournals,
  journalList,
  onLoadJournalDetail,
  journalDraftEntity,
  setJournalDraftEntity,
  journalDraftDate,
  setJournalDraftDate,
  journalDraftRef,
  setJournalDraftRef,
  journalDraftBy,
  setJournalDraftBy,
  journalDraftMemo,
  setJournalDraftMemo,
  onCreateJournalDraft,
  journalActiveId,
  journalLineAccount,
  setJournalLineAccount,
  journalLineDebit,
  setJournalLineDebit,
  journalLineCredit,
  setJournalLineCredit,
  journalLineDesc,
  setJournalLineDesc,
  journalLineBy,
  setJournalLineBy,
  onAddJournalLine,
  journalPostBy,
  setJournalPostBy,
  onPostJournal,
  journalVoidReason,
  setJournalVoidReason,
  journalVoidBy,
  setJournalVoidBy,
  onVoidJournal,
  journalDetail,
  onLinkJournalToPaymentRequest,
  onLoadIncomeStatement,
  bsAsOf,
  setBsAsOf,
  onLoadBalanceSheet,
  glAccountCode,
  setGlAccountCode,
  onLoadGeneralLedger,
  incomeStatement,
  balanceSheet,
  generalLedger,
}: FinanceJournalsGlPanelProps) {
  return (
    <div
      className="rounded-lg border border-indigo-900/50 bg-slate-950/60 p-3 text-xs text-slate-200"
      aria-label="สมุดรายรับและรายงาน GL · งบกำไร · งบดุล"
    >
      <h3 className="text-sm font-medium text-indigo-200">สมุดรายรับ · GL · งบกำไร · งบดุล</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        ใช้ตัวกรองวันที่/หน่วยงานด้านบน — คอลัมน์ซ้ายบันทึกผ่านสมุดรายวัน (double-entry) ในชื่อเรียกงาน <span className="text-slate-400">สมุดรายรับ</span>
      </p>
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-2 font-medium text-slate-100">สมุดรายรับ</p>
          <div className="flex flex-wrap gap-1">
            <select
              value={journalStatusFilter}
              onChange={(e) => setJournalStatusFilter(e.target.value as '' | 'draft' | 'posted' | 'voided')}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            >
              <option value="">ทุกสถานะ</option>
              <option value="draft">draft</option>
              <option value="posted">posted</option>
              <option value="voided">voided</option>
            </select>
            <button
              type="button"
              disabled={loading}
              onClick={onLoadJournals}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
            >
              โหลดรายการ
            </button>
          </div>
          <div className="mt-2 max-h-36 overflow-y-auto rounded border border-slate-800">
            {journalList.length === 0 ? (
              <p className="p-2 text-[11px] text-slate-500">ยังไม่มีข้อมูล</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-[11px]">
                {journalList.slice(0, 40).map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void onLoadJournalDetail(j.id)}
                      className={`w-full px-2 py-1 text-left hover:bg-slate-800/80 ${portalFocusRing}`}
                    >
                      <span className="text-slate-300">{j.entry_date}</span> <span className="text-slate-500">{j.status}</span> · {j.reference_no || '—'} ·{' '}
                      {(j.legal_entity_code ?? '').slice(0, 4)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">สร้างร่างใหม่</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            <select
              value={journalDraftEntity}
              onChange={(e) => setJournalDraftEntity(e.target.value as 'association' | 'cram_school')}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            >
              <option value="association">สมาคม</option>
              <option value="cram_school">กวดวิชา</option>
            </select>
            <input
              type="date"
              value={journalDraftDate}
              onChange={(e) => setJournalDraftDate(e.target.value)}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalDraftRef}
              onChange={(e) => setJournalDraftRef(e.target.value)}
              placeholder="เลขที่อ้างอิง"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalDraftBy}
              onChange={(e) => setJournalDraftBy(e.target.value)}
              placeholder="ผู้สร้าง"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalDraftMemo}
              onChange={(e) => setJournalDraftMemo(e.target.value)}
              placeholder="หมายเหตุหัวเอกสาร"
              className={`sm:col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCreateJournalDraft}
            className={`mt-2 rounded bg-indigo-800 px-2 py-1 text-[11px] text-white hover:bg-indigo-700 disabled:opacity-50 ${portalFocusRing}`}
          >
            สร้างร่าง
          </button>
          <p className="mt-2 text-[10px] text-slate-500">
            เอกสารที่เลือก: {journalActiveId || '—'} · เพิ่มบรรทัด (draft เท่านั้น)
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <input
              type="text"
              value={journalLineAccount}
              onChange={(e) => setJournalLineAccount(e.target.value)}
              placeholder="รหัสบัญชี"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalLineDebit}
              onChange={(e) => setJournalLineDebit(e.target.value)}
              placeholder="เดบิต"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalLineCredit}
              onChange={(e) => setJournalLineCredit(e.target.value)}
              placeholder="เครดิต"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalLineDesc}
              onChange={(e) => setJournalLineDesc(e.target.value)}
              placeholder="รายละเอียดบรรทัด"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalLineBy}
              onChange={(e) => setJournalLineBy(e.target.value)}
              placeholder="ผู้บันทึกบรรทัด"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={loading}
              onClick={onAddJournalLine}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              เพิ่มบรรทัด
            </button>
            <input
              type="text"
              value={journalPostBy}
              onChange={(e) => setJournalPostBy(e.target.value)}
              placeholder="ผู้โพสต์"
              className={`w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={onPostJournal}
              className={`rounded bg-fuchsia-800 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              โพสต์
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2">
            <input
              type="text"
              value={journalVoidReason}
              onChange={(e) => setJournalVoidReason(e.target.value)}
              placeholder="เหตุผล void"
              className={`min-w-[8rem] flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={journalVoidBy}
              onChange={(e) => setJournalVoidBy(e.target.value)}
              placeholder="ผู้ void"
              className={`w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={onVoidJournal}
              className={`rounded bg-rose-900 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              Void
            </button>
          </div>
          {journalDetail ? (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-800 p-2 text-[10px] text-slate-400">
              <p>
                เดบิต {formatThNumber(journalDetail.totals.debit)} · เครดิต {formatThNumber(journalDetail.totals.credit)} {journalDetail.totals.isBalanced ? '· สมดุล' : '· ยังไม่สมดุล'}
              </p>
              <ul className="mt-1 space-y-0.5">
                {journalDetail.lines.slice(0, 30).map((line, idx) => (
                  <li key={String(line.id ?? idx)}>
                    {String(line.account_code ?? '')} {String(line.debit ?? '')}/{String(line.credit ?? '')} {String(line.description ?? '')}
                  </li>
                ))}
              </ul>
              {onLinkJournalToPaymentRequest &&
              journalActiveId.trim() &&
              String(journalDetail.journal.status ?? '') !== 'voided' ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={onLinkJournalToPaymentRequest}
                  className={`mt-2 rounded bg-fuchsia-900/80 px-2 py-1 text-[11px] text-fuchsia-100 disabled:opacity-50 ${portalFocusRing}`}
                >
                  ผูกคำขอจ่ายกับเอกสารสมุดนี้
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-2 font-medium text-slate-100">รายงาน GL / งบกำไร / งบดุล</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={loading}
              onClick={onLoadIncomeStatement}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              งบกำไรขาดทุน
            </button>
            <input
              type="date"
              value={bsAsOf}
              onChange={(e) => setBsAsOf(e.target.value)}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={onLoadBalanceSheet}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              งบดุล (ถึงวันที่)
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <input
              type="text"
              value={glAccountCode}
              onChange={(e) => setGlAccountCode(e.target.value)}
              placeholder="รหัสบัญชี GL"
              className={`w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={onLoadGeneralLedger}
              className={`rounded bg-indigo-800 px-2 py-1 text-[11px] text-white disabled:opacity-50 ${portalFocusRing}`}
            >
              โหลด GL
            </button>
          </div>
          {incomeStatement ? (
            <p className="mt-2 text-[10px] text-slate-400">
              รายได้ {formatThNumber(incomeStatement.totals.revenue)} · ค่าใช้จ่าย {formatThNumber(incomeStatement.totals.expense)} · สุทธิ {formatThNumber(incomeStatement.totals.netIncome)} · journals{' '}
              {formatThNumber(incomeStatement.journalEntryCount)}
            </p>
          ) : null}
          {balanceSheet ? (
            <p className="mt-2 text-[10px] text-slate-400">
              สินทรัพย์ {formatThNumber(balanceSheet.totals.assets)} · หนี้สิน {formatThNumber(balanceSheet.totals.liabilities)} · ส่วนของเจ้าของ {formatThNumber(balanceSheet.totals.equity)} · สมดุล{' '}
              {balanceSheet.accountingEquation.isBalanced ? 'ใช่' : 'ไม่'}
            </p>
          ) : null}
          {generalLedger ? (
            <div className="mt-2 max-h-32 overflow-y-auto text-[10px] text-slate-400">
              <p>
                {generalLedger.account.account_code} {generalLedger.account.account_name} · คงเหลือ {formatThNumber(generalLedger.totals.endingBalance)}
              </p>
              <ul className="mt-1 space-y-0.5">
                {generalLedger.rows.slice(0, 12).map((row, i) => (
                  <li key={`${row.entry_date}-${i}`}>
                    {row.entry_date} D{formatThNumber(row.debit)} C{formatThNumber(row.credit)} bal {formatThNumber(row.running_balance)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
