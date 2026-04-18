/**
 * Portal dashboard payloads — ต้องคงรูปแบบให้ตรงกับ frontend `src/portal/dataAdapter.ts` / `mockData.ts`
 * (รวมฟิลด์ academy เช่น cramClassRoster, schoolCourses)
 * (เมื่อมีข้อมูลจริงจาก DB ค่อยแทนที่การประกอบใน routes)
 */

export const memberPortalPayload = {
  statsCards: [
    { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'ภาพรวมทั้งสมาคมศิษย์เก่า' },
    { label: 'จำนวนรุ่น', value: '58', hint: 'รุ่นที่มีข้อมูลในทะเบียน' },
    { label: 'สมาชิกที่ใช้งานอยู่', value: '1,019', hint: 'มีการใช้งานล่าสุดในระบบ' },
    { label: 'คำร้องเดือนนี้', value: '42', hint: 'คำร้องอัปเดตข้อมูลทั้งหมด' },
  ],
  roleCards: {
    member: [
      { label: 'กิจกรรมที่สมัคร', value: '3', hint: 'กิจกรรมที่กำลังเข้าร่วมอยู่' },
      { label: 'การแจ้งเตือนใหม่', value: '5', hint: 'ยังไม่ได้อ่านในรอบ 7 วัน' },
    ],
    staff: [
      { label: 'คำร้องต้องติดตาม', value: '14', hint: 'รายการที่ต้องประสานงานเพิ่ม' },
      { label: 'เอกสารรอตรวจ', value: '9', hint: 'เอกสารรายงานที่ยังไม่สมบูรณ์' },
    ],
  },
  batchDistribution: [
    { label: 'รุ่น 53', value: 96 },
    { label: 'รุ่น 54', value: 124 },
    { label: 'รุ่น 55', value: 141 },
    { label: 'รุ่น 56', value: 109 },
    { label: 'รุ่น 57', value: 133 },
  ],
  donationCampaigns: [
    { title: 'กองทุนทุนการศึกษา', progress: 72, target: '500,000', raised: '360,000' },
    { title: 'พัฒนาห้องเรียนอัจฉริยะ', progress: 41, target: '800,000', raised: '328,000' },
  ],
  /** โครงสร้างเดียวกับ buildMemberPortalFromDb — กิจกรรมโรงเรียนยุพราช (แยกจากรายได้สมาคม/กวดวิชา) */
  yupparajDonationActivities: [] as Array<{
    id: string
    title: string
    category: string
    description: string | null
    fundScope: 'yupparaj_school'
    targetAmount: number | null
    raisedAmount: number
  }>,
  financeCards: [
    { label: 'รายรับเดือนนี้', value: '฿ 482,000', hint: 'รวมรายรับที่เปิดเผยต่อสมาชิก' },
    { label: 'รายจ่ายเดือนนี้', value: '฿ 351,400', hint: 'ค่าใช้จ่ายกิจกรรมและงานบริหาร' },
    { label: 'ยอดคงเหลือสุทธิ', value: '฿ 130,600', hint: 'รายรับ - รายจ่าย' },
    { label: 'จำนวนรายงานประชุม', value: '18', hint: 'เอกสารที่เผยแพร่ในระบบ' },
  ],
  meetingReports: [
    { title: 'ประชุมใหญ่สามัญประจำปี 2569', date: '12/04/2569' },
    { title: 'สรุปโครงการสนับสนุนกิจกรรมเดือนมีนาคม', date: '28/03/2569' },
    { title: 'รายงานการเงินไตรมาส 1/2569', date: '20/03/2569' },
  ],
  /** คำร้อง member_update_requests ต่อวัน (UTC) 7 วัน — โครงเดียวกับ committee.requestTrend */
  requestTrend: [
    { label: 'จ.', value: 4 },
    { label: 'อ.', value: 8 },
    { label: 'พ.', value: 6 },
    { label: 'พฤ.', value: 10 },
    { label: 'ศ.', value: 5 },
    { label: 'ส.', value: 3 },
    { label: 'อา.', value: 7 },
  ] as Array<{ label: string; value: number }>,
} as const

