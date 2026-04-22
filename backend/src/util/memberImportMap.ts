/**
 * ลำดับหัวคอลัมน์ในไฟล์เทมเพลต — ครบทุกคีย์ใน HEADER_TO_DB
 * (รุ่น/ชื่อ/นามสกุล อยู่ต้น — จำเป็นต่อการผูกบัญชี; คอลัมน์อื่นเติมตามความพร้อมของข้อมูล)
 */
export const IMPORT_TEMPLATE_HEADERS: readonly string[] = [
  'รุ่น',
  'ชื่อ',
  'นามสกุล',
  'ลำดับ',
  'Line UID',
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
  'สมาชิกภาพ',
  'ประธานรุ่น',
  'ศิษย์เก่าดีเด่น',
  'ศิษย์เก่าดีเด่น (ปี พ.ศ.)',
  'ศิษย์เก่าดีเด่น (โปรแกรม)',
  'ฐานสถานะศิษย์เก่า',
  'รูปโปรไฟล์ (URL)',
]

/** หัวตารางภาษาไทย (ใน Excel) → คีย์ในฐานข้อมูล members */
export const HEADER_TO_DB: Record<string, keyof MemberRow> = {
  ลำดับ: 'row_number',
  'Line UID': 'line_uid',
  รหัส: 'member_code',
  เลขประจำตัว: 'student_id',
  รุ่น: 'batch',
  ชื่อรุ่น: 'batch_name',
  ปีรุ่น: 'batch_year',
  คำนำหน้านาม: 'title',
  ชื่อ: 'first_name',
  นามสกุล: 'last_name',
  วันเกิด: 'birth_date',
  วันสมัคร: 'joined_date',
  ชื่อเล่น: 'nickname',
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
  สมาชิกภาพ: 'membership_status',
  'รูปโปรไฟล์ (URL)': 'photo_url',
}

/** หัวคอลัมน์เก่า/สเปรดชีตเดิม — ไม่อยู่ในเทมเพลตปัจจุบัน แต่ยังรองรับตอนนำเข้า/บอดี้เก่า */
const LEGACY_HEADER_TO_DB: Record<string, keyof MemberRow> = {
  สถานะสมาชิก: 'membership_status',
}

export function thaiHeaderToMemberKey(h: string): keyof MemberRow | undefined {
  const t = h.trim()
  return HEADER_TO_DB[t] ?? LEGACY_HEADER_TO_DB[t]
}

export type MemberRow = {
  row_number: number | null
  line_uid: string | null
  member_code: string | null
  student_id: string | null
  batch: string | null
  batch_name: string | null
  batch_year: string | null
  title: string | null
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  joined_date: string | null
  nickname: string | null
  house_number: string | null
  alley: string | null
  moo: string | null
  village: string | null
  road: string | null
  subdistrict: string | null
  district: string | null
  province: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  line_display_id: string | null
  membership_status: string | null
  photo_url: string | null
  organization: string
  import_batch_id: string | null
}

export function emptyMemberRow(): MemberRow {
  return {
    row_number: null,
    line_uid: null,
    member_code: null,
    student_id: null,
    batch: null,
    batch_name: null,
    batch_year: null,
    title: null,
    first_name: null,
    last_name: null,
    birth_date: null,
    joined_date: null,
    nickname: null,
    house_number: null,
    alley: null,
    moo: null,
    village: null,
    road: null,
    subdistrict: null,
    district: null,
    province: null,
    postal_code: null,
    phone: null,
    email: null,
    line_display_id: null,
    membership_status: 'Active',
    photo_url: null,
    organization: 'alumni',
    import_batch_id: null,
  }
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return String(v)
  const s = String(v).trim()
  return s === '' ? null : s
}

function cellToInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

/** แปลงแถวจาก sheet_to_json ให้เป็น MemberRow */
export function mapExcelRow(
  raw: Record<string, unknown>,
  importBatchId: string,
): MemberRow {
  const out = emptyMemberRow()
  out.import_batch_id = importBatchId
  out.organization = 'alumni'

  for (const [thaiHeader, value] of Object.entries(raw)) {
    const key = thaiHeaderToMemberKey(thaiHeader)
    if (!key || key === 'import_batch_id' || key === 'organization') continue

    if (key === 'row_number') {
      out.row_number = cellToInt(value)
      continue
    }

    const str = cellToString(value)
    if (str === null) continue

    if (key === 'line_uid' || key === 'phone' || key === 'batch' || key === 'line_display_id') {
      ;(out as Record<string, unknown>)[key] = str
      continue
    }

    ;(out as Record<string, unknown>)[key] = str
  }

  if (!out.membership_status) out.membership_status = 'Active'
  return out
}
