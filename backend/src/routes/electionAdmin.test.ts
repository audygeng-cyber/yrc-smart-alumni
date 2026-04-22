import { describe, expect, it } from 'vitest'
import { normalizeElectionSlugInput } from './electionAdmin.js'

describe('normalizeElectionSlugInput', () => {
  it('lowercases and strips invalid chars', () => {
    expect(normalizeElectionSlugInput('  AGM-2026  ')).toBe('agm-2026')
  })

  it('rejects too short', () => {
    expect(normalizeElectionSlugInput('a')).toBe(null)
  })

  it('rejects empty', () => {
    expect(normalizeElectionSlugInput('!!!')).toBe(null)
  })
})
