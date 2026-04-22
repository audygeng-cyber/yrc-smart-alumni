import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectedPresidentKeyForBatch,
  getPresidentRegistrySyncTargets,
  isKnownPresidentKey,
  parsePresidentKeyEntries,
} from './presidentKeys.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('parsePresidentKeyEntries / keys', () => {
  it('parses legacy string map', () => {
    vi.stubEnv(
      'PRESIDENT_KEYS_JSON',
      JSON.stringify({
        '0507': 'secret-a',
        1002: 'secret-b',
      }),
    )
    vi.stubEnv('PRESIDENT_UPLOAD_KEY', '')
    const entries = parsePresidentKeyEntries()
    expect(entries).toHaveLength(2)
    expect(entries?.find((e) => e.batchKey === '1002')?.presidentKey).toBe('secret-b')
    expect(expectedPresidentKeyForBatch('0507')).toBe('secret-a')
    expect(isKnownPresidentKey('secret-b')).toBe(true)
    expect(isKnownPresidentKey('wrong')).toBe(false)
  })

  it('parses extended object with key + member_id', () => {
    const mid = '11111111-1111-4111-8111-111111111111'
    vi.stubEnv(
      'PRESIDENT_KEYS_JSON',
      JSON.stringify({
        2520: { key: 'k2520', member_id: mid },
        2521: { president_key: 'k2521', member_id: 'not-a-uuid' },
      }),
    )
    vi.stubEnv('PRESIDENT_UPLOAD_KEY', '')
    const entries = parsePresidentKeyEntries()
    expect(entries?.find((e) => e.batchKey === '2520')?.memberId).toBe(mid)
    expect(entries?.find((e) => e.batchKey === '2521')?.memberId).toBe(null)
    expect(expectedPresidentKeyForBatch('2520')).toBe('k2520')
    expect(isKnownPresidentKey('k2520')).toBe(true)
  })

  it('getPresidentRegistrySyncTargets rejects duplicate member_id', () => {
    const mid = '22222222-2222-4222-8222-222222222222'
    vi.stubEnv(
      'PRESIDENT_KEYS_JSON',
      JSON.stringify({
        A: { key: 'k1', member_id: mid },
        B: { key: 'k2', member_id: mid },
      }),
    )
    const r = getPresidentRegistrySyncTargets()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('ซ้ำ')
  })
})
