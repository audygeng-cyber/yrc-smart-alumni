import { useState, type Dispatch, type SetStateAction } from 'react'
import { fetchFinanceAdminRaw, triggerBrowserFileDownload } from '../../lib/adminFinanceDownload'
import {
  deleteMeetingDocumentAdmin,
  fetchAgendaVoteSummaryAdmin,
  fetchMeetingAgendas,
  fetchMeetingDocumentsList,
  fetchMeetingMinutesAdmin,
  fetchMeetingSessionSummary,
  patchMeetingAgenda,
  patchMeetingDocumentFields,
  patchMeetingDocumentPublish,
  postMeetingAgendaClose,
  postMeetingAgendaCreate,
  postMeetingAgendaVote,
  postMeetingDocumentCreate,
  postMeetingSessionCreate,
  postMeetingSessionMinutesPublish,
  postMeetingSessionMinutesSave,
  postMeetingSessionSignAttendance,
} from '../../lib/adminFinanceMeetingApi'
import { meetingAgendasQuerySuffix, meetingDocumentsQuerySuffix } from '../../lib/adminFinanceQueryStrings'
import type { ActivityItem, MeetingAgendaItem, MeetingDocumentItem } from '../../lib/adminFinanceTypes'
import { formatFetchError, readApiJson } from '../../lib/adminHttp'
import type { FinanceAdminMeetingColumnProps } from './FinanceAdminMeetingColumn'

type Params = {
  base: string
  adminKey: string
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  setMsg: Dispatch<SetStateAction<string | null>>
  addActivity: (level: ActivityItem['level'], message: string) => void
  setPaymentMeetingId: Dispatch<SetStateAction<string>>
}

