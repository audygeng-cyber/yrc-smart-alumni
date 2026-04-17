export type MetricItem = { label: string; value: string; hint: string }
export type TrendItem = { label: string; value: number }
export type MeetingItem = { topic: string; time: string; status: 'ready' | 'pending_vote' | 'in_review' }
export type DonationCampaign = { title: string; progress: number; target: string; raised: string }
export type MeetingReportItem = { title: string; date: string }
export type AcademyClassItem = { room: string; students: number; avgScore: number }
export type AcademyCramRosterRow = { name: string; avgScore: number | null }
export type AcademyCramClassRoster = { room: string; roster: AcademyCramRosterRow[] }
export type AcademySchoolCourseItem = { id: string; title: string; category: string; description: string | null }

export const memberStatsCards: MetricItem[] = [
  { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'ภาพรวมทั้งสมาคมศิษย์เก่า' },
  { label: 'จำนวนรุ่น', value: '58', hint: 'รุ่นที่มีข้อมูลในทะเบียน' },
  { label: 'สมาชิก active', value: '1,019', hint: 'มี session/การใช้งานล่าสุด' },
  { label: 'คำร้องเดือนนี้', value: '42', hint: 'คำร้องอัปเดตข้อมูลทั้งหมด' },
]

export const memberBatchDistribution: TrendItem[] = [
  { label: 'รุ่น 53', value: 96 },
  { label: 'รุ่น 54', value: 124 },
  { label: 'รุ่น 55', value: 141 },
  { label: 'รุ่น 56', value: 109 },
  { label: 'รุ่น 57', value: 133 },
]

export const memberDonationCampaigns: DonationCampaign[] = [
  { title: 'กองทุนทุนการศึกษา', progress: 72, target: '500,000', raised: '360,000' },
  { title: 'พัฒนาห้องเรียนอัจฉริยะ', progress: 41, target: '800,000', raised: '328,000' },
]

export const memberFinanceCards: MetricItem[] = [
  { label: 'รายรับเดือนนี้', value: '฿ 482,000', hint: 'รวมรายรับที่เปิดเผยต่อสมาชิก' },
  { label: 'รายจ่ายเดือนนี้', value: '฿ 351,400', hint: 'ค่าใช้จ่ายกิจกรรมและงานบริหาร' },
  { label: 'ยอดคงเหลือสุทธิ', value: '฿ 130,600', hint: 'รายรับ - รายจ่าย' },
  { label: 'จำนวนรายงานประชุม', value: '18', hint: 'เอกสารที่เผยแพร่ในระบบ' },
]

export const memberMeetingReports: MeetingReportItem[] = [
  { title: 'ประชุมใหญ่สามัญประจำปี 2569', date: '12/04/2569' },
  { title: 'สรุปโครงการสนับสนุนกิจกรรมเดือนมีนาคม', date: '28/03/2569' },
  { title: 'รายงานการเงินไตรมาส 1/2569', date: '20/03/2569' },
]

export const committeeMetricCards: MetricItem[] = [
  { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'อัปเดตล่าสุดตามทะเบียนสมาชิก' },
  { label: 'คำร้องรอดำเนินการ', value: '18', hint: 'pending_president + pending_admin' },
  { label: 'ผู้ลงทะเบียนประชุม', value: '29/35', hint: 'เทียบกับ quorum ที่กำหนด' },
  { label: 'วาระรอลงมติ', value: '6', hint: 'พร้อมเปิด vote ในที่ประชุม' },
]

export const committeeRequestTrend: TrendItem[] = [
  { label: 'Mon', value: 4 },
  { label: 'Tue', value: 8 },
  { label: 'Wed', value: 6 },
  { label: 'Thu', value: 10 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 3 },
  { label: 'Sun', value: 7 },
]

export const committeeMeetings: MeetingItem[] = [
  { topic: 'วาระการเงินประจำเดือน', time: '09:30', status: 'ready' },
  { topic: 'โครงการสนับสนุนโรงเรียน', time: '10:30', status: 'pending_vote' },
  { topic: 'อัปเดตทะเบียนสมาชิก', time: '11:15', status: 'in_review' },
]

