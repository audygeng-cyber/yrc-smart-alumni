import { describe, expect, it } from 'vitest'
import { msUntilNextHour } from './wallClockHourly'

describe('msUntilNextHour', () => {
  it('คืนค่าเหลือจนถึงชั่วโมงถัดไป (ตามเวลาเครื่อง)', () => {
    const now = new Date(2026, 3, 18, 10, 23, 30, 0)
    const ms = msUntilNextHour(now)
    expect(ms).toBe(36 * 60 * 1000 + 30 * 1000)
  })

  it('เมื่ออยู่พอดีต้นชั่วโมง ยังนับไปจนถึงชั่วโมงถัดไป', () => {
    const now = new Date(2026, 3, 18, 11, 0, 0, 0)
    expect(msUntilNextHour(now)).toBe(60 * 60 * 1000)
  })
})
