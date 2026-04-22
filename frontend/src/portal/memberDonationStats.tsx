import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { portalFocusRing } from './portalLabels'
import type { YupparajDonationActivityItem } from './dataAdapter'

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
    /** จาก API — ใช้จัดกลุ่มตามกิจกรรม */
    activityId: string | null
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
      activityId: 'mock-yup-scholarship-2569',
      title: 'กิจกรรมทุนการศึกษาประจำปี 2569',
      category: '',
      targetAmount: 500_000,
      raisedAmount: 120_000,
      donationCount: 7,
      progressPercent: 24,
    },
    {
      activityId: 'mock-yup-lunch-2569',
      title: 'กิจกรรมทุนอาหารกลางวันประจำปี 2569',
      category: '',
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
      activityId: 'mock-yup-scholarship-2569',
      donorName: 'ตัวอย่าง หนึ่ง',
      batch: '45',
      batchName: 'รุ่นตัวอย่าง',
      amount: 10_000,
      activityTitle: 'กิจกรรมทุนการศึกษาประจำปี 2569',
      activityCategory: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'd2',
      activityId: 'mock-yup-lunch-2569',
      donorName: 'ตัวอย่าง สอง',
      batch: '52',
      batchName: null,
      amount: 5_000,
      activityTitle: 'กิจกรรมทุนอาหารกลางวันประจำปี 2569',
      activityCategory: null,
      createdAt: new Date().toISOString(),
    },
  ],
}

