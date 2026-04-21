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
            ภาพรวมสมาคมและการสนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย — ข้อมูลจากสแนปช็อตพอร์ทัล
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
          <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5" aria-label="สถิติการสนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย">
            <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สถิติการสนับสนุนกิจกรรมโรงเรียนยุพราชวิทยาลัย</h3>
            <p className="mt-1 text-sm text-slate-400">
              โครงการและลำดับเดียวกับที่ Admin ตั้งในระบบและในหน้า «สนับสนุนกิจกรรม» (สแนปช็อตพอร์ทัล) — ยอดและรายชื่อผู้บริจาคจาก API แบบสด
            </p>
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
