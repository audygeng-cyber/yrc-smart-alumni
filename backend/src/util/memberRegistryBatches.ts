import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeWhitespace } from './normalize.js'

const PAGE = 800

export function sortMemberBatchLabels(a: string, b: string): number {
  return a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })
}

/**
 * รายการรุ่นไม่ซ้ำจาก `members` — ใช้ RPC `list_distinct_member_batches` ถ้ามี migration;
 * ถ้าไม่มีฟังก์ชัน (เช่น DB เก่า) จะสแกนแบบแบ่งหน้า
 */
export async function fetchDistinctMemberBatches(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_distinct_member_batches')
  if (!error && Array.isArray(data)) {
    const out = data
      .map((x) => (typeof x === 'string' ? normalizeWhitespace(x) : ''))
      .filter((s) => s.length > 0)
    out.sort(sortMemberBatchLabels)
    return out
  }

  const set = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error: pageErr } = await supabase
      .from('members')
      .select('batch')
      .not('batch', 'is', null)
      .range(from, from + PAGE - 1)
    if (pageErr) throw pageErr
    const list = rows ?? []
    for (const r of list) {
      const raw = (r as { batch?: unknown }).batch
      if (raw == null) continue
      const b = normalizeWhitespace(String(raw))
      if (b) set.add(b)
    }
    if (list.length < PAGE) break
  }
  const out = [...set]
  out.sort(sortMemberBatchLabels)
  return out
}
