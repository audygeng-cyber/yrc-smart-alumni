import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * หลังมีแถว `members` ที่ผูก line_uid — ให้ `app_users` สอดคล้อง (member_id + approval_status approved)
 * ครอบคลุมกรณีเคยสร้างแถวจาก POST /app-roles ตอนยังไม่ผูกสมาชิก (pending / member_id null)
 */
export async function syncAppUserAfterMemberLink(
  supabase: SupabaseClient,
  line_uid: string,
  memberId: string,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const now = new Date().toISOString()
  const { data: existing, error: qErr } = await supabase.from('app_users').select('id').eq('line_uid', line_uid).maybeSingle()
  if (qErr) return { ok: false, error: qErr }

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from('app_users')
      .update({
        member_id: memberId,
        approval_status: 'approved',
        updated_at: now,
      })
      .eq('id', existing.id)
    if (upErr) return { ok: false, error: upErr }
    return { ok: true }
  }

  const { error: insErr } = await supabase.from('app_users').insert({
    line_uid,
    member_id: memberId,
    approval_status: 'approved',
  })
  if (!insErr) return { ok: true }

  const code = (insErr as { code?: string }).code
  const msg = String((insErr as { message?: string }).message ?? '')
  const isDup = code === '23505' || msg.includes('duplicate') || msg.includes('unique')
  if (!isDup) return { ok: false, error: insErr }

  const again = await supabase.from('app_users').select('id').eq('line_uid', line_uid).maybeSingle()
  if (again.error || !again.data?.id) return { ok: false, error: again.error ?? insErr }

  const { error: upErr2 } = await supabase
    .from('app_users')
    .update({
      member_id: memberId,
      approval_status: 'approved',
      updated_at: now,
    })
    .eq('id', again.data.id)
  if (upErr2) return { ok: false, error: upErr2 }
  return { ok: true }
}
