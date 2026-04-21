import type { Dispatch, SetStateAction } from 'react'
import { formatThNumber } from '../../lib/adminFinanceHelpers'
import type { FiscalYearRow, FixedAssetRow, TaxMonthlyRow } from '../../lib/adminFinanceTypes'
import { themeAccent } from '../../lib/themeTokens'
import { portalFocusRing } from '../../portal/portalLabels'

export type FinanceFiscalToolsPanelProps = {
  loading: boolean
  toolsEntity: 'association' | 'cram_school'
  setToolsEntity: Dispatch<SetStateAction<'association' | 'cram_school'>>
  fiscalPeriodFrom: string
  setFiscalPeriodFrom: Dispatch<SetStateAction<string>>
  fiscalPeriodTo: string
  setFiscalPeriodTo: Dispatch<SetStateAction<string>>
  fiscalLabel: string
  setFiscalLabel: Dispatch<SetStateAction<string>>
  onLoadFiscalYears: () => void
  onCreateFiscalYear: () => void
  fiscalYears: FiscalYearRow[]
  onCloseFiscalYear: (id: string, label: string) => void
  fiscalCloseSurplusCode: string
  setFiscalCloseSurplusCode: Dispatch<SetStateAction<string>>
  fiscalCloseBy: string
  setFiscalCloseBy: Dispatch<SetStateAction<string>>
  fiscalCloseNote: string
  setFiscalCloseNote: Dispatch<SetStateAction<string>>
  faCode: string
  setFaCode: Dispatch<SetStateAction<string>>
  faName: string
  setFaName: Dispatch<SetStateAction<string>>
  faPurchaseDate: string
  setFaPurchaseDate: Dispatch<SetStateAction<string>>
  faCost: string
  setFaCost: Dispatch<SetStateAction<string>>
  faResidual: string
  setFaResidual: Dispatch<SetStateAction<string>>
  faLifeMonths: string
  setFaLifeMonths: Dispatch<SetStateAction<string>>
  faDepAccCode: string
  setFaDepAccCode: Dispatch<SetStateAction<string>>
  faAccumAccCode: string
  setFaAccumAccCode: Dispatch<SetStateAction<string>>
  faNote: string
  setFaNote: Dispatch<SetStateAction<string>>
  faCreatedBy: string
  setFaCreatedBy: Dispatch<SetStateAction<string>>
  onLoadFixedAssets: () => void
  onCreateFixedAsset: () => void
  fixedAssets: FixedAssetRow[]
  depMonth: string
  setDepMonth: Dispatch<SetStateAction<string>>
  onRunFixedAssetDepreciation: () => void
  taxMonth: string
  setTaxMonth: Dispatch<SetStateAction<string>>
  onLoadTaxMonthly: () => void
  taxMonthly: { totals: { base_amount: number; vat_amount: number; wht_amount: number }; rows: TaxMonthlyRow[] } | null
  taxCalcBase: string
  setTaxCalcBase: Dispatch<SetStateAction<string>>
  taxCalcVat: string
  setTaxCalcVat: Dispatch<SetStateAction<string>>
  taxCalcWht: string
  setTaxCalcWht: Dispatch<SetStateAction<string>>
  onCalculateTaxPreview: () => void
  taxCalcResult: {
    baseAmount: number
    vatRate: number
    whtRate: number
    vatAmount: number
    whtAmount: number
    grossAmount: number
    netPayable: number
  } | null
}