function BatchAmountRow(props: { label: string; sub?: string; value: number; donationCount: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <div className="min-w-0">
          <span className="font-medium text-slate-200">{props.label}</span>
          {props.sub ? <p className="truncate text-[10px] text-slate-500">{props.sub}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums text-fuchsia-200/95">{Math.round(props.value).toLocaleString('th-TH')} ฿</p>
          <p className="text-[10px] text-slate-500">{props.donationCount.toLocaleString('th-TH')} รายการโอน</p>
        </div>
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
      {props.category.trim() ? <p className="text-[11px] text-slate-500">{props.category}</p> : null}
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

type DonorRow = YupparajPublicStats['donors'][number]

type ActivityDonorGroup = {
  activityId: string
  title: string
  category: string
  raisedAmount: number
  donationCount: number
  donors: DonorRow[]
}

function sumDonorAmounts(rows: DonorRow[]) {
  return Math.round(rows.reduce((s, d) => s + d.amount, 0) * 100) / 100
}

function sortDonorsByDateDesc(rows: DonorRow[]) {
  return [...rows].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
}

/**
 * จัดกลุ่มผู้บริจาค — ถ้ามี `linkedActivities` (จากสแนปช็อตพอร์ทัล = รายการที่ Admin เปิดใน school_activities)
 * จะใช้ลำดับและชื่อโครงการให้ตรงกับหน้าสนับสนุน/แดชบอร์ด แล้วผูกยอดจาก API yupparaj-stats
 */
function buildActivityDonorGroups(
  stats: YupparajPublicStats,
  linkedActivities?: YupparajDonationActivityItem[] | null,
): ActivityDonorGroup[] {
  const donorsByKey = new Map<string, DonorRow[]>()
  for (const d of stats.donors) {
    const rawId = d.activityId != null && String(d.activityId).trim() ? String(d.activityId).trim() : ''
    const key = rawId || '_none_'
    const arr = donorsByKey.get(key) ?? []
    arr.push(d)
    donorsByKey.set(key, arr)
  }

  const fromStatsById = new Map(stats.byActivity.map((a) => [a.activityId, a]))
  const useLinked = linkedActivities != null && linkedActivities.length > 0

  if (useLinked) {
    const linkedIds = new Set(linkedActivities.map((a) => a.id))
    const groups: ActivityDonorGroup[] = []
    for (const act of linkedActivities) {
      const id = act.id
      const st = fromStatsById.get(id)
      const raw = donorsByKey.get(id) ?? []
      groups.push({
        activityId: id,
        title: act.title,
        category: act.category,
        raisedAmount: st?.raisedAmount ?? act.raisedAmount ?? 0,
        donationCount: st?.donationCount ?? raw.length,
        donors: sortDonorsByDateDesc(raw),
      })
    }
    for (const [key, raw] of donorsByKey) {
      if (key === '_none_') {
        if (raw.length === 0) continue
        groups.push({
          activityId: '_none_',
          title: 'ไม่ระบุโครงการ',
          category: '—',
          raisedAmount: sumDonorAmounts(raw),
          donationCount: raw.length,
          donors: sortDonorsByDateDesc(raw),
        })
        continue
      }
      if (linkedIds.has(key)) continue
      const first = raw[0]
      groups.push({
        activityId: key,
        title: first?.activityTitle ?? '—',
        category: first?.activityCategory && String(first.activityCategory).trim() ? String(first.activityCategory).trim() : '—',
        raisedAmount: sumDonorAmounts(raw),
        donationCount: raw.length,
        donors: sortDonorsByDateDesc(raw),
      })
    }
    return groups
  }

  const activeIdSet = new Set(stats.byActivity.map((a) => a.activityId))
  const groups: ActivityDonorGroup[] = []

  for (const a of stats.byActivity) {
    const raw = donorsByKey.get(a.activityId) ?? []
    groups.push({
      activityId: a.activityId,
      title: a.title,
      category: a.category,
      raisedAmount: a.raisedAmount,
      donationCount: a.donationCount,
      donors: sortDonorsByDateDesc(raw),
    })
  }

  for (const [key, raw] of donorsByKey) {
    if (key === '_none_') {
      if (raw.length === 0) continue
      groups.push({
        activityId: '_none_',
        title: 'ไม่ระบุโครงการ',
        category: '—',
        raisedAmount: sumDonorAmounts(raw),
        donationCount: raw.length,
        donors: sortDonorsByDateDesc(raw),
      })
      continue
    }
    if (activeIdSet.has(key)) continue
    const first = raw[0]
    groups.push({
      activityId: key,
      title: first?.activityTitle ?? '—',
      category: first?.activityCategory && String(first.activityCategory).trim() ? String(first.activityCategory).trim() : '—',
      raisedAmount: sumDonorAmounts(raw),
      donationCount: raw.length,
      donors: sortDonorsByDateDesc(raw),
    })
  }

  return groups
}

type MergedActivityCard = {
  activityId: string
  title: string
  category: string
  raised: number
  target: number | null
  count: number
  progressPercent: number | null
}

function mergeActivityCards(
  stats: YupparajPublicStats,
  linkedActivities?: YupparajDonationActivityItem[] | null,
): MergedActivityCard[] {
  if (linkedActivities != null && linkedActivities.length > 0) {
    const byId = new Map(stats.byActivity.map((a) => [a.activityId, a]))
    return linkedActivities.map((act) => {
      const st = byId.get(act.id)
      const raised = st?.raisedAmount ?? act.raisedAmount ?? 0
      const tgtRaw = st?.targetAmount != null ? st.targetAmount : act.targetAmount
      const target = tgtRaw != null && Number.isFinite(tgtRaw) && tgtRaw >= 0 ? tgtRaw : null
      const count = st?.donationCount ?? 0
      const progressPercent =
        st?.progressPercent != null
          ? st.progressPercent
          : target != null && target > 0 && Number.isFinite(raised)
            ? Math.min(100, Math.round((raised / target) * 100))
            : null
      return {
        activityId: act.id,
        title: act.title,
        category: act.category,
        raised,
        target,
        count,
        progressPercent,
      }
    })
  }
  return stats.byActivity.map((a) => ({
    activityId: a.activityId,
    title: a.title,
    category: a.category,
    raised: a.raisedAmount,
    target: a.targetAmount,
    count: a.donationCount,
    progressPercent: a.progressPercent,
  }))
}

function normalizeDonorRows(raw: unknown[]): DonorRow[] {
  const out: DonorRow[] = []
  for (const row of raw) {
    const d = row as Record<string, unknown>
    const id = d.id != null ? String(d.id) : ''
    if (!id) continue
    const aidRaw = d.activityId ?? d.activity_id
    const activityId =
      typeof aidRaw === 'string' && aidRaw.trim()
        ? aidRaw.trim()
        : typeof aidRaw === 'number' && Number.isFinite(aidRaw)
          ? String(aidRaw)
          : null
    const amount = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount ?? 0))
    if (!Number.isFinite(amount)) continue
    out.push({
      id,
      activityId,
      donorName: typeof d.donorName === 'string' ? d.donorName : '—',
      batch: d.batch != null && String(d.batch).trim() ? String(d.batch).trim() : null,
      batchName: d.batchName != null && String(d.batchName).trim() ? String(d.batchName).trim() : null,
      amount: Math.round(amount * 100) / 100,
      activityTitle: typeof d.activityTitle === 'string' ? d.activityTitle : '—',
      activityCategory: d.activityCategory != null && String(d.activityCategory).trim() ? String(d.activityCategory).trim() : null,
      createdAt: d.createdAt != null && String(d.createdAt).trim() ? String(d.createdAt) : null,
    })
  }
  return out
}

function downloadFilenameForActivity(activityId: string) {
  const safe = activityId.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 64) || 'activity'
  return `yupparaj-donors-${safe}.png`
}

