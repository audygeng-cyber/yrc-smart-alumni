/**
 * รหัสมิติสมาชิก (member_distinctions.code) — ใช้ทั้งฝั่ง import, API directory, sync ประธานรุ่น
 * @see docs/MEMBER_DISTINCTIONS_FLOW.md
 */
export const MemberDistinctionCode = {
  /** ประธานรุ่น — mark_key ว่าง; ซิงก์รุ่นละคนเดียว */
  batchPresident: 'batch_president',
  /** ศิษย์เก่าดีเด่น (ทั่วไป ไม่ระบุปี/โปรแกรม) */
  outstandingAlumni: 'outstanding_alumni',
  /** ศิษย์เก่าดีเด่น ระบุปี พ.ศ. — mark_key เช่น 2560 */
  outstandingAlumniYear: 'outstanding_alumni_year',
  /** โปรแกรม/แคมเปญ — mark_key เช่น yupparaj_120 */
  outstandingProgram: 'outstanding_program',
  /** ฐานสถานะศิษย์เก่า (กลุ่มฐานสำหรับรายงาน/สิทธิ์ต่อไป) */
  alumniBase: 'alumni_base',
} as const

export type MemberDistinctionCodeValue = (typeof MemberDistinctionCode)[keyof typeof MemberDistinctionCode]

/** คีย์โปรแกรมที่รองรับในนำเข้า — ขยายได้ที่ memberDistinctions + flow doc */
export const KNOWN_OUTSTANDING_PROGRAM_KEYS: Record<string, { label_th: string }> = {
  yupparaj_120: { label_th: 'ศิษย์เก่าดีเด่น 120 ปี ยุพราวิทยาลัย' },
}
