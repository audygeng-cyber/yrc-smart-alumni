/**
 * ช่องทางเข้าระบบด้วย LINE — ใช้ร่วมกับ UID เพื่ออ้างอิงสิทธิ์ (RBAC) และบันทึกต่อใน backend ได้
 *
 * - alumni_url: สมาชิก / กรรมการ (ศิษย์เก่า) เข้าทาง URL หลัก
 * - cram_qr: ผู้บริหารกวดวิชา / ครู / ผู้ปกครอง / นักเรียน ที่ไม่ใช่ศิษย์เก่า — สแกน QR มาที่หน้า /entry/cram-qr
 * - cram_alumni_url: ผู้บริหารโรงเรียนกวดวิชาที่เป็นศิษย์เก่า — เข้าทาง URL (เช่น ?entry=cram_alumni_url)
 */

export const LINE_ENTRY_QUERY_PARAM = 'entry'

export const LINE_ENTRY_SOURCES = {
  /** ศิษย์เก่า — สมาชิก / คณะกรรมการ เข้าทาง URL */
  ALUMNI_URL: 'alumni_url',
  /** ไม่ใช่ศิษย์เก่า — สแกน QR เข้าหน้า /entry/cram-qr */
  CRAM_QR: 'cram_qr',
  /** ศิษย์เก่า + บทบาทกวดวิชา — เข้าทาง URL */
  CRAM_ALUMNI_URL: 'cram_alumni_url',
} as const

export type LineEntrySource = (typeof LINE_ENTRY_SOURCES)[keyof typeof LINE_ENTRY_SOURCES]

const ALLOWED = new Set<string>(Object.values(LINE_ENTRY_SOURCES))

export function isLineEntrySource(v: string): v is LineEntrySource {
  return ALLOWED.has(v)
}

export const SS_LINE_ENTRY_SOURCE = 'yrc_line_entry_source'

export function readLineEntrySource(): LineEntrySource | null {
  const raw = sessionStorage.getItem(SS_LINE_ENTRY_SOURCE)?.trim()
  return raw && isLineEntrySource(raw) ? raw : null
}

export function setLineEntrySource(source: LineEntrySource) {
  sessionStorage.setItem(SS_LINE_ENTRY_SOURCE, source)
}

export function clearLineEntrySource() {
  sessionStorage.removeItem(SS_LINE_ENTRY_SOURCE)
}

/** อ่านจาก `?entry=` แล้วเก็บใน session — ค่าที่ไม่รู้จักจะถูกละเว้น */
export function captureLineEntryFromSearchParams(search: string): LineEntrySource | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const raw = params.get(LINE_ENTRY_QUERY_PARAM)?.trim()
  if (!raw || !isLineEntrySource(raw)) return null
  setLineEntrySource(raw)
  return raw
}

export function lineEntrySourceDescription(source: LineEntrySource | null): string {
  if (!source) return 'ยังไม่ระบุช่องทาง (เข้าหน้าเว็บโดยตรง)'
  switch (source) {
    case LINE_ENTRY_SOURCES.ALUMNI_URL:
      return 'ศิษย์เก่า — เข้าทาง URL (สมาชิก / คณะกรรมการ)'
    case LINE_ENTRY_SOURCES.CRAM_QR:
      return 'โรงเรียนกวดวิชา — สแกน QR (ผู้บริหาร / ครู / ผู้ปกครอง / นักเรียน ที่ไม่ใช่ศิษย์เก่า)'
    case LINE_ENTRY_SOURCES.CRAM_ALUMNI_URL:
      return 'ผู้บริหารโรงเรียนกวดวิชาที่เป็นศิษย์เก่า — เข้าทาง URL'
    default:
      return '—'
  }
}
