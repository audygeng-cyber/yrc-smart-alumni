import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { normalizeApiBase } from '../lib/adminApi'
import { formatFetchError, readApiJson } from '../lib/adminHttp'
import { portalFocusRing } from '../portal/portalLabels'

type ActiveEvent = {
  id: string
  slug: string
  title_th: string
  claim_starts_at: string | null
  claim_ends_at: string | null
}

type Props = { apiBase: string }

/**
 * หน้าเปิดจาก QR บัตรสมาชิก — ไม่ต้องล็อกอิน
 * Query: `t` = member_identity_qr_token, `event` = slug งาน (เลือกล่วงหน้าได้)
 */
export function OpenMemberIdentityPage(props: Props) {
  const base = normalizeApiBase(props.apiBase)
  const [params] = useSearchParams()
  const token = useMemo(() => (params.get('t') ?? '').trim(), [params])
  const preSlug = useMemo(() => (params.get('event') ?? '').trim().toLowerCase(), [params])

  const [events, setEvents] = useState<ActiveEvent[]>([])
  const [eventsMsg, setEventsMsg] = useState<string | null>(null)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [claimOk, setClaimOk] = useState<string | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    setEventsMsg(null)
    try {
      const r = await fetch(`${base}/api/public/election/events/active`)
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok && payload && typeof payload === 'object' && 'events' in payload) {
        const list = (payload as { events: ActiveEvent[] }).events ?? []
        setEvents(list)
        const match = list.find((e) => e.slug === preSlug)
        if (match) setSelectedSlug(match.slug)
        else if (list.length === 1) setSelectedSlug(list[0].slug)
      } else {
        setEventsMsg(formatFetchError('โหลดรายการงาน', r.status, payload, rawText))
      }
    } catch {
      setEventsMsg('เรียก API ไม่สำเร็จ — ตรวจ VITE_API_URL และ CORS')
    } finally {
      setEventsLoading(false)
    }
  }, [base, preSlug])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  async function submitClaim() {
    if (!token) return
    if (!selectedSlug) {
      setClaimMsg('เลือกงานที่รับบัตร')
      return
    }
    setClaimLoading(true)
    setClaimMsg(null)
    setClaimOk(null)
    try {
      const r = await fetch(`${base}/api/public/election/card-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, election_event_slug: selectedSlug }),
      })
      const { payload, rawText, ok } = await readApiJson(r)
      if (ok && payload && typeof payload === 'object' && 'claimed_at' in payload) {
        const title = (payload as { election_event_title_th?: string }).election_event_title_th ?? selectedSlug
        setClaimOk(`บันทึกการรับบัตรแล้ว — ${title}`)
      } else {
        setClaimMsg(formatFetchError('บันทึกการรับบัตร', r.status, payload, rawText))
      }
    } catch {
      setClaimMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setClaimLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-white">รับบัตร / ยืนยันตัวตนจาก QR</h1>
        {!token ? (
          <p className="mt-3 text-sm text-amber-200/90">
            ไม่พบพารามิเตอร์ <code className="rounded bg-slate-800 px-1 text-xs">t</code> ในลิงก์ — ลองสแกน QR
            บนบัตรสมาชิกอีกครั้ง
          </p>
        ) : (
          <>
            <p className="mt-3 text-xs text-slate-500">โทเคนจาก QR ได้รับแล้ว</p>
            {eventsLoading ? (
              <p className="mt-4 text-sm text-slate-400">กำลังโหลดรายการงาน…</p>
            ) : eventsMsg ? (
              <p className="mt-4 text-sm text-amber-200/90">{eventsMsg}</p>
            ) : events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                ยังไม่มีงานที่เปิดรับบัตร — ผู้ดูแลสร้างงานที่แผง Admin → รับบัตรเลือกตั้ง
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="block text-xs text-slate-400">
                  เลือกงาน
                  <select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">— เลือก —</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.slug}>
                        {ev.title_th} ({ev.slug})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={claimLoading}
                  onClick={() => void submitClaim()}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow ${portalFocusRing} bg-fuchsia-700 hover:bg-fuchsia-600 disabled:opacity-50`}
                >
                  {claimLoading ? 'กำลังบันทึก…' : 'ยืนยันการรับบัตร'}
                </button>
                {claimMsg ? <p className="text-sm text-amber-200/90">{claimMsg}</p> : null}
                {claimOk ? <p className="text-sm text-emerald-300/90">{claimOk}</p> : null}
              </div>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/"
            className={`inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 ${portalFocusRing}`}
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}
