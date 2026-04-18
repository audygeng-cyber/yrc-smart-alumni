export type FixedAssetForCalc = {
  purchaseDate: string
  cost: number
  residualValue: number
  usefulLifeMonths: number
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

export function monthEndDate(monthKey: string): string {
  if (!isMonthKey(monthKey)) throw new Error('monthKey must be YYYY-MM')
  const [year, month] = monthKey.split('-').map((v) => Number(v))
  const dt = new Date(Date.UTC(year, month, 0))
  return dt.toISOString().slice(0, 10)
}

export function monthlyDepreciationAmount(asset: FixedAssetForCalc): number {
  if (!Number.isFinite(asset.cost) || asset.cost <= 0) return 0
  if (!Number.isFinite(asset.residualValue) || asset.residualValue < 0) return 0
  if (!Number.isFinite(asset.usefulLifeMonths) || asset.usefulLifeMonths <= 0) return 0
  const depreciableBase = Math.max(0, asset.cost - asset.residualValue)
  return Math.round((depreciableBase / asset.usefulLifeMonths) * 100) / 100
}

export function canDepreciateInMonth(
  asset: FixedAssetForCalc,
  monthKey: string,
  alreadyPostedMonths: number,
): boolean {
  if (!isMonthKey(monthKey)) return false
  if (alreadyPostedMonths >= asset.usefulLifeMonths) return false
  const monthEnd = monthEndDate(monthKey)
  return asset.purchaseDate <= monthEnd
}