function ActivityDonorSection(props: { group: ActivityDonorGroup; generatedAt?: string }) {
  const { group, generatedAt } = props
  const capRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [imgErr, setImgErr] = useState<string | null>(null)

  const downloadPng = async () => {
    setImgErr(null)
    const node = capRef.current
    if (!node || group.donors.length === 0) return
    setBusy(true)
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0f172a',
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = downloadFilenameForActivity(group.activityId)
      a.rel = 'noopener'
      a.click()
    } catch {
      setImgErr('สร้างภาพไม่สำเร็จ — ลองอีกครั้งหรืออัปเดตเบราว์เซอร์')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-slate-800/80 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-slate-200">{group.title}</h4>
          {group.category.trim() && group.category !== '—' ? (
            <p className="text-xs text-slate-500">{group.category}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-400">
            ยอดสะสมในระบบ {Math.round(group.raisedAmount).toLocaleString('th-TH')} บาท · {group.donationCount.toLocaleString('th-TH')}{' '}
            รายการโอน (รวมทุกรายการในโครงการ)
          </p>
        </div>
        {group.donors.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadPng()}
            className={`shrink-0 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 ${portalFocusRing}`}
            aria-label={`บันทึกรายชื่อผู้บริจาคเป็นไฟล์ภาพ — ${group.title}`}
          >
            {busy ? 'กำลังสร้างภาพ…' : 'บันทึกเป็นภาพ (LINE)'}
          </button>
        ) : null}
      </div>
      {imgErr ? (
        <p className="mt-2 text-xs text-amber-200/90" role="alert">
          {imgErr}
        </p>
      ) : null}

      {group.donors.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">ยังไม่มีผู้บริจาคในโครงการนี้</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg">
          <div ref={capRef} className="min-w-[18rem] rounded-lg border border-slate-700 bg-[#0f172a] p-4 text-left">
            <p className="text-base font-semibold leading-snug text-white">{group.title}</p>
            {group.category.trim() && group.category !== '—' ? (
              <p className="text-sm text-slate-400">{group.category}</p>
            ) : null}
            <p className="mt-2 text-sm text-fuchsia-200">
              ยอดสะสม {Math.round(group.raisedAmount).toLocaleString('th-TH')} บาท · {group.donors.length.toLocaleString('th-TH')} รายการในภาพนี้
            </p>
            <table className="mt-4 w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-600 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-medium">วันที่บันทึก</th>
                  <th className="py-2 pr-3 font-medium">ผู้บริจาค</th>
                  <th className="py-2 pr-3 font-medium">รุ่น</th>
                  <th className="py-2 pl-2 text-right font-medium">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {group.donors.map((d) => (
                  <tr key={d.id} className="border-b border-slate-700/90">
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-400">{formatThShort(d.createdAt)}</td>
                    <td className="py-2 pr-3">{d.donorName}</td>
                    <td className="py-2 pr-3 text-slate-300">
                      {d.batch ?? '—'}
                      {d.batchName ? <span className="block text-[11px] text-slate-500">{d.batchName}</span> : null}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-fuchsia-200">
                      {Math.round(d.amount).toLocaleString('th-TH')} ฿
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              โรงเรียนยุพราชวิทยาลัย · กิจกรรมโรงเรียน (กองแยกจากนิติบุคคลสมาคม)
              {generatedAt ? ` · อัปเดต ${formatThShort(generatedAt)}` : null}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function MemberYupparajPublicStats(props: {
  apiBase: string
  /** เพิ่มเมื่อบันทึกบริจาคสำเร็จหรือกดรีเฟรช */
  refreshTrigger: number
  mockMode: boolean
  /** ซ่อนหัวข้อ «สถิติการบริจาค (กองโรงเรียนยุพราช)» — ใช้บนแดชบอร์ดที่มีหัวข้อภายนอกแล้ว */
  embedded?: boolean
  /**
   * รายการกิจกรรมจากสแนปช็อตพอร์ทัล (เดียวกับที่ Admin เปิดใน school_activities + หน้าสนับสนุน)
   * ถ้าส่งมา การ์ดและกลุ่มรายชื่อผู้บริจาคจะใช้ลำดับ/ชื่อจากที่นี่ และผูกยอดจาก API yupparaj-stats
   */
  linkedActivities?: YupparajDonationActivityItem[] | null
}) {
  const embedded = Boolean(props.embedded)
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
        donors: Array.isArray(j.donors) ? normalizeDonorRows(j.donors) : [],
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

  const donorGroups = useMemo(
    () => (stats ? buildActivityDonorGroups(stats, props.linkedActivities) : []),
    [stats, props.linkedActivities],
  )

  const activityCards = useMemo(
    () => (stats ? mergeActivityCards(stats, props.linkedActivities) : []),
    [stats, props.linkedActivities],
  )

  if (loading && !stats) {
    return (
      <div
        className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400"
        aria-busy="true"
      >
        {embedded ? 'กำลังโหลดสถิติ…' : 'กำลังโหลดสถิติการบริจาค…'}
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
      aria-label={embedded ? undefined : 'สถิติการบริจาคกองโรงเรียนยุพราช'}
    >
      {embedded ? null : (
        <>
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
        </>
      )}

      {embedded && props.mockMode ? (
        <p className="text-xs text-slate-500">ตัวอย่าง — พอร์ทัลโหมดจำลอง (ไม่มี API)</p>
      ) : null}

      <div className={`grid gap-4 sm:grid-cols-2 ${embedded ? (props.mockMode ? 'mt-3' : '') : 'mt-5'}`}>
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

      {activityCards.length > 0 ? (
        <div className="mt-8">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายละเอียดกิจกรรม</h4>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {activityCards.map((a) => (
              <ActivityStatCard
                key={a.activityId}
                title={a.title}
                category={a.category}
                raised={a.raised}
                target={a.target}
                count={a.count}
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
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">สถิติแยกตามรุ่น</h4>
          <div className="mt-4 space-y-2">
            {stats.byBatch.map((b) => (
              <BatchAmountRow
                key={`${b.batch}-${b.batchName ?? ''}`}
                label={`รุ่น ${b.batch}`}
                sub={b.batchName ? b.batchName : undefined}
                value={b.totalAmount}
                donationCount={b.donationCount}
              />
            ))}
          </div>
        </div>
      ) : null}

      {stats.donors.length > 0 ? (
        <div className="mt-8">
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">รายชื่อผู้บริจาคตามโครงการ</h4>
          <div className="mt-4 space-y-0">
            {donorGroups.map((g) => (
              <ActivityDonorSection key={g.activityId} group={g} generatedAt={stats.generatedAt} />
            ))}
          </div>
          {stats.donors.length >= 5000 ? (
            <p className="mt-4 text-xs text-amber-200/80">แสดงสูงสุด 5,000 รายการโอนล่าสุดทั้งกอง — แบ่งตามโครงการด้านบน</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">ยังไม่มีรายการบริจาคที่บันทึกในกองนี้</p>
      )}
    </section>
  )
}
