/** trim + รวมช่องว่างซ้ำเป็นช่องเดียว (ใช้กับชื่อ–นามสกุล; รุ่นใช้แบบเดียวกันเพื่อความสม่ำเสมอ) */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}