export const committeePortalPayload = {
  metricCards: [
    { label: 'สมาชิกทั้งหมด', value: '1,248', hint: 'อัปเดตล่าสุดตามทะเบียนสมาชิก' },
    { label: 'คำร้องรอดำเนินการ', value: '18', hint: 'pending_president + pending_admin' },
    { label: 'ผู้ลงทะเบียนประชุม', value: '29/35', hint: 'เทียบกับ quorum ที่กำหนด' },
    { label: 'วาระรอลงมติ', value: '6', hint: 'พร้อมเปิดลงมติในที่ประชุม' },
  ],
  roleCards: {
    chair: [
      { label: 'วาระพร้อมเซ็นอนุมัติ', value: '5', hint: 'รอประธานยืนยันก่อนประกาศใช้' },
      { label: 'เอกสารการเงินรอตรวจ', value: '12', hint: 'รายการที่ยังไม่ปิดงาน' },
    ],
    member: [
      { label: 'วาระที่ต้องลงคะแนน', value: '3', hint: 'รายการที่สมาชิกกรรมการยังไม่ลงมติ' },
      { label: 'งานติดตามมอบหมาย', value: '7', hint: 'งานที่มอบหมายให้กรรมการคนนี้' },
    ],
  },
  requestTrend: [
    { label: 'จ.', value: 4 },
    { label: 'อ.', value: 8 },
    { label: 'พ.', value: 6 },
    { label: 'พฤ.', value: 10 },
    { label: 'ศ.', value: 5 },
    { label: 'ส.', value: 3 },
    { label: 'อา.', value: 7 },
  ],
  meetings: [
    { topic: 'วาระการเงินประจำเดือน', time: '09:30', status: 'ready' as const },
    { topic: 'โครงการสนับสนุนโรงเรียน', time: '10:30', status: 'pending_vote' as const },
    { topic: 'อัปเดตทะเบียนสมาชิก', time: '11:15', status: 'in_review' as const },
  ],
  /** รอบประชุมล่าสุด (สำหรับหน้า attendance) — null ถ้ายังไม่มี meeting_sessions */
  attendanceSession: null as null | {
    id: string
    title: string
    scheduledAt: string | null
    expectedParticipants: number
    quorumNumerator: number
    quorumDenominator: number
    status: string
    signedCount: number
  },
  attendanceRows: [] as Array<{
    attendeeName: string
    attendeeRoleCode: string
    signedVia: string
    signedAt: string
  }>,
  /** วาระ status=open — ใช้ในหน้า voting */
  openAgendas: [] as Array<{
    id: string
    title: string
    scope: string
    status: string
  }>,
  /** สัดส่วนตามรุ่น (สูงสุด 8 รุ่น) — หน้าทะเบียนสมาชิกคณะกรรมการ */
  memberBatchDistribution: [] as Array<{ label: string; value: number }>,
  /** ตัวอย่างรายชื่อล่าสุด — ไม่เกิน 40 แถว */
  memberDirectoryPreview: [] as Array<{
    id: string
    firstName: string
    lastName: string
    batch: string | null
    membershipStatus: string
  }>,
  /** P/L เดือนปัจจุบันจาก journal — null ถ้ายังไม่มีรายการ */
  associationMonthlyPl: null as null | { revenue: number; expense: number; netIncome: number },
  cramSchoolMonthlyPl: null as null | { revenue: number; expense: number; netIncome: number },
  /** คำขอจ่าย status=pending */
  paymentRequestsPending: 0,
  /** เอกสารประชุมล่าสุด (meeting_documents) */
  meetingDocuments: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      title: 'ระเบียบวาระประชุมประจำเดือน',
      scope: 'association',
      meetingSessionId: '00000000-0000-0000-0000-000000000001',
      agendaId: 'a0000000-0000-0000-0000-000000000001',
      documentUrl: null,
      updatedAt: new Date().toISOString(),
    },
  ] as Array<{
    id: string
    title: string
    scope: string
    meetingSessionId: string | null
    agendaId: string | null
    documentUrl: string | null
    updatedAt: string
  }>,
  /** รายงานการประชุมล่าสุด */
  recentMinutes: [
    {
      meetingSessionId: '00000000-0000-0000-0000-000000000001',
      title: 'สรุปรายงานการประชุมคณะกรรมการเดือนล่าสุด',
      updatedAt: new Date().toISOString(),
      recordedBy: 'admin-ui',
    },
  ] as Array<{
    meetingSessionId: string
    title: string
    updatedAt: string
    recordedBy: string | null
  }>,
  /** สรุปภาพรวมงานประชุม */
  meetingOverview: {
    openAgendaCount: 1,
    closedAgendaCount: 4,
    publishedDocumentCount: 1,
    minutesPublishedCount: 1,
  } as {
    openAgendaCount: number
    closedAgendaCount: number
    publishedDocumentCount: number
    minutesPublishedCount: number
  },
  /** ผลมติหลังปิดวาระล่าสุด */
  closedAgendaResults: [
    {
      id: 'a0000000-0000-0000-0000-000000000101',
      title: 'รับรองรายงานการเงินไตรมาสที่ผ่านมา',
      scope: 'association',
      closedAt: new Date().toISOString(),
      approve: 21,
      reject: 4,
      abstain: 2,
      totalVotes: 27,
      attendees: 27,
      majorityRequired: 14,
      quorumRequired: 0,
      quorumMet: true,
      approvedByVote: true,
      resultLabel: 'ผ่านมติ',
    },
  ] as Array<{
    id: string
    title: string
    scope: string
    closedAt: string
    approve: number
    reject: number
    abstain: number
    totalVotes: number
    attendees: number
    majorityRequired: number
    quorumRequired: number
    quorumMet: boolean
    approvedByVote: boolean
    resultLabel: string
  }>,
} as const