export function useFinanceMeetingColumn({
  base,
  adminKey,
  loading,
  setLoading,
  setMsg,
  addActivity,
  setPaymentMeetingId,
}: Params): { meeting: FinanceAdminMeetingColumnProps } {
  const [meetingEntity, setMeetingEntity] = useState<'association' | 'cram_school'>('association')
  const [meetingTitle, setMeetingTitle] = useState('ประชุมพิจารณารายการจ่ายเงิน')
  const [meetingExpected, setMeetingExpected] = useState('35')
  const [meetingId, setMeetingId] = useState('')
  const [meetingSummary, setMeetingSummary] = useState<string>('')
  const [attendanceName, setAttendanceName] = useState('')
  const [attendanceRole, setAttendanceRole] = useState<'committee' | 'cram_executive'>('committee')
  const [attendanceLineUid, setAttendanceLineUid] = useState('')
  const [meetingMinutes, setMeetingMinutes] = useState('')
  const [meetingMinutesMeta, setMeetingMinutesMeta] = useState('')
  const [meetingMinutesPublished, setMeetingMinutesPublished] = useState(false)
  const [agendaTitle, setAgendaTitle] = useState('')
  const [agendaDetails, setAgendaDetails] = useState('')
  const [agendas, setAgendas] = useState<MeetingAgendaItem[]>([])
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<'all' | 'open' | 'closed'>('open')
  const [voteAgendaId, setVoteAgendaId] = useState('')
  const [agendaVoterName, setAgendaVoterName] = useState('')
  const [agendaVote, setAgendaVote] = useState<'approve' | 'reject' | 'abstain'>('approve')
  const [agendaVoteSummary, setAgendaVoteSummary] = useState('')
  const [agendaPatchId, setAgendaPatchId] = useState('')
  const [agendaPatchTitle, setAgendaPatchTitle] = useState('')
  const [agendaPatchDetails, setAgendaPatchDetails] = useState('')
  const [agendaPatchStatus, setAgendaPatchStatus] = useState<'open' | 'closed'>('open')
  const [documents, setDocuments] = useState<MeetingDocumentItem[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentText, setDocumentText] = useState('')
  const [documentAgendaId, setDocumentAgendaId] = useState('')
  const [documentMeetingId, setDocumentMeetingId] = useState('')
  const [documentPatchId, setDocumentPatchId] = useState('')
  const [documentPatchTitle, setDocumentPatchTitle] = useState('')
  const [documentPatchUrl, setDocumentPatchUrl] = useState('')
  const [documentPatchText, setDocumentPatchText] = useState('')
  const [documentPatchMeetingId, setDocumentPatchMeetingId] = useState('')
  const [documentPatchAgendaId, setDocumentPatchAgendaId] = useState('')

  async function createMeeting() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    const expected = Number(meetingExpected)
    if (!meetingTitle.trim() || !Number.isFinite(expected) || expected <= 0) {
      return setMsg('กรอกชื่อประชุม และจำนวนผู้เข้าร่วมที่คาดไว้ต้องมากกว่า 0')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingSessionCreate(base, adminKey, {
        legal_entity_code: meetingEntity,
        title: meetingTitle.trim(),
        expected_participants: expected,
        created_by: 'admin-ui',
      })
      if (!p.ok) {
        addActivity('error', `สร้างประชุมไม่สำเร็จ: ${meetingTitle.trim()}`)
        return setMsg(formatFetchError('สร้างประชุม', p.status, p.payload, p.rawText))
      }
      const j = (p.payload ?? {}) as { meetingSession?: { id?: string }; quorumRequired?: number }
      if (j.meetingSession?.id) {
        setMeetingId(j.meetingSession.id)
        setPaymentMeetingId(j.meetingSession.id)
      }
      setMsg(`สร้างประชุมแล้ว ต้องมีองค์ประชุมอย่างน้อย ${String(j.quorumRequired ?? '')} คน`)
      addActivity('info', `สร้างประชุมสำเร็จ: ${meetingTitle.trim()} (${meetingEntity})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างประชุมไม่สำเร็จ: ${meetingTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function signAttendance() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim() || !attendanceName.trim()) return setMsg('กรอกรหัสการประชุมและชื่อผู้เข้าประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingSessionSignAttendance(base, adminKey, meetingId.trim(), {
        attendee_name: attendanceName.trim(),
        attendee_role_code: attendanceRole,
        line_uid: attendanceLineUid.trim() || undefined,
      })
      if (!p.ok) {
        addActivity('error', `ลงชื่อเข้าประชุมไม่สำเร็จ: ${attendanceName.trim()}`)
        return setMsg(formatFetchError('ลงชื่อเข้าประชุม', p.status, p.payload, p.rawText))
      }
      setMsg('ลงชื่อเข้าประชุมแล้ว')
      addActivity('info', `ลงชื่อเข้าประชุมสำเร็จ: ${attendanceName.trim()} (${attendanceRole})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลงชื่อเข้าประชุมไม่สำเร็จ: ${attendanceName.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingSummary() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchMeetingSessionSummary(base, adminKey, meetingId.trim())
      if (!p.ok) return setMsg(formatFetchError('สรุปประชุม', p.status, p.payload, p.rawText))
      setMeetingSummary(JSON.stringify(p.payload, null, 2))
      setMsg('โหลดสรุปประชุมแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingMinutes() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchMeetingMinutesAdmin(base, adminKey, meetingId.trim())
      if (!p.ok) return setMsg(formatFetchError('โหลดรายงานการประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as {
        meetingSession?: {
          minutes_markdown?: string | null
          minutes_recorded_by?: string | null
          minutes_updated_at?: string | null
          minutes_published?: boolean
        }
      }
      const minutes = payload.meetingSession?.minutes_markdown
      setMeetingMinutes(typeof minutes === 'string' ? minutes : '')
      const by = payload.meetingSession?.minutes_recorded_by ?? '-'
      const at = payload.meetingSession?.minutes_updated_at ?? '-'
      const published = payload.meetingSession?.minutes_published === true
      setMeetingMinutesPublished(published)
      setMeetingMinutesMeta(`ล่าสุดโดย ${by} เมื่อ ${at} · ${published ? 'เผยแพร่แล้ว' : 'ยังไม่เผยแพร่'}`)
      setMsg('โหลดรายงานการประชุมแล้ว')
      addActivity('info', `โหลดรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `โหลดรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveMeetingMinutes() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    if (!meetingMinutes.trim()) return setMsg('กรอกบันทึกรายงานการประชุมก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingSessionMinutesSave(base, adminKey, meetingId.trim(), {
        minutes_markdown: meetingMinutes.trim(),
        minutes_recorded_by: attendanceName.trim() || 'admin-ui',
        publish_to_portal: meetingMinutesPublished,
      })
      if (!p.ok) return setMsg(formatFetchError('บันทึกรายงานการประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกรายงานการประชุมแล้ว')
      addActivity('info', `บันทึกรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
      await loadMeetingMinutes()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `บันทึกรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function downloadMeetingMinutesTxt() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetchFinanceAdminRaw(
        base,
        `/api/admin/finance/meeting-sessions/${meetingId.trim()}/minutes.txt`,
        adminKey,
      )
      if (!r.ok) {
        const p = await readApiJson(r)
        return setMsg(formatFetchError('ดาวน์โหลดรายงานการประชุม', p.status, p.payload, p.rawText))
      }
      const blob = await r.blob()
      triggerBrowserFileDownload(blob, `meeting-minutes-${meetingId.trim()}.txt`)
      setMsg('ดาวน์โหลดรายงานการประชุมแล้ว')
      addActivity('info', `ดาวน์โหลดรายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ดาวน์โหลดรายงานการประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function setMeetingMinutesPublishState(published: boolean) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!meetingId.trim()) return setMsg('กรอกรหัสการประชุม')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingSessionMinutesPublish(base, adminKey, meetingId.trim(), { published })
      if (!p.ok) return setMsg(formatFetchError('อัปเดตสถานะเผยแพร่รายงานประชุม', p.status, p.payload, p.rawText))
      setMeetingMinutesPublished(published)
      setMsg(published ? 'เผยแพร่รายงานการประชุมแล้ว' : 'ซ่อนรายงานการประชุมจากพอร์ทัลแล้ว')
      addActivity('info', `${published ? 'เผยแพร่' : 'ซ่อน'}รายงานการประชุมสำเร็จ: ${meetingId.trim()}`)
      await loadMeetingMinutes()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `อัปเดตสถานะเผยแพร่รายงานประชุมไม่สำเร็จ: ${meetingId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingAgendas() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const qs = meetingAgendasQuerySuffix({
        scope: meetingEntity,
        agendaStatusFilter,
        meetingSessionId: meetingId,
      })
      const p = await fetchMeetingAgendas(base, adminKey, qs)
      if (!p.ok) return setMsg(formatFetchError('โหลดวาระประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { agendas?: MeetingAgendaItem[] }
      setAgendas(Array.isArray(payload.agendas) ? payload.agendas : [])
      setMsg('โหลดรายการวาระประชุมแล้ว')
      addActivity('info', `โหลดวาระประชุมสำเร็จ (${meetingEntity}/${agendaStatusFilter})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดวาระประชุมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeetingAgenda() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaTitle.trim()) return setMsg('กรอกหัวข้อวาระก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingAgendaCreate(base, adminKey, {
        scope: meetingEntity,
        title: agendaTitle.trim(),
        details: agendaDetails.trim() || null,
        meeting_session_id: meetingId.trim() || null,
        created_by: 'admin-ui',
      })
      if (!p.ok) return setMsg(formatFetchError('สร้างวาระประชุม', p.status, p.payload, p.rawText))
      setAgendaTitle('')
      setAgendaDetails('')
      setMsg('สร้างวาระประชุมแล้ว')
      addActivity('info', `สร้างวาระประชุมสำเร็จ: ${agendaTitle.trim()}`)
      await loadMeetingAgendas()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `สร้างวาระประชุมไม่สำเร็จ: ${agendaTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function castAgendaVote() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!voteAgendaId.trim() || !agendaVoterName.trim()) {
      return setMsg('กรอกรหัสวาระและชื่อผู้โหวต')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingAgendaVote(base, adminKey, voteAgendaId.trim(), {
        voter_name: agendaVoterName.trim(),
        voter_role_code: attendanceRole,
        vote: agendaVote,
      })
      if (!p.ok) return setMsg(formatFetchError('ลงมติวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกผลโหวตแล้ว')
      addActivity('info', `ลงมติสำเร็จ: ${voteAgendaId.trim()} (${agendaVote})`)
      await loadAgendaVoteSummary(voteAgendaId.trim())
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลงมติไม่สำเร็จ: ${voteAgendaId.trim()} (${agendaVote})`)
    } finally {
      setLoading(false)
    }
  }

  async function loadAgendaVoteSummary(agendaId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaId.trim()) return setMsg('กรอกรหัสวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const p = await fetchAgendaVoteSummaryAdmin(base, adminKey, agendaId.trim())
      if (!p.ok) return setMsg(formatFetchError('สรุปผลโหวตวาระ', p.status, p.payload, p.rawText))
      setAgendaVoteSummary(JSON.stringify(p.payload, null, 2))
      setMsg('โหลดสรุปผลโหวตวาระแล้ว')
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function closeMeetingAgenda(agendaId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaId.trim()) return setMsg('กรอกรหัสวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingAgendaClose(base, adminKey, agendaId.trim())
      if (!p.ok) return setMsg(formatFetchError('ปิดวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('ปิดวาระประชุมแล้ว')
      addActivity('info', `ปิดวาระประชุมสำเร็จ: ${agendaId.trim()}`)
      await loadMeetingAgendas()
      await loadAgendaVoteSummary(agendaId.trim())
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ปิดวาระประชุมไม่สำเร็จ: ${agendaId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  function beginPatchMeetingAgenda(agenda: MeetingAgendaItem) {
    setAgendaPatchId(agenda.id)
    setAgendaPatchTitle(agenda.title)
    setAgendaPatchDetails(agenda.details ?? '')
    setAgendaPatchStatus(agenda.status)
    setMsg(null)
  }

  function cancelPatchMeetingAgenda() {
    setAgendaPatchId('')
    setAgendaPatchTitle('')
    setAgendaPatchDetails('')
    setAgendaPatchStatus('open')
  }

  async function savePatchMeetingAgenda() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!agendaPatchId.trim()) return setMsg('เลือกวาระที่จะแก้ไขก่อน')
    if (!agendaPatchTitle.trim()) return setMsg('กรอกหัวข้อวาระ')
    setLoading(true)
    setMsg(null)
    try {
      const p = await patchMeetingAgenda(base, adminKey, agendaPatchId.trim(), {
        title: agendaPatchTitle.trim(),
        details: agendaPatchDetails.trim() || null,
        status: agendaPatchStatus,
      })
      if (!p.ok) return setMsg(formatFetchError('แก้ไขวาระประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกการแก้ไขวาระแล้ว')
      addActivity('info', `แก้ไขวาระประชุมสำเร็จ: ${agendaPatchId.trim()}`)
      cancelPatchMeetingAgenda()
      await loadMeetingAgendas()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `แก้ไขวาระประชุมไม่สำเร็จ: ${agendaPatchId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadMeetingDocuments() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    setLoading(true)
    setMsg(null)
    try {
      const qs = meetingDocumentsQuerySuffix({
        scope: meetingEntity,
        meetingSessionId: documentMeetingId,
        agendaId: documentAgendaId,
      })
      const p = await fetchMeetingDocumentsList(base, adminKey, qs)
      if (!p.ok) return setMsg(formatFetchError('โหลดเอกสารประชุม', p.status, p.payload, p.rawText))
      const payload = (p.payload ?? {}) as { documents?: MeetingDocumentItem[] }
      setDocuments(Array.isArray(payload.documents) ? payload.documents : [])
      setMsg('โหลดเอกสารประชุมแล้ว')
      addActivity('info', `โหลดเอกสารประชุมสำเร็จ (${meetingEntity})`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', 'โหลดเอกสารประชุมไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  async function createMeetingDocument() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentTitle.trim()) return setMsg('กรอกชื่อเอกสารก่อน')
    if (!documentUrl.trim() && !documentText.trim()) {
      return setMsg('กรอกลิงก์เอกสาร หรือเนื้อหาเอกสารอย่างน้อยหนึ่งค่า')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await postMeetingDocumentCreate(base, adminKey, {
        scope: meetingEntity,
        title: documentTitle.trim(),
        meeting_session_id: documentMeetingId.trim() || null,
        agenda_id: documentAgendaId.trim() || null,
        document_url: documentUrl.trim() || null,
        document_text: documentText.trim() || null,
        uploaded_by: attendanceName.trim() || 'admin-ui',
        published_to_portal: false,
      })
      if (!p.ok) return setMsg(formatFetchError('เพิ่มเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('เพิ่มเอกสารประชุมแล้ว')
      setDocumentTitle('')
      setDocumentUrl('')
      setDocumentText('')
      addActivity('info', `เพิ่มเอกสารประชุมสำเร็จ: ${documentTitle.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `เพิ่มเอกสารประชุมไม่สำเร็จ: ${documentTitle.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function deleteMeetingDocument(documentId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const p = await deleteMeetingDocumentAdmin(base, adminKey, documentId.trim())
      if (!p.ok) return setMsg(formatFetchError('ลบเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('ลบเอกสารประชุมแล้ว')
      addActivity('warn', `ลบเอกสารประชุมสำเร็จ: ${documentId.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ลบเอกสารประชุมไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function downloadMeetingDocumentTxt(documentId: string) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const r = await fetchFinanceAdminRaw(
        base,
        `/api/admin/finance/meeting-documents/${documentId.trim()}/download.txt`,
        adminKey,
      )
      if (!r.ok) {
        const p = await readApiJson(r)
        return setMsg(formatFetchError('ดาวน์โหลดเอกสารประชุม', p.status, p.payload, p.rawText))
      }
      const blob = await r.blob()
      triggerBrowserFileDownload(blob, `meeting-document-${documentId.trim()}.txt`)
      setMsg('ดาวน์โหลดเอกสารประชุมแล้ว')
      addActivity('info', `ดาวน์โหลดเอกสารประชุมสำเร็จ: ${documentId.trim()}`)
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `ดาวน์โหลดเอกสารประชุมไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  async function toggleMeetingDocumentPublished(documentId: string, nextPublished: boolean) {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentId.trim()) return setMsg('ต้องมีรหัสเอกสาร')
    setLoading(true)
    setMsg(null)
    try {
      const p = await patchMeetingDocumentPublish(base, adminKey, documentId.trim(), {
        published_to_portal: nextPublished,
      })
      if (!p.ok) return setMsg(formatFetchError('อัปเดตสถานะเผยแพร่เอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg(nextPublished ? 'เผยแพร่เอกสารประชุมแล้ว' : 'ซ่อนเอกสารประชุมจากพอร์ทัลแล้ว')
      addActivity('info', `${nextPublished ? 'เผยแพร่' : 'ซ่อน'}เอกสารประชุมสำเร็จ: ${documentId.trim()}`)
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `อัปเดตสถานะเผยแพร่เอกสารไม่สำเร็จ: ${documentId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  function beginPatchMeetingDocument(doc: MeetingDocumentItem) {
    setDocumentPatchId(doc.id)
    setDocumentPatchTitle(doc.title)
    setDocumentPatchUrl(doc.document_url ?? '')
    setDocumentPatchText(doc.document_text ?? '')
    setDocumentPatchMeetingId(doc.meeting_session_id ?? '')
    setDocumentPatchAgendaId(doc.agenda_id ?? '')
    setMsg(null)
  }

  function cancelPatchMeetingDocument() {
    setDocumentPatchId('')
    setDocumentPatchTitle('')
    setDocumentPatchUrl('')
    setDocumentPatchText('')
    setDocumentPatchMeetingId('')
    setDocumentPatchAgendaId('')
  }

  async function savePatchMeetingDocument() {
    if (!adminKey.trim()) return setMsg('ใส่ Admin key ก่อน')
    if (!documentPatchId.trim()) return setMsg('เลือกเอกสารที่จะแก้ไขก่อน')
    if (!documentPatchTitle.trim()) return setMsg('กรอกชื่อเอกสาร')
    const urlT = documentPatchUrl.trim()
    const textT = documentPatchText.trim()
    if (!urlT && !textT) {
      return setMsg('ต้องมีลิงก์เอกสารหรือเนื้อหาอย่างน้อยหนึ่งค่า (ตรงกับกติกาตอนสร้างเอกสาร)')
    }
    setLoading(true)
    setMsg(null)
    try {
      const p = await patchMeetingDocumentFields(base, adminKey, documentPatchId.trim(), {
        title: documentPatchTitle.trim(),
        document_url: urlT || null,
        document_text: textT || null,
        meeting_session_id: documentPatchMeetingId.trim() || null,
        agenda_id: documentPatchAgendaId.trim() || null,
      })
      if (!p.ok) return setMsg(formatFetchError('แก้ไขเอกสารประชุม', p.status, p.payload, p.rawText))
      setMsg('บันทึกการแก้ไขเอกสารแล้ว')
      addActivity('info', `แก้ไขเอกสารประชุมสำเร็จ: ${documentPatchId.trim()}`)
      cancelPatchMeetingDocument()
      await loadMeetingDocuments()
    } catch {
      setMsg('เรียก API ไม่สำเร็จ')
      addActivity('error', `แก้ไขเอกสารประชุมไม่สำเร็จ: ${documentPatchId.trim()}`)
    } finally {
      setLoading(false)
    }
  }

  const meeting: FinanceAdminMeetingColumnProps = {
    loading,
    meetingEntity,
    setMeetingEntity,
    meetingTitle,
    setMeetingTitle,
    meetingExpected,
    setMeetingExpected,
    onCreateMeeting: createMeeting,
    meetingId,
    setMeetingId,
    attendanceName,
    setAttendanceName,
    attendanceRole,
    setAttendanceRole,
    attendanceLineUid,
    setAttendanceLineUid,
    onSignAttendance: signAttendance,
    onLoadMeetingSummary: loadMeetingSummary,
    onLoadMeetingMinutes: loadMeetingMinutes,
    meetingSummary,
    meetingMinutesMeta,
    meetingMinutes,
    setMeetingMinutes,
    onSaveMeetingMinutes: saveMeetingMinutes,
    onDownloadMeetingMinutesTxt: downloadMeetingMinutesTxt,
    onPublishMinutes: () => void setMeetingMinutesPublishState(true),
    onUnpublishMinutes: () => void setMeetingMinutesPublishState(false),
    meetingMinutesPublished,
    agendas,
    agendaTitle,
    setAgendaTitle,
    agendaDetails,
    setAgendaDetails,
    onCreateMeetingAgenda: createMeetingAgenda,
    agendaStatusFilter,
    setAgendaStatusFilter,
    onLoadMeetingAgendas: loadMeetingAgendas,
    onSelectAgendaForSummary: (agenda) => {
      setVoteAgendaId(agenda.id)
      void loadAgendaVoteSummary(agenda.id)
    },
    onCloseMeetingAgenda: closeMeetingAgenda,
    onBeginPatchMeetingAgenda: beginPatchMeetingAgenda,
    agendaPatchId,
    agendaPatchTitle,
    setAgendaPatchTitle,
    agendaPatchDetails,
    setAgendaPatchDetails,
    agendaPatchStatus,
    setAgendaPatchStatus,
    onSavePatchMeetingAgenda: () => void savePatchMeetingAgenda(),
    onCancelPatchMeetingAgenda: cancelPatchMeetingAgenda,
    voteAgendaId,
    setVoteAgendaId,
    agendaVoterName,
    setAgendaVoterName,
    agendaVote,
    setAgendaVote,
    onCastAgendaVote: castAgendaVote,
    agendaVoteSummary,
    documents,
    documentTitle,
    setDocumentTitle,
    documentMeetingId,
    setDocumentMeetingId,
    documentAgendaId,
    setDocumentAgendaId,
    documentUrl,
    setDocumentUrl,
    documentText,
    setDocumentText,
    onCreateMeetingDocument: createMeetingDocument,
    onLoadMeetingDocuments: loadMeetingDocuments,
    onDownloadMeetingDocumentTxt: downloadMeetingDocumentTxt,
    onToggleMeetingDocumentPublished: toggleMeetingDocumentPublished,
    onBeginPatchMeetingDocument: beginPatchMeetingDocument,
    onDeleteMeetingDocument: deleteMeetingDocument,
    documentPatchId,
    documentPatchTitle,
    setDocumentPatchTitle,
    documentPatchMeetingId,
    setDocumentPatchMeetingId,
    documentPatchAgendaId,
    setDocumentPatchAgendaId,
    documentPatchUrl,
    setDocumentPatchUrl,
    documentPatchText,
    setDocumentPatchText,
    onSavePatchMeetingDocument: () => void savePatchMeetingDocument(),
    onCancelPatchMeetingDocument: cancelPatchMeetingDocument,
  }

  return { meeting }
}
