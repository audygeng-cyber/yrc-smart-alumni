/**
 * Milliseconds until the next local wall-clock hour boundary
 * (e.g. 10:23:45 → time until 11:00:00.000).
 */
export function msUntilNextHour(now: Date = new Date()): number {
  const next = new Date(now.getTime())
  next.setHours(next.getHours() + 1, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}
