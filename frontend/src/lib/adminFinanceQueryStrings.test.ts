import { describe, expect, it } from 'vitest'
import {
  financeBalanceSheetQuerySuffix,
  financeGlQuerySuffix,
  financeJournalsQuerySuffix,
  financePeriodClosingsQuerySuffix,
  financeReportQuerySuffix,
  meetingAgendasQuerySuffix,
  meetingDocumentsQuerySuffix,
} from './adminFinanceQueryStrings'

describe('financeReportQuerySuffix', () => {
  it('คืนค่าว่างเมื่อไม่มีพารามิเตอร์', () => {
    expect(financeReportQuerySuffix('', '', '')).toBe('')
  })
  it('รวม entity และช่วงวันที่', () => {
    expect(financeReportQuerySuffix('association', '2026-01-01', '2026-12-31')).toBe(
      '?legal_entity_code=association&from=2026-01-01&to=2026-12-31',
    )
  })
})

describe('financeJournalsQuerySuffix', () => {
  it('รวม status เมื่อกำหนด', () => {
    expect(
      financeJournalsQuerySuffix({
        reportEntity: 'association',
        reportFrom: '2026-01-01',
        reportTo: '2026-01-31',
        journalStatusFilter: 'posted',
      }),
    ).toBe('?legal_entity_code=association&from=2026-01-01&to=2026-01-31&status=posted')
  })
})

describe('financeBalanceSheetQuerySuffix', () => {
  it('ใช้ as_of', () => {
    expect(
      financeBalanceSheetQuerySuffix({ reportEntity: 'cram_school', bsAsOf: '2026-06-30' }),
    ).toBe('?legal_entity_code=cram_school&as_of=2026-06-30')
  })
})

describe('financePeriodClosingsQuerySuffix', () => {
  it('รวม limit และกรอง handoff', () => {
    expect(
      financePeriodClosingsQuerySuffix({
        reportEntity: 'association',
        periodHandoffFilter: 'pending',
        limit: 50,
      }),
    ).toBe('?legal_entity_code=association&auditor_handoff_status=pending&limit=50')
  })
  it('เมื่อ all ไม่ใส่ auditor_handoff_status', () => {
    expect(
      financePeriodClosingsQuerySuffix({ reportEntity: '', periodHandoffFilter: 'all' }),
    ).toBe('?limit=50')
  })
})

describe('financeGlQuerySuffix', () => {
  it('รวม account_code', () => {
    expect(
      financeGlQuerySuffix({
        reportEntity: 'association',
        reportFrom: '2026-01-01',
        reportTo: '2026-12-31',
        glAccountCode: '5110',
      }),
    ).toBe(
      '?legal_entity_code=association&from=2026-01-01&to=2026-12-31&account_code=5110',
    )
  })
})

describe('meetingAgendasQuerySuffix', () => {
  it('รวม scope และ status เมื่อไม่ใช่ all', () => {
    expect(
      meetingAgendasQuerySuffix({
        scope: 'association',
        agendaStatusFilter: 'open',
        meetingSessionId: 'ms-1',
      }),
    ).toBe('?scope=association&status=open&meeting_session_id=ms-1')
  })
})

describe('meetingDocumentsQuerySuffix', () => {
  it('รวม meeting_session_id และ agenda_id เมื่อมีค่า', () => {
    expect(
      meetingDocumentsQuerySuffix({
        scope: 'cram_school',
        meetingSessionId: 'x',
        agendaId: 'y',
      }),
    ).toBe('?scope=cram_school&meeting_session_id=x&agenda_id=y')
  })
})
