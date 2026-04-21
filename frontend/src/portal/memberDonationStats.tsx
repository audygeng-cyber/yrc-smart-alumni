import { useCallback, useEffect, useMemo, useState } from 'react'
import { portalFocusRing } from './portalLabels'

export type YupparajPublicStats = {
  ok?: boolean
  generatedAt?: string
  totalAmount: number
  donationCount: number
  byActivity: Array<{
    activityId: string
    title: string
    category: string
    targetAmount: number | null
    raisedAmount: number
    donationCount: number
    progressPercent: number | null
  }>
  byBatch: Array<{
    batch: string
    batchName: string | null
    totalAmount: number
    donationCount: number
  }>
  donors: Array<{
    id: string
    donorName: string
    batch: string | null
    batchName: string | null
    amount: number
    activityTitle: string
    activityCategory: string | null
    createdAt: string | null
  }>
}

function formatThShort(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim()) return '—'
  const d = new Date(String(iso))
  return Number.isFinite(d.getTime()) ? d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

const MOCK_STATS: YupparajPublicStats = {
  totalAmount: 185_500,
  donationCount: 12,
  byActivity: [
    {
      activityId: 'mock-1',
      title: 'กิจกรรมทุนการศึกษาประจำปี 2569',
      category: 'ทุนการศึกษา',
      targetAmount: 500_000,
      raisedAmount: 120_000,
      donationCount: 7,
      progressPercent: 24,
    },
    {
      activityId: 'mock-2',
      title: 'กิจกรรมทุนอาหารกลางวันประจำปี 2569',
      category: 'ทุนอาหารกลางวัน',
      targetAmount: 300_000,
      raisedAmount: 65_500,
      donationCount: 5,
      progressPercent: 22,
    },
  ],
  byBatch: [
    { batch: '45', batchName: 'รุ่นตัวอย่าง', totalAmount: 52_000, donationCount: 3 },
    { batch: '52', batchName: null, totalAmount: 41_500, donationCount: 4 },
    { batch: '—', batchName: null, totalAmount: 30_000, donationCount: 2 },
  ],
  donors: [
    {
      id: 'd1',
      donorName: 'ตัวอย่าง หนึ่ง',
      batch: '45',
      batchName: 'รุ่นตัวอย่าง',
      amount: 10_000,
      activityTitle: 'กิจกรรมทุนการศึกษาประจำปี 2569',
      activityCategory: 'ทุนการศึกษา',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd2',
      donorName: 'ตัวอย่าง สอง',
      batch: '52',
      batchName: null,
      amount: 5_000,
      activityTitle: 'กิจกรรมทุนอาหารกลางวันประจำปี 2569',
      activityCategory: 'ทุนอาหารกลางวัน',
      createdAt: new Date().toISOString(),
    },
  ],
}

