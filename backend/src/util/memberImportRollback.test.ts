import { describe, expect, it, vi } from 'vitest'
import { rollbackFailedMemberImport } from './memberImportRollback.js'

describe('rollbackFailedMemberImport', () => {
  it('deletes members by import_batch_id then import_batches row', async () => {
    const deleteBatchEq = vi.fn().mockResolvedValue({ error: null })
    const deleteBatch = vi.fn().mockReturnValue({ eq: deleteBatchEq })
    const deleteMembersEq = vi.fn().mockResolvedValue({ error: null })
    const deleteMembers = vi.fn().mockReturnValue({ eq: deleteMembersEq })
    const from = vi.fn((table: string) => {
      if (table === 'members') return { delete: deleteMembers }
      if (table === 'import_batches') return { delete: deleteBatch }
      throw new Error(table)
    })
    const supabase = { from } as import('@supabase/supabase-js').SupabaseClient

    const res = await rollbackFailedMemberImport(supabase, 'batch-uuid-1')
    expect(res.error).toBeNull()
    expect(deleteMembers).toHaveBeenCalled()
    expect(deleteMembersEq).toHaveBeenCalledWith('import_batch_id', 'batch-uuid-1')
    expect(deleteBatchEq).toHaveBeenCalledWith('id', 'batch-uuid-1')
  })

  it('returns error when members delete fails', async () => {
    const deleteMembersEq = vi.fn().mockResolvedValue({ error: { message: 'rls' } })
    const from = vi.fn(() => ({ delete: () => ({ eq: deleteMembersEq }) }))
    const supabase = { from } as import('@supabase/supabase-js').SupabaseClient
    const res = await rollbackFailedMemberImport(supabase, 'x')
    expect(res.error).toBe('rls')
  })
})
