import { describe, expect, it } from 'vitest'
import { canDepreciateInMonth, isMonthKey, monthEndDate, monthlyDepreciationAmount } from './fixedAsset.js'

describe('fixedAsset utils', () => {
  it('validates and converts month key', () => {
    expect(isMonthKey('2026-04')).toBe(true)
    expect(isMonthKey('2026-4')).toBe(false)
    expect(monthEndDate('2026-02')).toBe('2026-02-28')
  })

  it('calculates monthly depreciation using straight-line', () => {
    const amount = monthlyDepreciationAmount({
      purchaseDate: '2026-01-01',
      cost: 12000,
      residualValue: 0,
      usefulLifeMonths: 12,
    })
    expect(amount).toBe(1000)
  })

  it('checks eligibility of depreciation month', () => {
    const asset = {
      purchaseDate: '2026-03-15',
      cost: 12000,
      residualValue: 0,
      usefulLifeMonths: 12,
    }
    expect(canDepreciateInMonth(asset, '2026-02', 0)).toBe(false)
    expect(canDepreciateInMonth(asset, '2026-03', 0)).toBe(true)
    expect(canDepreciateInMonth(asset, '2026-04', 12)).toBe(false)
  })
})
