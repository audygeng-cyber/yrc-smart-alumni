import type { Dispatch, SetStateAction } from 'react'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { FinancePeriodClosingDetail, FinancePeriodClosingItem } from '../../lib/adminFinanceTypes'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinancePeriodClosingPanelProps = {
  loading: boolean
  closePeriodFrom: string
  setClosePeriodFrom: Dispatch<SetStateAction<string>>
  closePeriodTo: string
  setClosePeriodTo: Dispatch<SetStateAction<string>>
  closeBy: string
  setCloseBy: Dispatch<SetStateAction<string>>
  closeNote: string
  setCloseNote: Dispatch<SetStateAction<string>>
  onCloseAccountingPeriod: () => void
  periodHandoffFilter: 'all' | 'pending' | 'sent' | 'completed'
  setPeriodHandoffFilter: Dispatch<SetStateAction<'all' | 'pending' | 'sent' | 'completed'>>
  auditorSentBy: string
  setAuditorSentBy: Dispatch<SetStateAction<string>>
  auditorHandoffNote: string
  setAuditorHandoffNote: Dispatch<SetStateAction<string>>
  auditorCompletedBy: string
  setAuditorCompletedBy: Dispatch<SetStateAction<string>>
  auditorCompletedNote: string
  setAuditorCompletedNote: Dispatch<SetStateAction<string>>
  periodClosings: FinancePeriodClosingItem[]
  onLoadPeriodClosingDetail: (id: string) => void
  onMarkAuditorSent: (id: string, label: string) => void
  onMarkAuditorCompleted: (id: string, label: string) => void
  onDownloadAuditorPackage: (id: string, label: string) => void
  periodClosingDetail: FinancePeriodClosingDetail | null
  setPeriodClosingDetail: Dispatch<SetStateAction<FinancePeriodClosingDetail | null>>
}

