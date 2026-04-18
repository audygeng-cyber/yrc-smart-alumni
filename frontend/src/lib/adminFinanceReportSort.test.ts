import { describe, expect, it } from 'vitest'
import {
  nextBatchSortState,
  nextDonorSortState,
  nextEntitySortState,
  nextPlSortState,
} from './adminFinanceReportSort'

describe('nextPlSortState', () => {
  it('สลับทิศทางเมื่อคลิกคอลัมน์เดิม', () => {
    expect(nextPlSortState('accountCode', 'asc', 'accountCode')).toEqual({
      sortKey: 'accountCode',
      sortDir: 'desc',
    })
  })
  it('ตั้งทิศทางเริ่มตามคีย์ใหม่', () => {
    expect(nextPlSortState('accountCode', 'asc', 'absNet')).toEqual({ sortKey: 'absNet', sortDir: 'desc' })
    expect(nextPlSortState('absNet', 'desc', 'accountName')).toEqual({ sortKey: 'accountName', sortDir: 'asc' })
  })
})

describe('nextDonorSortState', () => {
  it('donorLabel เริ่ม asc', () => {
    expect(nextDonorSortState('count', 'asc', 'donorLabel')).toEqual({ sortKey: 'donorLabel', sortDir: 'asc' })
  })
  it('คอลัมน์อื่นเริ่ม desc', () => {
    expect(nextDonorSortState('donorLabel', 'asc', 'totalAmount')).toEqual({
      sortKey: 'totalAmount',
      sortDir: 'desc',
    })
  })
})

describe('nextBatchSortState', () => {
  it('batch เริ่ม asc', () => {
    expect(nextBatchSortState('totalAmount', 'desc', 'batch')).toEqual({ sortKey: 'batch', sortDir: 'asc' })
  })
})

describe('nextEntitySortState', () => {
  it('legalEntityCode เริ่ม asc', () => {
    expect(nextEntitySortState('totalAmount', 'desc', 'legalEntityCode')).toEqual({
      sortKey: 'legalEntityCode',
      sortDir: 'asc',
    })
  })
})
