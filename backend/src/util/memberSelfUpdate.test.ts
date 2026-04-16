import { describe, expect, it } from 'vitest'
import { parseMemberSelfUpdates } from './memberSelfUpdate.js'

describe('parseMemberSelfUpdates', () => {
  it('maps Thai headers and ignores locked identity fields', () => {
    const u = parseMemberSelfUpdates({
      เบอร์โทรศัพท์: ' 081 ',
      รุ่น: '999',
      ชื่อ: 'X',
      อีเมล์: 'a@b.co',
    })
    expect(u.phone).toBe('081')
    expect(u.email).toBe('a@b.co')
    expect(u.batch).toBeUndefined()
    expect(u.first_name).toBeUndefined()
  })

  it('returns empty when only locked fields', () => {
    const u = parseMemberSelfUpdates({ รุ่น: '1', ชื่อ: 'A', นามสกุล: 'B' })
    expect(Object.keys(u).length).toBe(0)
  })
})