export function FinancePeriodClosingPanel({
  loading,
  closePeriodFrom,
  setClosePeriodFrom,
  closePeriodTo,
  setClosePeriodTo,
  closeBy,
  setCloseBy,
  closeNote,
  setCloseNote,
  onCloseAccountingPeriod,
  periodHandoffFilter,
  setPeriodHandoffFilter,
  auditorSentBy,
  setAuditorSentBy,
  auditorHandoffNote,
  setAuditorHandoffNote,
  auditorCompletedBy,
  setAuditorCompletedBy,
  auditorCompletedNote,
  setAuditorCompletedNote,
  periodClosings,
  onLoadPeriodClosingDetail,
  onMarkAuditorSent,
  onMarkAuditorCompleted,
  onDownloadAuditorPackage,
  periodClosingDetail,
  setPeriodClosingDetail,
}: FinancePeriodClosingPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="ปิดงวดบัญชีและส่งผู้ตรวจสอบ">
      <h3 className="text-sm font-medium text-slate-100">ปิดงวดบัญชีและเตรียมไฟล์ผู้ตรวจสอบ</h3>
      <p className="mt-1 text-[11px] text-slate-400">
        เลือกหน่วยงานและช่วงวันที่เพื่อบันทึกงวดปิดบัญชี จากนั้นส่งออก <code className="text-slate-500">Auditor Package CSV</code> เพื่อส่งผู้ตรวจสอบ
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        <input
          type="date"
          value={closePeriodFrom}
          onChange={(e) => setClosePeriodFrom(e.target.value)}
          aria-label="วันที่เริ่มงวดบัญชีที่ต้องการปิด"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        />
        <input
          type="date"
          value={closePeriodTo}
          onChange={(e) => setClosePeriodTo(e.target.value)}
          aria-label="วันที่สิ้นสุดงวดบัญชีที่ต้องการปิด"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        />
        <input
          value={closeBy}
          onChange={(e) => setCloseBy(e.target.value)}
          aria-label="ผู้ปิดงวดบัญชี"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="ผู้ปิดงวด (closed_by)"
        />
        <input
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
          aria-label="หมายเหตุการปิดงวดบัญชี"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="หมายเหตุ (optional)"
        />
        <button
          type="button"
          disabled={loading}
          onClick={onCloseAccountingPeriod}
          aria-label="ยืนยันปิดงวดบัญชีตามช่วงที่กำหนด"
          className={`rounded bg-indigo-700 px-3 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50 ${portalFocusRing}`}
        >
          ปิดงวดบัญชี
        </button>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <select
          value={periodHandoffFilter}
          onChange={(e) => setPeriodHandoffFilter(e.target.value as 'all' | 'pending' | 'sent' | 'completed')}
          aria-label="กรองสถานะการส่งผู้ตรวจสอบ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="pending">รอส่งผู้ตรวจสอบ</option>
          <option value="sent">ส่งผู้ตรวจสอบแล้ว</option>
          <option value="completed">ปิดงานผู้ตรวจสอบแล้ว</option>
        </select>
        <input
          value={auditorSentBy}
          onChange={(e) => setAuditorSentBy(e.target.value)}
          aria-label="ผู้ดำเนินการส่งผู้ตรวจสอบ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="ผู้ดำเนินการส่งผู้ตรวจสอบ"
        />
        <input
          value={auditorHandoffNote}
          onChange={(e) => setAuditorHandoffNote(e.target.value)}
          aria-label="หมายเหตุการส่งผู้ตรวจสอบ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="หมายเหตุการส่งผู้ตรวจสอบ (optional)"
        />
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <input
          value={auditorCompletedBy}
          onChange={(e) => setAuditorCompletedBy(e.target.value)}
          aria-label="ผู้ปิดงานผู้ตรวจสอบ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="ผู้ปิดงานผู้ตรวจสอบ"
        />
        <input
          value={auditorCompletedNote}
          onChange={(e) => setAuditorCompletedNote(e.target.value)}
          aria-label="หมายเหตุปิดงานผู้ตรวจสอบ"
          className={`rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm ${portalFocusRing}`}
          placeholder="หมายเหตุปิดงานผู้ตรวจสอบ (optional)"
        />
      </div>
      {periodClosings.length === 0 ? (
        <p className="mt-3 text-[11px] text-slate-500" role="status" aria-live="polite" aria-atomic="true">
          {'ยังไม่มีประวัติปิดงวดบัญชี (กด "โหลดประวัติปิดงวด")'}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-[11px] text-slate-300" aria-label="ประวัติปิดงวดบัญชีล่าสุด">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-2 py-1.5">
                  หน่วยงาน
                </th>
                <th scope="col" className="px-2 py-1.5">
                  งวด
                </th>
                <th scope="col" className="px-2 py-1.5">
                  สถานะส่งผู้ตรวจสอบ
                </th>
                <th scope="col" className="px-2 py-1.5 text-right">
                  Journal
                </th>
                <th scope="col" className="px-2 py-1.5 text-right">
                  Net Income
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ปิดโดย
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ปิดเมื่อ
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ตรวจสอบ
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ยืนยันส่ง
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ปิดงาน
                </th>
                <th scope="col" className="px-2 py-1.5">
                  ส่งผู้ตรวจสอบ
                </th>
              </tr>
            </thead>
            <tbody>
              {periodClosings.slice(0, 12).map((row) => (
                <tr key={row.id} className="border-t border-slate-800/80">
                  <td className="px-2 py-1.5">{row.legal_entity_name || row.legal_entity_code}</td>
                  <td className="px-2 py-1.5">
                    {row.period_from} ถึง {row.period_to}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded px-2 py-0.5 ${
                        row.auditor_handoff_status === 'completed'
                          ? 'bg-cyan-900/40 text-cyan-200'
                          : row.auditor_handoff_status === 'sent'
                            ? 'bg-fuchsia-900/40 text-fuchsia-200'
                            : 'bg-amber-900/40 text-amber-200'
                      }`}
                    >
                      {row.auditor_handoff_status === 'completed'
                        ? `ปิดงานแล้ว${row.auditor_completed_at ? ` · ${new Date(row.auditor_completed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`
                        : row.auditor_handoff_status === 'sent'
                          ? `ส่งแล้ว${row.auditor_sent_at ? ` · ${new Date(row.auditor_sent_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`
                          : 'รอส่ง'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">{formatThNumber(row.journal_entry_count)}</td>
                  <td className="px-2 py-1.5 text-right">{formatThNumber(Number(row.net_income ?? 0))}</td>
                  <td className="px-2 py-1.5">{row.closed_by}</td>
                  <td className="px-2 py-1.5">{new Date(row.closed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onLoadPeriodClosingDetail(row.id)}
                      aria-label={`ดูรายละเอียดงวด ${row.period_from} ถึง ${row.period_to}`}
                      className={`rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600 disabled:opacity-50 ${portalFocusRing}`}
                    >
                      Detail
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={loading || row.auditor_handoff_status !== 'pending'}
                      onClick={() => onMarkAuditorSent(row.id, `${row.period_from} ถึง ${row.period_to}`)}
                      aria-label={`ยืนยันส่งผู้ตรวจสอบงวด ${row.period_from} ถึง ${row.period_to}`}
                      className={`rounded bg-fuchsia-700 px-2 py-1 text-[10px] text-white hover:bg-fuchsia-600 disabled:opacity-50 ${portalFocusRing}`}
                    >
                      Mark sent
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={loading || row.auditor_handoff_status !== 'sent'}
                      onClick={() => onMarkAuditorCompleted(row.id, `${row.period_from} ถึง ${row.period_to}`)}
                      aria-label={`ยืนยันปิดงานผู้ตรวจสอบงวด ${row.period_from} ถึง ${row.period_to}`}
                      className={`rounded bg-cyan-700 px-2 py-1 text-[10px] text-white hover:bg-cyan-600 disabled:opacity-50 ${portalFocusRing}`}
                    >
                      Mark completed
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onDownloadAuditorPackage(row.id, `${row.period_from} ถึง ${row.period_to}`)}
                      aria-label={`ส่งออกแพ็กผู้ตรวจสอบงวด ${row.period_from} ถึง ${row.period_to}`}
                      className={`rounded bg-cyan-700 px-2 py-1 text-[10px] text-white hover:bg-cyan-600 disabled:opacity-50 ${portalFocusRing}`}
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {periodClosingDetail ? (
        <div className="mt-3 rounded border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-200" aria-label="รายละเอียดงวดบัญชีที่เลือก">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
              รายละเอียดงวด: {periodClosingDetail.periodClosing.period_from} ถึง {periodClosingDetail.periodClosing.period_to}
            </p>
            <button
              type="button"
              onClick={() => setPeriodClosingDetail(null)}
              aria-label="ปิดรายละเอียดงวดบัญชี"
              className={`rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-100 hover:bg-slate-700 ${portalFocusRing}`}
            >
              ปิดรายละเอียด
            </button>
          </div>
          <p className="mt-1 text-slate-400">
            หน่วยงาน {periodClosingDetail.periodClosing.legal_entity_name || periodClosingDetail.periodClosing.legal_entity_code} · ปิดโดย{' '}
            {periodClosingDetail.periodClosing.closed_by} · ปิดเมื่อ{' '}
            {new Date(periodClosingDetail.periodClosing.closed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
          <p className="mt-1 text-slate-400">
            สถานะส่งผู้ตรวจสอบ:{' '}
            {periodClosingDetail.periodClosing.auditor_handoff_status === 'completed'
              ? `ปิดงานแล้ว โดย ${periodClosingDetail.periodClosing.auditor_completed_by ?? '-'} เมื่อ ${
                  periodClosingDetail.periodClosing.auditor_completed_at
                    ? new Date(periodClosingDetail.periodClosing.auditor_completed_at).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '-'
                }`
              : periodClosingDetail.periodClosing.auditor_handoff_status === 'sent'
                ? `ส่งแล้ว โดย ${periodClosingDetail.periodClosing.auditor_sent_by ?? '-'} เมื่อ ${
                    periodClosingDetail.periodClosing.auditor_sent_at
                      ? new Date(periodClosingDetail.periodClosing.auditor_sent_at).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'
                  }`
                : 'รอส่ง'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded px-2 py-0.5 ${
                periodClosingDetail.integrity.isBalanced ? 'bg-fuchsia-900/40 text-fuchsia-200' : 'bg-rose-900/40 text-rose-200'
              }`}
            >
              {periodClosingDetail.integrity.isBalanced
                ? 'เดบิต/เครดิตสมดุล'
                : `เดบิต/เครดิตไม่สมดุล (${formatThNumber(periodClosingDetail.integrity.balanceDiff)})`}
            </span>
            <span
              className={`rounded px-2 py-0.5 ${
                periodClosingDetail.integrity.storedMatchesSnapshot ? 'bg-fuchsia-900/40 text-fuchsia-200' : 'bg-amber-900/40 text-amber-200'
              }`}
            >
              {periodClosingDetail.integrity.storedMatchesSnapshot ? 'ยอดรวมตรงกับ snapshot' : 'ยอดรวมไม่ตรงกับ snapshot'}
            </span>
          </div>
          <p className="mt-2 text-slate-400">
            Snapshot เดบิตรวม {formatThNumber(periodClosingDetail.integrity.snapshotTotalDebit)} · เครดิตรวม{' '}
            {formatThNumber(periodClosingDetail.integrity.snapshotTotalCredit)} · จำนวนบัญชี {formatThNumber(periodClosingDetail.trialBalanceRows.length)}
          </p>
          <div className="mt-2 overflow-x-auto rounded border border-slate-800">
            <table className="min-w-full text-left text-[10px] text-slate-300" aria-label="ตาราง snapshot trial balance ของงวดที่เลือก">
              <thead className="bg-slate-900/80 uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-2 py-1">
                    รหัส
                  </th>
                  <th scope="col" className="px-2 py-1">
                    ชื่อบัญชี
                  </th>
                  <th scope="col" className="px-2 py-1">
                    ประเภท
                  </th>
                  <th scope="col" className="px-2 py-1 text-right">
                    เดบิต
                  </th>
                  <th scope="col" className="px-2 py-1 text-right">
                    เครดิต
                  </th>
                  <th scope="col" className="px-2 py-1 text-right">
                    สุทธิ
                  </th>
                </tr>
              </thead>
              <tbody>
                {periodClosingDetail.trialBalanceRows.slice(0, 100).map((row) => (
                  <tr key={`${row.accountCode}:${row.accountName}`} className="border-t border-slate-800/80">
                    <td className="px-2 py-1">{row.accountCode}</td>
                    <td className="px-2 py-1">{row.accountName}</td>
                    <td className="px-2 py-1">{row.accountType}</td>
                    <td className="px-2 py-1 text-right">{formatThNumber(row.debit)}</td>
                    <td className="px-2 py-1 text-right">{formatThNumber(row.credit)}</td>
                    <td className="px-2 py-1 text-right">{formatThNumber(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {periodClosingDetail.trialBalanceRows.length > 100 ? (
            <p className="mt-1 text-slate-500">
              แสดง 100 บัญชีแรกจากทั้งหมด {formatThNumber(periodClosingDetail.trialBalanceRows.length)} บัญชี
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
