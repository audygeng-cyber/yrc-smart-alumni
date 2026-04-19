/** จำนวนกรรมการเต็มชุดตามธรรมนู — ใช้เป็นฐานคำนวณองค์ประชุม 2/3 */
export const COMMITTEE_FULL_MEMBERS = 35

/**
 * องค์ประชุม: 2/3 ของจำนวนผู้มีสิทธิ์เข้าร่วม (พารามิเตอร์)
 */
export function quorumRequired(expectedParticipants: number): number {
  if (!Number.isFinite(expectedParticipants) || expectedParticipants <= 0) {
    throw new Error('expectedParticipants must be positive number')
  }
  return Math.ceil((2 * expectedParticipants) / 3)
}

/**
 * องค์ประชุมคณะกรรมการ: 2/3 ของจำนวนกรรมการเต็มชุด (35 คน) — ไม่ผูกกับจำนวนที่คาดในรอบนั้น
 */
export function committeeQuorumRequired(): number {
  return quorumRequired(COMMITTEE_FULL_MEMBERS)
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

/**
 * กติกาประชุมคณะกรรมการ: องค์ประชุมจาก 2/3×35; มติผ่านจากเสียงเห็นชอบ > กึ่งหนึ่งของผู้เข้าประชุมจริง
 */
export function committeeMotionOutcome(attendeesPresent: number, approveVotes: number): {
  quorumRequired: number
  quorumMet: boolean
  majorityRequired: number
  approvedByVote: boolean
} {
  const quorumNeed = committeeQuorumRequired()
  const quorumMet = attendeesPresent >= quorumNeed
  const majorityNeed = attendeesPresent > 0 ? majorityRequired(attendeesPresent) : 0
  const approvedByVote = quorumMet && majorityNeed > 0 && approveVotes >= majorityNeed
  return {
    quorumRequired: quorumNeed,
    quorumMet,
    majorityRequired: majorityNeed,
    approvedByVote,
  }
}
