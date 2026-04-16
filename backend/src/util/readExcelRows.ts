/**
 * แปลงค่าเซลล์จาก read-excel-file เป็นสตริงสำหรับนำเข้าสมาชิก
 */
export function cellToImportString(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10)
  }
  return String(cell).trim()
}

/**
 * แถวแรก = หัวคอลัมน์ แถวถัดไป = ข้อมูล (แต่ละแถวเป็น object ตามหัวคอลัมน์)
 */
export function sheetRowsToObjects(rows: (unknown | null)[][]): Record<string, unknown>[] {
  if (rows.length === 0) return []
  const headerCells = rows[0]!.map((c) => String(c ?? '').trim())
  const dataRows = rows.slice(1)
  return dataRows.map((row) => {
    const o: Record<string, unknown> = {}
    headerCells.forEach((header, i) => {
      if (!header) return
      o[header] = cellToImportString(row[i])
    })
    return o
  })
}
