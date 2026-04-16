export type MemberRequestActionType =
  | 'submitted'
  | 'president_approved'
  | 'admin_approved'
  | 'rejected'

export type MemberRequestHistoryEntry = {
  action: MemberRequestActionType
  actor: string
  at: string
  comment: string | null
  from_status: string | null
  to_status: string | null
}

type EntryInput = {
  action: MemberRequestActionType
  actor: string
  at?: string
  comment?: string | null
  fromStatus?: string | null
  toStatus?: string | null
}

export function buildMemberRequestHistoryEntry(input: EntryInput): MemberRequestHistoryEntry {
  return {
    action: input.action,
    actor: input.actor.trim() || 'system',
    at: input.at ?? new Date().toISOString(),
    comment: normalizeComment(input.comment),
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
  }
}

export function appendMemberRequestHistory(
  rawHistory: unknown,
  entry: MemberRequestHistoryEntry,
): MemberRequestHistoryEntry[] {
  return [...readMemberRequestHistory(rawHistory), entry]
}

export function readMemberRequestHistory(rawHistory: unknown): MemberRequestHistoryEntry[] {
  if (!Array.isArray(rawHistory)) return []

  return rawHistory.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []

    const row = entry as Record<string, unknown>
    const action = row.action
    const actor = row.actor
    const at = row.at

    if (!isActionType(action) || typeof actor !== 'string' || typeof at !== 'string') return []

    return [
      {
        action,
        actor,
        at,
        comment: normalizeComment(row.comment),
        from_status: typeof row.from_status === 'string' ? row.from_status : null,
        to_status: typeof row.to_status === 'string' ? row.to_status : null,
      },
    ]
  })
}

function normalizeComment(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function isActionType(value: unknown): value is MemberRequestActionType {
  return (
    value === 'submitted' ||
    value === 'president_approved' ||
    value === 'admin_approved' ||
    value === 'rejected'
  )
}
