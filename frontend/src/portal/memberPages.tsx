import { Navigate, Route, Routes } from 'react-router-dom'
import { MemberPortal } from '../components/MemberPortal'
import { DonationCampaignCard, MeetingReportRow, MetricCards, PortalShell, SectionPlaceholder, TrendBars } from './ui'

export function MemberArea(props: {
  apiBase: string
  lineUid: string
  member: Record<string, unknown>
  lineDisplayName: string
  onMemberUpdated: (member: Record<string, unknown>) => void
}) {
  const memberNav = [
    { to: '/member/dashboard', label: 'Dashboard' },
    { to: '/member/card', label: 'บัตรสมาชิก' },
    { to: '/member/profile', label: 'ข้อมูลส่วนตัว' },
    { to: '/member/statistics', label: 'สถิติสมาชิก' },
    { to: '/member/donations', label: 'สนับสนุนกิจกรรม' },
    { to: '/member/meetings', label: 'ประชุมและการเงิน' },
  ]

  return (
    <PortalShell
      title="Member Portal"
      subtitle="เมนูสมาชิก · บัตรสมาชิก · ข้อมูลส่วนตัว · สถิติ · การสนับสนุน"
      navItems={memberNav}
    >
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <MemberPortal
              apiBase={props.apiBase}
              lineUid={props.lineUid}
              member={props.member}
              onMemberUpdated={props.onMemberUpdated}
              lineDisplayName={props.lineDisplayName}
            />
          }
        />
        <Route path="card" element={<MemberCardPage member={props.member} />} />
        <Route path="profile" element={<MemberProfilePage member={props.member} />} />
        <Route path="statistics" element={<MemberStatisticsPage />} />
        <Route path="donations" element={<MemberDonationsPage />} />
        <Route path="meetings" element={<MemberMeetingsPage />} />
        <Route path="*" element={<NotFoundInline />} />
      </Routes>
    </PortalShell>
  )
}

function MemberCardPage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  const batch = props.member.batch != null ? String(props.member.batch) : '-'
  const lineUid = props.member.line_uid != null ? String(props.member.line_uid) : '-'
  return (
    <SectionPlaceholder
      title="บัตรสมาชิกดิจิทัล"
      description={`เตรียมหน้าบัตรสมาชิกสำหรับ ${fullName} · รุ่น ${batch} · LINE UID ${lineUid}`}
    />
  )
}

function MemberProfilePage(props: { member: Record<string, unknown> }) {
  const fullName = [props.member.first_name, props.member.last_name].filter(Boolean).join(' ').trim() || '-'
  return (
    <SectionPlaceholder
      title="ข้อมูลส่วนตัวสมาชิก"
      description={`เตรียมหน้าจัดการข้อมูลส่วนตัวและประวัติคำขอแก้ไขข้อมูลของ ${fullName}`}
    />
  )
}

function MemberStatisticsPage() {
  const batchDistribution = [
    { label: 'รุ่น 53', value: 96 },
    { label: 'รุ่น 54', value: 124 },
    { label: 'รุ่น 55', value: 141 },
    { label: 'รุ่น 56', value: 109 },
    { label: 'รุ่น 57', value: 133 },
  ]

  return (
    <div className="space-y-4">
      <MetricCards
        items={[
          { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'ภาพรวมทั้งสมาคมศิษย์เก่า' },
          { label: 'จำนวนรุ่น', value: '58', hint: 'รุ่นที่มีข้อมูลในทะเบียน' },
          { label: 'สมาชิก active', value: '1,019', hint: 'มี session/การใช้งานล่าสุด' },
          { label: 'คำร้องเดือนนี้', value: '42', hint: 'คำร้องอัปเดตข้อมูลทั้งหมด' },
        ]}
      />
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สัดส่วนสมาชิกตามรุ่น (ตัวอย่าง)</h3>
        <TrendBars items={batchDistribution} color="emerald" />
      </section>
    </div>
  )
}

function MemberDonationsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สนับสนุนกิจกรรมโรงเรียน</h3>
        <p className="mt-2 text-sm text-slate-400">เลือกโครงการที่ต้องการสนับสนุนและแนบสลิปเพื่อยืนยันรายการ</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DonationCampaignCard title="กองทุนทุนการศึกษา" progress={72} target="500,000" raised="360,000" />
          <DonationCampaignCard title="พัฒนาห้องเรียนอัจฉริยะ" progress={41} target="800,000" raised="328,000" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-emerald-800 px-4 py-2 text-sm text-white hover:bg-emerald-700">
            บริจาคและแนบสลิป
          </button>
          <button type="button" className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            ดูประวัติการบริจาค
          </button>
        </div>
      </section>
    </div>
  )
}

function MemberMeetingsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">สาระประชุมและรายรับรายจ่าย</h3>
        <p className="mt-2 text-sm text-slate-400">ข้อมูลที่สมาชิกเข้าถึงได้: สรุปรายงานประชุมและภาพรวมทางการเงิน</p>
        <div className="mt-4 space-y-2 text-sm">
          <MeetingReportRow title="ประชุมใหญ่สามัญประจำปี 2569" date="12/04/2569" />
          <MeetingReportRow title="สรุปโครงการสนับสนุนกิจกรรมเดือนมีนาคม" date="28/03/2569" />
          <MeetingReportRow title="รายงานการเงินไตรมาส 1/2569" date="20/03/2569" />
        </div>
      </section>
      <MetricCards
        items={[
          { label: 'รายรับเดือนนี้', value: '฿ 482,000', hint: 'รวมรายรับที่เปิดเผยต่อสมาชิก' },
          { label: 'รายจ่ายเดือนนี้', value: '฿ 351,400', hint: 'ค่าใช้จ่ายกิจกรรมและงานบริหาร' },
          { label: 'ยอดคงเหลือสุทธิ', value: '฿ 130,600', hint: 'รายรับ - รายจ่าย' },
          { label: 'จำนวนรายงานประชุม', value: '18', hint: 'เอกสารที่เผยแพร่ในระบบ' },
        ]}
      />
    </div>
  )
}

function NotFoundInline() {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
      ไม่พบหน้าที่ร้องขอภายในพอร์ทัลสมาชิก
    </section>
  )
}
