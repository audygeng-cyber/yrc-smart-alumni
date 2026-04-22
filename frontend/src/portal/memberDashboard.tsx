import { MetricCards, PortalContentLoading, TrendBars } from './ui'
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

  const roleCards = data.roleCards[props.roleView]

  return (
    <div className="min-w-0 space-y-4">
      {loading ? (
        <PortalContentLoading className="text-sm text-slate-400" />
      ) : (
        <>
          <MetricCards items={data.statsCards} />
          {roleCards.length > 0 ? <MetricCards items={roleCards} /> : null}
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-busy={loading}>
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">จำนวนสมาชิกตามรุ่น</h3>
            <p className="mt-2 text-sm text-slate-400">สัดส่วนจากทะเบียนสมาชิกในระบบ (สแนปช็อต)</p>
            <TrendBars items={data.batchDistribution} color="fuchsia" />
          </section>
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="สถิติการสนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถิติการสนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย</h3>
            <div className="mt-4">
              <MemberYupparajPublicStats
                apiBase={props.apiBase}
                refreshTrigger={0}
                mockMode={portalMockMode}
                embedded
                linkedActivities={data.yupparajDonationActivities}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