export const committeeRoleCards: Record<'chair' | 'member', MetricItem[]> = {
  chair: [
    { label: 'วาระพร้อมเซ็นอนุมัติ', value: '5', hint: 'รอประธานยืนยันก่อนประกาศใช้' },
    { label: 'เอกสารการเงินรอตรวจ', value: '12', hint: 'รายการที่ยังไม่ finalize' },
  ],
  member: [
    { label: 'วาระที่ต้องลงคะแนน', value: '3', hint: 'รายการที่สมาชิกกรรมการยังไม่ลงมติ' },
    { label: 'งานติดตามมอบหมาย', value: '7', hint: 'งานที่ assigned ให้กรรมการคนนี้' },
  ],
}

export const academyMetricCards: MetricItem[] = [
  { label: 'นักเรียนทั้งหมด', value: '862', hint: 'รวมทุกห้องและทุกระดับ' },
  { label: 'ห้องเรียนที่เปิด', value: '24', hint: 'ห้องที่มี active schedule' },
  { label: 'คอร์สที่เปิด', value: '31', hint: 'คอร์สที่เปิดรับสมัครอยู่' },
  { label: 'ค่าเฉลี่ยผลการเรียน', value: '82.4', hint: 'คะแนนเฉลี่ยรวมทุกวิชา' },
]

export const academyClasses: AcademyClassItem[] = [
  { room: 'ม.4 ห้อง A', students: 38, avgScore: 84.2 },
  { room: 'ม.5 ห้อง B', students: 42, avgScore: 81.5 },
  { room: 'ม.6 ห้อง C', students: 34, avgScore: 86.7 },
]

export const academyCramClassRoster: AcademyCramClassRoster[] = [
  {
    room: 'ม.4 ห้อง A',
    roster: [
      { name: 'สมชาย ใจดี', avgScore: 85 },
      { name: 'สมหญิง รักเรียน', avgScore: 83.4 },
    ],
  },
  {
    room: 'ม.5 ห้อง B',
    roster: [
      { name: 'วิชัย ขยัน', avgScore: 80 },
      { name: 'วิไล เก่งมาก', avgScore: 83 },
    ],
  },
  {
    room: 'ม.6 ห้อง C',
    roster: [{ name: 'ณัฐพล สอบติด', avgScore: 86.7 }],
  },
]

export const academySchoolCourses: AcademySchoolCourseItem[] = [
  {
    id: 'mock-course-1',
    title: 'คณิตศาสตร์เสริม ม.4-6',
    category: 'วิชาหลัก',
    description: 'เน้นโจทย์ข้อสอบเข้ามหาวิทยาลัย',
  },
  {
    id: 'mock-course-2',
    title: 'ภาษาอังกฤษสื่อสาร',
    category: 'ภาษา',
    description: null,
  },
  {
    id: 'mock-course-3',
    title: 'ฟิสิกส์เข้ม',
    category: 'วิชาหลัก',
    description: 'พื้นฐานและตัวอย่างข้อสอบ',
  },
]

export const academyEnrollmentFunnel: TrendItem[] = [
  { label: 'สมัครใหม่', value: 120 },
  { label: 'ยืนยันเอกสาร', value: 92 },
  { label: 'ชำระเงิน', value: 78 },
  { label: 'เข้าเรียนแล้ว', value: 71 },
]

export const academyRoleCards: Record<'admin' | 'teacher' | 'student' | 'parent', MetricItem[]> = {
  admin: [
    { label: 'นักเรียนใหม่เดือนนี้', value: '74', hint: 'แนวโน้มการสมัครรายเดือน' },
    { label: 'อัตราชำระครบ', value: '86%', hint: 'สถานะค่าใช้จ่ายรวมทุกคอร์ส' },
  ],
  teacher: [
    { label: 'ชั้นเรียนที่รับผิดชอบ', value: '6', hint: 'ห้องเรียน active ของครู' },
    { label: 'งานตรวจคะแนนค้าง', value: '24', hint: 'รายการที่ต้องตรวจวันนี้' },
  ],
  student: [
    { label: 'คอร์สที่ลงทะเบียน', value: '4', hint: 'คอร์สที่กำลังเรียนอยู่' },
    { label: 'คะแนนเฉลี่ยของฉัน', value: '83.6', hint: 'คำนวณจากทุกวิชาล่าสุด' },
  ],
  parent: [
    { label: 'บุตรหลานที่ดูแล', value: '2', hint: 'บัญชีที่เชื่อมกับผู้ปกครอง' },
    { label: 'แจ้งเตือนผลการเรียนใหม่', value: '3', hint: 'อัปเดตที่ยังไม่อ่าน' },
  ],
}
