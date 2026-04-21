import { Link } from 'react-router-dom'
import { themeAccent, themeTapTarget } from '../lib/themeTokens'
import { portalFocusRing } from './portalLabels'
import { MetricCards, PortalContentLoading, PortalSnapshotStatusRow, TrendBars } from './ui'
import { MemberYupparajPublicStats } from './memberDonationStats'
import type { MemberPortalData, PortalDataState } from './dataAdapter'
import type { MemberRoleView } from './dataAdapter'

export function MemberDashboardPage(props: {
  portalState: PortalDataState<MemberPortalData>
  roleView: MemberRoleView
  apiBase: string
}) {
  const { data, loading, source } = props.portalState
  const portalMockMode = !loading && source === 'mock'

  return (
    <div className="min-w-0 space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm" aria-busy={loading}>
        <PortalSnapshotStatusRow loading={loading} source={source}>
          <p className="text-xs leading-snug text-slate-400 line-clamp-3 sm:line-clamp-none">
            ภาพรวมสมาคมและการสนับสนุนกองโรงเรียนยุพราช — ข้อมูลจากสแนปช็อตพอร์ทัล
          </p>
        </PortalSnapshotStatusRow>
      </section>

      {loading ? (
        <PortalContentLoading className="text-sm text-slate-400" />
      ) : (
        <>
          <MetricCards items={data.statsCards} />
          <MetricCards items={data.roleCards[props.roleView]} />
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">จำนวนสมาชิกตามรุ่น</h3>
            <p className="mt-2 text-sm text-slate-400">สัดส่วนจากทะเบียนสมาชิกในระบบ (สแนปช็อต)</p>
            <TrendBars items={data.batchDistribution} color="fuchsia" />
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถิติการสนับสนุนกองโรงเรียนยุพราช</h3>
                <p className="mt-1 text-sm text-slate-400">ยอดรวม แยกตามโครงการและรุ่น — อัปเดตจากเซิร์ฟเวอร์</p>
              </div>
              <Link
                to="/member/donations"
                className={`${themeTapTarget} inline-flex shrink-0 items-center rounded-lg px-3 py-1.5 text-xs font-medium ${themeAccent.buttonSoft} ${portalFocusRing}`}
                aria-label="ไปหน้าสนับสนุนกิจกรรมโรงเรียนยุพราช"
              >
                ไปหน้าสนับสนุน
              </Link>
            </div>
            <div className="mt-4">
              <MemberYupparajPublicStats apiBase={props.apiBase} refreshTrigger={0} mockMode={portalMockMode} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
