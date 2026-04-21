import { describe, expect, it } from 'vitest'
import { parseStoragePublicObjectPath } from './memberProfilePhotoStorage.js'

describe('parseStoragePublicObjectPath', () => {
  it('parses Supabase public object URL', () => {
    const url =
      'https://abc.supabase.co/storage/v1/object/public/member-profile-photos/mid/uuid.jpg'
    expect(parseStoragePublicObjectPath(url, 'member-profile-photos')).toBe('mid/uuid.jpg')
  })

  it('decodes encoded path segments', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/member-profile-photos/a%2Fb/c.jpg'
    expect(parseStoragePublicObjectPath(url, 'member-profile-photos')).toBe('a/b/c.jpg')
  })

  it('returns null for wrong bucket or external URL', () => {
    expect(parseStoragePublicObjectPath('https://cdn.example.com/a.jpg', 'member-profile-photos')).toBeNull()
    expect(
      parseStoragePublicObjectPath(
        'https://x.supabase.co/storage/v1/object/public/other-bucket/x.jpg',
        'member-profile-photos',
      ),
    ).toBeNull()
  })
})