export function FinanceFiscalToolsPanel({
  loading,
  toolsEntity,
  setToolsEntity,
  fiscalPeriodFrom,
  setFiscalPeriodFrom,
  fiscalPeriodTo,
  setFiscalPeriodTo,
  fiscalLabel,
  setFiscalLabel,
  onLoadFiscalYears,
  onCreateFiscalYear,
  fiscalYears,
  onCloseFiscalYear,
  fiscalCloseSurplusCode,
  setFiscalCloseSurplusCode,
  fiscalCloseBy,
  setFiscalCloseBy,
  fiscalCloseNote,
  setFiscalCloseNote,
  faCode,
  setFaCode,
  faName,
  setFaName,
  faPurchaseDate,
  setFaPurchaseDate,
  faCost,
  setFaCost,
  faResidual,
  setFaResidual,
  faLifeMonths,
  setFaLifeMonths,
  faDepAccCode,
  setFaDepAccCode,
  faAccumAccCode,
  setFaAccumAccCode,
  faNote,
  setFaNote,
  faCreatedBy,
  setFaCreatedBy,
  onLoadFixedAssets,
  onCreateFixedAsset,
  fixedAssets,
  depMonth,
  setDepMonth,
  onRunFixedAssetDepreciation,
  taxMonth,
  setTaxMonth,
  onLoadTaxMonthly,
  taxMonthly,
  taxCalcBase,
  setTaxCalcBase,
  taxCalcVat,
  setTaxCalcVat,
  taxCalcWht,
  setTaxCalcWht,
  onCalculateTaxPreview,
  taxCalcResult,
}: FinanceFiscalToolsPanelProps) {
  return (
    <div className="rounded-lg border border-fuchsia-900/40 bg-slate-950/60 p-3 text-xs text-slate-200" aria-label="เครื่องมือรอบปีบัญชี สินทรัพย์ถาวร และภาษี">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-fuchsia-200">รอบปีบัญชี · สินทรัพย์ถาวร · ภาษี (เครื่องมือ)</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-slate-400">หน่วยงาน</label>
          <select
            value={toolsEntity}
            onChange={(e) => setToolsEntity(e.target.value as 'association' | 'cram_school')}
            className={`rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] ${portalFocusRing}`}
          >
            <option value="association">สมาคม</option>
            <option value="cram_school">กวดวิชา</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-2 font-medium text-slate-100">รอบปีบัญชี (fiscal years)</p>
          <div className="grid gap-1.5">
            <input
              type="date"
              value={fiscalPeriodFrom}
              onChange={(e) => setFiscalPeriodFrom(e.target.value)}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="date"
              value={fiscalPeriodTo}
              onChange={(e) => setFiscalPeriodTo(e.target.value)}
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={fiscalLabel}
              onChange={(e) => setFiscalLabel(e.target.value)}
              placeholder="ชื่อรอบ (ถ้าว่างระบบตั้งให้)"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={loading}
                onClick={onLoadFiscalYears}
                className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
              >
                โหลดรายการ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onCreateFiscalYear}
                className={`tap-target rounded px-2 py-1 text-[11px] text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
              >
                สร้างรอบใหม่
              </button>
            </div>
            <p className="text-[10px] text-slate-500">ปิดปี: รหัสบัญชีกองทุนสะสม (equity)</p>
            <input
              type="text"
              value={fiscalCloseSurplusCode}
              onChange={(e) => setFiscalCloseSurplusCode(e.target.value)}
              placeholder="3110"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={fiscalCloseBy}
              onChange={(e) => setFiscalCloseBy(e.target.value)}
              placeholder="ผู้ปิดปี"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={fiscalCloseNote}
              onChange={(e) => setFiscalCloseNote(e.target.value)}
              placeholder="หมายเหตุปิดปี"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-800">
            {fiscalYears.length === 0 ? (
              <p className="p-2 text-[11px] text-slate-500">ยังไม่มีข้อมูล (กดโหลด)</p>
            ) : (
              <ul className="divide-y divide-slate-800 text-[11px]">
                {fiscalYears.map((fy) => (
                  <li key={fy.id} className="flex flex-wrap items-center justify-between gap-1 px-2 py-1">
                    <span>
                      {fy.fiscal_label} · {fy.period_from} → {fy.period_to}
                      {fy.is_closed ? <span className="ml-1 text-emerald-400">(ปิดแล้ว)</span> : null}
                    </span>
                    {!fy.is_closed ? (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => onCloseFiscalYear(fy.id, fy.fiscal_label)}
                        className={`shrink-0 rounded bg-amber-800 px-1.5 py-0.5 text-[10px] text-white hover:bg-amber-700 disabled:opacity-50 ${portalFocusRing}`}
                      >
                        ปิดปี
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-2 font-medium text-slate-100">สินทรัพย์ถาวร</p>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={faCode}
              onChange={(e) => setFaCode(e.target.value)}
              placeholder="รหัสสินทรัพย์"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={faName}
              onChange={(e) => setFaName(e.target.value)}
              placeholder="ชื่อ"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="date"
              value={faPurchaseDate}
              onChange={(e) => setFaPurchaseDate(e.target.value)}
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={faCost}
              onChange={(e) => setFaCost(e.target.value)}
              placeholder="ต้นทุน"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={faResidual}
              onChange={(e) => setFaResidual(e.target.value)}
              placeholder="ค่าซาก"
              className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              inputMode="numeric"
              value={faLifeMonths}
              onChange={(e) => setFaLifeMonths(e.target.value)}
              placeholder="อายุ (เดือน)"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={faDepAccCode}
              onChange={(e) => setFaDepAccCode(e.target.value)}
              placeholder="รหัสบัญชีค่าเสื่อม (expense)"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={faAccumAccCode}
              onChange={(e) => setFaAccumAccCode(e.target.value)}
              placeholder="รหัสค่าเสื่อมสะสม (asset)"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={faNote}
              onChange={(e) => setFaNote(e.target.value)}
              placeholder="หมายเหตุ"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
            <input
              type="text"
              value={faCreatedBy}
              onChange={(e) => setFaCreatedBy(e.target.value)}
              placeholder="ผู้บันทึก / ผู้โพสต์ค่าเสื่อม"
              className={`col-span-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={loading}
              onClick={onLoadFixedAssets}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
            >
              โหลดทะเบียน
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onCreateFixedAsset}
              className={`tap-target rounded px-2 py-1 text-[11px] text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
            >
              บันทึกสินทรัพย์
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-1 border-t border-slate-800 pt-2">
            <label className="text-[10px] text-slate-500">รันค่าเสื่อมเดือน</label>
            <input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)} className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`} />
            <button
              type="button"
              disabled={loading}
              onClick={onRunFixedAssetDepreciation}
              className={`rounded bg-amber-800 px-2 py-1 text-[11px] text-white hover:bg-amber-700 disabled:opacity-50 ${portalFocusRing}`}
            >
              รันค่าเสื่อม
            </button>
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto text-[10px] text-slate-400">
            {fixedAssets.slice(0, 8).map((a) => (
              <div key={a.id} className="border-t border-slate-800/80 py-0.5">
                {a.asset_code} · {a.asset_name} · {formatThNumber(Number(a.cost ?? 0))} · {a.active ? 'active' : 'inactive'}
              </div>
            ))}
            {fixedAssets.length > 8 ? <p className="py-1 text-slate-500">+ อีก {fixedAssets.length - 8} รายการ</p> : null}
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
          <p className="mb-2 font-medium text-slate-100">ภาษีรายเดือน · คำนวณ</p>
          <div className="flex flex-wrap items-end gap-1.5">
            <input type="month" value={taxMonth} onChange={(e) => setTaxMonth(e.target.value)} className={`rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`} />
            <button
              type="button"
              disabled={loading}
              onClick={onLoadTaxMonthly}
              className={`rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-600 disabled:opacity-50 ${portalFocusRing}`}
            >
              โหลดคำขอจ่ายในเดือน
            </button>
          </div>
          {taxMonthly ? (
            <p className="mt-1 text-[10px] text-slate-400">
              ฐาน {formatThNumber(taxMonthly.totals.base_amount)} · VAT {formatThNumber(taxMonthly.totals.vat_amount)} · WHT {formatThNumber(taxMonthly.totals.wht_amount)} · {taxMonthly.rows.length}{' '}
              รายการ
            </p>
          ) : null}
          <div className="mt-2 border-t border-slate-800 pt-2">
            <p className="mb-1 text-[10px] text-slate-500">คำนวณ VAT/WHT (ฐานก่อน VAT)</p>
            <div className="flex flex-wrap gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={taxCalcBase}
                onChange={(e) => setTaxCalcBase(e.target.value)}
                placeholder="ยอดฐาน"
                className={`w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 ${portalFocusRing}`}
              />
              <select value={taxCalcVat} onChange={(e) => setTaxCalcVat(e.target.value)} className={`rounded border border-slate-700 bg-slate-950 px-1 py-1 ${portalFocusRing}`}>
                <option value="0">VAT 0%</option>
                <option value="0.07">VAT 7%</option>
              </select>
              <select value={taxCalcWht} onChange={(e) => setTaxCalcWht(e.target.value)} className={`rounded border border-slate-700 bg-slate-950 px-1 py-1 ${portalFocusRing}`}>
                <option value="0">WHT 0%</option>
                <option value="0.01">WHT 1%</option>
                <option value="0.03">WHT 3%</option>
                <option value="0.05">WHT 5%</option>
              </select>
              <button
                type="button"
                disabled={loading}
                onClick={onCalculateTaxPreview}
                className={`tap-target rounded px-2 py-1 text-[11px] text-white disabled:opacity-50 ${themeAccent.buttonPrimary} ${portalFocusRing}`}
              >
                คำนวณ
              </button>
            </div>
            {taxCalcResult ? (
              <p className="mt-1 text-[10px] text-slate-300">
                รวมก่อนหัก WHT {formatThNumber(taxCalcResult.grossAmount)} · จ่ายสุทธิ {formatThNumber(taxCalcResult.netPayable)} (VAT {formatThNumber(taxCalcResult.vatAmount)} / WHT{' '}
                {formatThNumber(taxCalcResult.whtAmount)})
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
