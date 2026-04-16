/**
 * องค์ประชุม: 2/3 ของจำนวนผู้มีสิทธิ์เข้าร่วม
 */
export function quorumRequired(expectedParticipants: number): number {
  if (!Number.isFinite(expectedParticipants) || expectedParticipants <= 0) {
    throw new Error('expectedParticipants must be positive number')
  }
  return Math.ceil((2 * expectedParticipants) / 3)
}

/**
 * มติผ่าน: เสียงเห็นชอบมากกว่ากึ่งหนึ่งของผู้เข้าร่วมประชุม
 */
export function majorityRequired(attendees: number): number {
  if (!Number.isFinite(attendees) || attendees <= 0) {
    throw new Error('attendees must be positive number')
  }
  return Math.floor(attendees / 2) + 1
}
