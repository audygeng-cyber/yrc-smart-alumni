export type ThaiTaxCalculationInput = {
  baseAmount: number
  vatRate?: number
  whtRate?: number
}

export type ThaiTaxCalculationResult = {
  baseAmount: number
  vatRate: number
  whtRate: number
  vatAmount: number
  whtAmount: number
  grossAmount: number
  netPayable: number
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

export function isSupportedWhtRate(value: number): boolean {
  return value === 0 || value === 0.01 || value === 0.03 || value === 0.05
}

export function isSupportedVatRate(value: number): boolean {
  return value === 0 || value === 0.07
}

export function calculateThaiTax(input: ThaiTaxCalculationInput): ThaiTaxCalculationResult {
  const baseAmount = Number(input.baseAmount)
  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    throw new Error('baseAmount must be positive number')
  }
  const vatRate = input.vatRate ?? 0
  const whtRate = input.whtRate ?? 0
  if (!isSupportedVatRate(vatRate)) throw new Error('unsupported vat rate')
  if (!isSupportedWhtRate(whtRate)) throw new Error('unsupported withholding tax rate')

  const vatAmount = roundMoney(baseAmount * vatRate)
  const whtAmount = roundMoney(baseAmount * whtRate)
  const grossAmount = roundMoney(baseAmount + vatAmount)
  const netPayable = roundMoney(grossAmount - whtAmount)

  return {
    baseAmount: roundMoney(baseAmount),
    vatRate,
    whtRate,
    vatAmount,
    whtAmount,
    grossAmount,
    netPayable,
  }
}
