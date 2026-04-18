/** สร้างเนื้อหา CSV ไม่มี BOM — ใช้ร่วมกับ `withUtf8Bom` ตอน `res.send` */

export function csvEscapeValue(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0] ?? {})
  const lines = [headers.map((h) => csvEscapeValue(h)).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscapeValue(row[h])).join(','))
  }
  return `${lines.join('\n')}\n`
}
