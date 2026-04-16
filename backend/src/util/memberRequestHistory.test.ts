import { describe, expect, it } from 'vitest'
import {
  appendMemberRequestHistory,
  buildMemberRequestHistoryEntry,
  readMemberRequestHistory,
} from './memberRequestHistory.js'

describe('memberRequestHistory', () => {
  it('builds normalized history entries', () => {
    const entry = buildMemberRequestHistoryEntry({
      action: 'president_approved',
      actor: ' ประธานรุ่น ',
      at: '2026-04-16T10:00:00.000Z',
      comment: ' อนุมัติแล้ว ',
      fromStatus: 'pending_president',
      toStatus: 'pending_admin',
    })

    expect(entry).toEqual({
      action: 'president_approved',
      actor: 'ประธานรุ่น',
      at: '2026-04-16T10:00:00.000Z',
      comment: 'อนุมัติแล้ว',
      from_status: 'pending_president',
      to_status: 'pending_admin',
    })
  })

  it('appends new entries onto existing valid history', () => {
    const history = appendMemberRequestHistory(
      [
        {
          action: 'submitted',
          actor: 'member',
          at: '2026-04-16T09:00:00.000Z',
          comment: null,
          from_status: null,
          to_status: 'pending_president',
        },
      ],
      buildMemberRequestHistoryEntry({
        action: 'rejected',
        actor: 'Admin',
        at: '2026-04-16T11:00:00.000Z',
        comment: 'ข้อมูลไม่ครบ',
        fromStatus: 'pending_admin',
        toStatus: 'rejected',
      }),
    )

    expect(history).toHaveLength(2)
    expect(history[1]?.comment).toBe('ข้อมูลไม่ครบ')
    expect(history[1]?.to_status).toBe('rejected')
  })

  it('filters malformed rows while reading history', () => {
    const history = readMemberRequestHistory([
      { action: 'submitted', actor: 'member', at: '2026-04-16T09:00:00.000Z' },
      { action: 'unknown', actor: 'x', at: '2026-04-16T09:05:00.000Z' },
      null,
    ])

    expect(history).toEqual([
      {
        action: 'submitted',
        actor: 'member',
        at: '2026-04-16T09:00:00.000Z',
        comment: null,
        from_status: null,
        to_status: null,
      },
    ])
  })
})
