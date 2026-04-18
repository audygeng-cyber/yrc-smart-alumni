import { describe, expect, it } from 'vitest'
import { ACTIVITY_SHORTCUTS, PAGE_SIZE, PAYMENT_PURPOSE_OPTIONS } from './adminFinanceConstants'

describe('layout / storage constants', () => {
  it('exports stable pagination and activity shortcuts', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0)
    expect(ACTIVITY_SHORTCUTS.length).toBeGreaterThan(0)
  })
})

describe('PAYMENT_PURPOSE_OPTIONS', () => {
  it('lists 8 categories matching backend financePolicy keys', () => {
    expect(PAYMENT_PURPOSE_OPTIONS).toHaveLength(8)
    const values = PAYMENT_PURPOSE_OPTIONS.map((o) => o.value)
    expect(values).toContain('electricity')
    expect(values).toContain('other')
    expect(new Set(values).size).toBe(8)
  })
})