function BarRow(props: { label: string; sub?: string; value: number; max: number }) {
  const pct = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0
  const bg = 'bg-gradient-to-r from-sky-600/90 to-sky-400/80'
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-1 text-xs">
        <span className="truncate font-medium text-slate-200">{props.label}</span>
        <span className="shrink-0 tabular-nums text-fuchsia-200/95">
          {Math.round(props.value).toLocaleString('th-TH')} ฿
        </span>
      </div>
      {props.sub ? <p className="truncate text-[10px] text-slate-500">{props.sub}</p> : null}
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-800/90" role="presentation">
        <div className={`h-full rounded-full transition-[width] duration-500 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ActivityStatCard(props: {
  title: string
  category: string
  raised: number
  target: number | null
  count: number
  progressPercent: number | null
}) {
  const pct = props.progressPercent != null ? props.progressPercent : 0
  return (
    <div className="rounded-xl border border-fuchsia-900/35 bg-gradient-to-br from-slate-950/80 to-fuchsia-950/20 p-4 shadow-sm shadow-fuchsia-950/20">
      <p className="text-sm font-medium text-slate-100">{props.title}</p>
      <p className="text-[11px] text-slate-500">{props.category}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">ยอดสะสม</p>
          <p className="text-lg font-semibold tabular-nums text-fuchsia-200">{Math.round(props.raised).toLocaleString('th-TH')} ฿</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">เป้าหมาย</p>
          <p className="text-sm tabular-nums text-slate-300">
            {props.target != null ? `${Math.round(props.target).toLocaleString('th-TH')} ฿` : '—'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-slate-500">
          <span>ความคืบหน้า</span>
          <span>{props.target != null ? `${pct}%` : '—'}</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-fuchsia-500/20"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={props.target != null ? pct : 0}
          aria-label={`ความคืบหน้า ${props.title}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 via-fuchsia-500 to-pink-400"
            style={{ width: `${props.target != null ? pct : 0}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{props.count} รายการโอน</p>
    </div>
  )
}

export function MemberYupparajPublicStats(props: {
  apiBase: string
  /** เพิ่มเมื่อบันทึกบริจาคสำเร็จหรือกดรีเฟรช */
  refreshTrigger: number
  mockMode: boolean
}) {
  const [loading, setLoading] = useState(!props.mockMode)
  const [err, setErr] = useState<string | null>(null)
  const [stats, setStats] = useState<YupparajPublicStats | null>(props.mockMode ? MOCK_STATS : null)

  const load = useCallback(async () => {
    if (props.mockMode) {
      setStats(MOCK_STATS)
      setLoading(false)
      setErr(null)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch(`${props.apiBase.replace(/\/$/, '')}/api/members/donations/yupparaj-stats`)
      const j = (await r.json().catch(() => ({}))) as YupparajPublicStats & { error?: string }
      if (!r.ok) {
        setErr(j.error ?? `ไม่สำเร็จ (HTTP ${r.status})`)
        setStats(null)
        return
      }
      setStats({
        totalAmount: j.totalAmount ?? 0,
        donationCount: j.donationCount ?? 0,
        byActivity: Array.isArray(j.byActivity) ? j.byActivity : [],
        byBatch: Array.isArray(j.byBatch) ? j.byBatch : [],
        donors: Array.isArray(j.donors) ? j.donors : [],
        generatedAt: j.generatedAt,
      })
    } catch {
      setErr('เรียกเซิร์ฟเวอร์ไม่สำเร็จ')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [props.apiBase, props.mockMode])

  useEffect(() => {
    void load()
  }, [load, props.refreshTrigger])

  const maxBatch = useMemo(() => {
    const rows = stats?.byBatch ?? []
    let m = 0
    for (const b of rows) m = Math.max(m, b.totalAmount)
    return m > 0 ? m : 1
  }, [stats?.byBatch])

  if (loading && !stats) {
    return (
      <div
        className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400"
        aria-busy="true"
      >
        กำลังโหลดสถิติการบริจาค…
      </div>
    )
  }

  if (err && !stats) {
    return (
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200" role="alert">
        {err}
        <button
          type="button"
          onClick={() => void load()}
          className={`ml-3 rounded border border-amber-700 px-2 py-0.5 text-xs text-amber-100 ${portalFocusRing}`}
        >
          ลองอีกครั้ง
        </button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <section
      className="rounded-xl border border-slate-800 bg-slate-950/40 p-5"
      aria-label="สถิติการบริจาคกองโรงเรียนยุพราช"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถิติการบริจาค (กองโรงเรียนยุพราช)</h3>
          <p className="mt-1 text-xs text-slate-500">
            ข้อมูลจากฐานข้อมูลแบบเรียลไทม์ — ยอดรวมทุกโครงการในกองนี้
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={`tap-target rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 ${portalFocusRing}`}
        >
          {loading ? 'กำลังรีเฟรช…' : 'รีเฟรชสถิติ'}
        </button>
      </div>

      {props.mockMode ? (
        <p className="mt-2 text-xs text-slate-500">ตัวอย่าง — พอร์ทัลโหมดจำลอง (ไม่มี API)</p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-fuchsia-900/30 bg-fuchsia-950/15 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-fuchsia-300/90">ยอดบริจาครวมทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-fuchsia-100">
            {Math.round(stats.totalAmount).toLocaleString('th-TH')} <span className="text-base font-normal text-fuchsia-300/80">บาท</span>
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">จำนวนรายการโอน</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{stats.donationCount.toLocaleString('th-TH')}</p>
        </div>
      </div>

      {stats.byActivity.length > 0 ? (
        <div className="mt-8">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">แต่ละโครงการ</h4>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {stats.byActivity.map((a) => (
              <ActivityStatCard
                key={a.activityId}
                title={a.title}
                category={a.category}
                raised={a.raisedAmount}
                target={a.targetAmount}
                count={a.donationCount}
                progressPercent={a.progressPercent}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">ยังไม่มีโครงการกองยุพราชที่เปิดใช้งานในฐานข้อมูล</p>
      )}

      {stats.byBatch.length > 0 ? (
        <div className="mt-8">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">สัดส่วนตามรุ่น (ยอดรวม)</h4>
          <p className="mt-1 text-[11px] text-slate-500">เปรียบเทียบยอดระหว่างรุ่น — แถบยาวตามสัดส่วนยอดสูงสุดในหน้านี้</p>
          <div className="mt-4 space-y-4">
            {stats.byBatch.map((b) => (
              <BarRow
                key={`${b.batch}-${b.batchName ?? ''}`}
                label={`รุ่น ${b.batch}`}
                sub={b.batchName ? b.batchName : undefined}
                value={b.totalAmount}
                max={maxBatch}
              />
            ))}
          </div>
        </div>
      ) : null}

      {stats.donors.length > 0 ? (
        <div className="mt-8">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายชื่อผู้บริจาคทั้งหมด</h4>
          <div className="mt-2 max-h-[28rem] overflow-auto rounded-lg border border-slate-800/80">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm">
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">วันที่บันทึก</th>
                  <th className="px-3 py-2 font-medium">ผู้บริจาค</th>
                  <th className="px-3 py-2 font-medium">รุ่น</th>
                  <th className="px-3 py-2 font-medium">โครงการ</th>
                  <th className="px-3 py-2 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {stats.donors.map((d) => (
                  <tr key={d.id} className="border-b border-slate-800/70">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">{formatThShort(d.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-200">{d.donorName}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {d.batch ?? '—'}
                      {d.batchName ? <span className="block text-[11px] text-slate-500">{d.batchName}</span> : null}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 text-slate-300">
                      <span className="line-clamp-2">{d.activityTitle}</span>
                      {d.activityCategory ? (
                        <span className="block text-[11px] text-slate-500">{d.activityCategory}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-fuchsia-200/95">
                      {Math.round(d.amount).toLocaleString('th-TH')} ฿
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.donors.length >= 5000 ? (
            <p className="mt-2 text-xs text-amber-200/80">แสดงสูงสุด 5,000 รายการล่าสุด</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">ยังไม่มีรายการบริจาคที่บันทึกในกองนี้</p>
      )}
    </section>
  )
}