export const academyPortalPayload = {
  metricCards: [
    { label: 'นักเรียนทั้งหมด', value: '862', hint: 'รวมทุกห้องและทุกระดับ' },
    { label: 'ห้องเรียนที่เปิด', value: '24', hint: 'ห้องที่มีตารางสอนเปิดใช้งาน' },
    { label: 'คอร์สที่เปิด', value: '31', hint: 'คอร์สที่เปิดรับสมัครอยู่' },
    { label: 'ค่าเฉลี่ยผลการเรียน', value: '82.4', hint: 'คะแนนเฉลี่ยรวมทุกวิชา' },
  ],
  roleCards: {
    admin: [
      { label: 'นักเรียนใหม่เดือนนี้', value: '74', hint: 'แนวโน้มการสมัครรายเดือน' },
      { label: 'อัตราชำระครบ', value: '86%', hint: 'สถานะค่าใช้จ่ายรวมทุกคอร์ส' },
    ],
    teacher: [
      { label: 'ชั้นเรียนที่รับผิดชอบ', value: '6', hint: 'ห้องเรียนที่เปิดใช้งานของครู' },
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
  },
  classes: [
    { room: 'ม.4 ห้อง A', students: 38, avgScore: 84.2 },
    { room: 'ม.5 ห้อง B', students: 42, avgScore: 81.5 },
    { room: 'ม.6 ห้อง C', students: 34, avgScore: 86.7 },
  ],
  enrollmentFunnel: [
    { label: 'สมัครใหม่', value: 120 },
    { label: 'ยืนยันเอกสาร', value: 92 },
    { label: 'ชำระเงิน', value: 78 },
    { label: 'เข้าเรียนแล้ว', value: 71 },
  ],
  /** มีเมื่อมี journal เดือนนี้ของนิติบุคคล cram_school */
  cramSchoolMonthlyPl: null,
  /** รายชื่อนักเรียนตามห้องจาก cram_students — [] เมื่อไม่มีข้อมูล */
  cramClassRoster: [],
  /** คอร์ส/กิจกรรมจาก school_activities (active) — [] เมื่อไม่มีข้อมูล */
  schoolCourses: [],
} as const
