/** Excel บน Windows มักต้องมี BOM ถึงจะเปิด UTF-8 จาก CSV ได้ถูกต้อง */
export const UTF8_BOM = '\uFEFF'

export function withUtf8Bom(csvBody: string): string {
  return csvBody.startsWith(UTF8_BOM) ? csvBody : `${UTF8_BOM}${csvBody}`
}
