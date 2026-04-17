import type { AcademyClassItem } from './mockData'

/** ค่าเฉลี่ยถ่วงน้ำหนักจากจำนวนนักเรียนรายห้อง */
export function weightedAverageFromClasses(classes: AcademyClassItem[]): number | null {
  const total = classes.reduce((s, r) => s + r.students, 0)
  if (total <= 0) return null
  const sum = classes.reduce((s, r) => s + r.students * r.avgScore, 0)
  return Math.round((sum / total) * 10) / 10
}

export function totalStudentsInClasses(classes: AcademyClassItem[]): number {
  return classes.reduce((s, r) => s + r.students, 0)
}

export function formatThbShort(n: number): string {
  return `฿ ${Math.round(n).toLocaleString('en-US')}`
}
