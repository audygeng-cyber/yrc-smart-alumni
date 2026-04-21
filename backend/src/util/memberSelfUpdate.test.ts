import { describe, expect, it } from 'vitest'
import { mergeMemberProfileSnapshot, parseMemberSelfUpdates } from './memberSelfUpdate.js'

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

  it('maps photo URL header', () => {
    const u = parseMemberSelfUpdates({ 'รูปโปรไฟล์ (URL)': ' https://x.test/a.png ' })
    expect(u.photo_url).toBe('https://x.test/a.png')
  })
})

describe('mergeMemberProfileSnapshot', () => {
  it('merges updates over current row', () => {
    const snap = mergeMemberProfileSnapshot(
      { phone: '080', email: 'a@b.co', photo_url: null } as Record<string, unknown>,
      { phone: '081' },
    )
    expect(snap.phone).toBe('081')
    expect(snap.email).toBe('a@b.co')
  })
})
