import { describe, expect, it } from 'vitest'
import { calculateThaiTax, isSupportedVatRate, isSupportedWhtRate } from './tax.js'

describe('tax utils', () => {
  it('calculates VAT and WHT for normal case', () => {
    const result = calculateThaiTax({ baseAmount: 1000, vatRate: 0.07, whtRate: 0.03 })
    expect(result.vatAmount).toBe(70)
    expect(result.whtAmount).toBe(30)
    expect(result.grossAmount).toBe(1070)
    expect(result.netPayable).toBe(1040)
  })

  it('supports zero tax rates', () => {
    const result = calculateThaiTax({ baseAmount: 2500, vatRate: 0, whtRate: 0 })
    expect(result.vatAmount).toBe(0)
    expect(result.whtAmount).toBe(0)
    expect(result.netPayable).toBe(2500)
  })

  it('validates supported tax rates', () => {
    expect(isSupportedVatRate(0.07)).toBe(true)
    expect(isSupportedVatRate(0.1)).toBe(false)
    expect(isSupportedWhtRate(0.03)).toBe(true)
    expect(isSupportedWhtRate(0.02)).toBe(false)
  })
})
