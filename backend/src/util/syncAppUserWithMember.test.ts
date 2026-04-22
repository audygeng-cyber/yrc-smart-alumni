import { describe, expect, it, vi } from 'vitest'
import { rollbackSyncedMemberRegistration } from './syncAppUserWithMember.js'

describe('rollbackSyncedMemberRegistration', () => {
  it('updates app_users for line_uid+member_id then deletes members row', async () => {
    const updateEq2 = vi.fn().mockResolvedValue({ error: null })
    const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 })
    const update = vi.fn().mockReturnValue({ eq: updateEq1 })
    const deleteEq = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn().mockReturnValue({ eq: deleteEq })
    const from = vi.fn((table: string) => {
      if (table === 'app_users') return { update }
      if (table === 'members') return { delete: del }
      throw new Error(`unexpected table ${table}`)
    })
    const supabase = { from } as import('@supabase/supabase-js').SupabaseClient

    const res = await rollbackSyncedMemberRegistration(supabase, '  U123  ', 'm1-uuid')

    expect(res.error).toBeNull()
    expect(from).toHaveBeenCalledWith('app_users')
    expect(from).toHaveBeenCalledWith('members')
    expect(update).toHaveBeenCalledWith({
      member_id: null,
      approval_status: 'pending',
      updated_at: expect.any(String),
    })
    expect(updateEq1).toHaveBeenCalledWith('line_uid', 'U123')
    expect(updateEq2).toHaveBeenCalledWith('member_id', 'm1-uuid')
    expect(del).toHaveBeenCalled()
    expect(deleteEq).toHaveBeenCalledWith('id', 'm1-uuid')
  })

  it('returns error when app_users update fails', async () => {
    const updateEq2 = vi.fn().mockResolvedValue({ error: { message: 'db down' } })
    const updateEq1 = vi.fn().mockReturnValue({ eq: updateEq2 })
    const update = vi.fn().mockReturnValue({ eq: updateEq1 })
    const from = vi.fn(() => ({ update }))
    const supabase = { from } as import('@supabase/supabase-js').SupabaseClient

    const res = await rollbackSyncedMemberRegistration(supabase, 'u', 'mid')
    expect(res.error?.message).toBe('db down')
  })
})
