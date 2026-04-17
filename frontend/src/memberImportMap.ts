/**
 * สอดคล้องกับ backend memberImportMap — ใช้ฟอร์มผู้ใช้ (ภาษาไทย)
 * ไม่รวม รุ่น/ชื่อ/นามสกุล (ใช้ช่องตรวจสอบแยก) และ LINE UID / ลำดับ (ระบบจัดการ)
 */
export const MEMBER_SELF_EDIT_HEADERS: readonly string[] = [
  'รหัส',
  'เลขประจำตัว',
  'ชื่อรุ่น',
  'ปีรุ่น',
  'คำนำหน้านาม',
  'ชื่อเล่น',
  'วันเกิด',
  'วันสมัคร',
  'บ้านเลขที่',
  'ซอย',
  'หมู่',
  'หมู่บ้าน',
  'ถนน',
  'ตำบล',
  'อำเภอ',
  'จังหวัด',
  'รหัสไปรษณีย์',
  'เบอร์โทรศัพท์',
  'อีเมล์',
  'ID Line',
  'สถานะสมาชิก',
]

/** หัวภาษาไทย → คีย์ JSON จาก API (members row) */
export const HEADER_TO_MEMBER_KEY: Record<string, string> = {
  รหัส: 'member_code',
  เลขประจำตัว: 'student_id',
  ชื่อรุ่น: 'batch_name',
  ปีรุ่น: 'batch_year',
  คำนำหน้านาม: 'title',
  ชื่อเล่น: 'nickname',
  วันเกิด: 'birth_date',
  วันสมัคร: 'joined_date',
  บ้านเลขที่: 'house_number',
  ซอย: 'alley',
  หมู่: 'moo',
  หมู่บ้าน: 'village',
  ถนน: 'road',
  ตำบล: 'subdistrict',
  อำเภอ: 'district',
  จังหวัด: 'province',
  รหัสไปรษณีย์: 'postal_code',
  เบอร์โทรศัพท์: 'phone',
  อีเมล์: 'email',
  'ID Line': 'line_display_id',
  สถานะสมาชิก: 'membership_status',
}

/** ฟิลด์เพิ่มสำหรับคำร้องสมัครใหม่ (นอกจาก รุ่น ชื่อ นามสกุล) — ชุดเดียวกับแก้ไขตัวเอง */
export const MEMBER_REGISTER_EXTRA_HEADERS = MEMBER_SELF_EDIT_HEADERS
