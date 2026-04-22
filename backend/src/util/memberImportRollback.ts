import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ลบสมาชิกที่ผูก `import_batch_id` นี้ (แถวใน `member_distinctions` cascade ตาม FK)
 * แล้วลบแถว `import_batches` — ใช้เมื่อ POST /import ล้มหลังสร้าง batch แล้ว
 */
export async function rollbackFailedMemberImport(
  supabase: SupabaseClient,
  importBatchId: string,
): Promise<{ error: string | null }> {
  const { error: mErr } = await supabase.from('members').delete().eq('import_batch_id', importBatchId)
  if (mErr) return { error: mErr.message }
  const { error: bErr } = await supabase.from('import_batches').delete().eq('id', importBatchId)
  if (bErr) return { error: bErr.message }
  return { error: null }
}
