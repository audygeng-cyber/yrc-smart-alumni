import { financeAdminGetJson, financeAdminJson } from './adminFinanceJsonFetch'
import type { ApiJsonResult } from './adminHttp'

export async function fetchMeetingSessionSummary(
  base: string,
  adminKey: string,
  meetingSessionId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return financeAdminGetJson(base, `/api/admin/finance/meeting-sessions/${id}/summary`, adminKey)
}

export async function fetchMeetingMinutesAdmin(
  base: string,
  adminKey: string,
  meetingSessionId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return financeAdminGetJson(base, `/api/admin/finance/meeting-sessions/${id}/minutes`, adminKey)
}

/** `querySuffix` จาก `meetingAgendasQuerySuffix` */
export async function fetchMeetingAgendas(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return financeAdminGetJson(base, `/api/admin/finance/meeting-agendas${querySuffix}`, adminKey)
}

export async function fetchAgendaVoteSummaryAdmin(
  base: string,
  adminKey: string,
  agendaId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(agendaId.trim())
  return financeAdminGetJson(base, `/api/admin/finance/meeting-agendas/${id}/vote-summary`, adminKey)
}

/** `querySuffix` จาก `meetingDocumentsQuerySuffix` */
export async function fetchMeetingDocumentsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return financeAdminGetJson(base, `/api/admin/finance/meeting-documents${querySuffix}`, adminKey)
}

// --- Mutations (POST / PATCH / DELETE) — ใช้ใน AdminFinancePanel ---

export async function postMeetingSessionCreate(
  base: string,
  adminKey: string,
  body: {
    legal_entity_code: string
    title: string
    expected_participants: number
    created_by: string
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/meeting-sessions', adminKey, body)
}

export async function postMeetingSessionSignAttendance(
  base: string,
  adminKey: string,
  meetingSessionId: string,
  body: { attendee_name: string; attendee_role_code: string; line_uid?: string },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/meeting-sessions/${id}/sign-attendance`, adminKey, body)
}

export async function postMeetingSessionMinutesSave(
  base: string,
  adminKey: string,
  meetingSessionId: string,
  body: { minutes_markdown: string; minutes_recorded_by: string; publish_to_portal: boolean },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/meeting-sessions/${id}/minutes`, adminKey, body)
}

export async function postMeetingSessionMinutesPublish(
  base: string,
  adminKey: string,
  meetingSessionId: string,
  body: { published: boolean },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/meeting-sessions/${id}/minutes/publish`, adminKey, body)
}

export async function postMeetingAgendaCreate(
  base: string,
  adminKey: string,
  body: {
    scope: string
    title: string
    details: string | null
    meeting_session_id: string | null
    created_by: string
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/meeting-agendas', adminKey, body)
}

export async function postMeetingAgendaVote(
  base: string,
  adminKey: string,
  agendaId: string,
  body: { voter_name: string; voter_role_code: string; vote: string },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(agendaId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/meeting-agendas/${id}/votes`, adminKey, body)
}

export async function postMeetingAgendaClose(base: string, adminKey: string, agendaId: string): Promise<ApiJsonResult> {
  const id = encodeURIComponent(agendaId.trim())
  return financeAdminJson(base, 'POST', `/api/admin/finance/meeting-agendas/${id}/close`, adminKey)
}

export async function patchMeetingAgenda(
  base: string,
  adminKey: string,
  agendaId: string,
  body: { title: string; details: string | null; status: string },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(agendaId.trim())
  return financeAdminJson(base, 'PATCH', `/api/admin/finance/meeting-agendas/${id}`, adminKey, body)
}

export async function postMeetingDocumentCreate(
  base: string,
  adminKey: string,
  body: {
    scope: string
    title: string
    meeting_session_id: string | null
    agenda_id: string | null
    document_url: string | null
    document_text: string | null
    uploaded_by: string
    published_to_portal: boolean
  },
): Promise<ApiJsonResult> {
  return financeAdminJson(base, 'POST', '/api/admin/finance/meeting-documents', adminKey, body)
}

export async function deleteMeetingDocumentAdmin(
  base: string,
  adminKey: string,
  documentId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(documentId.trim())
  return financeAdminJson(base, 'DELETE', `/api/admin/finance/meeting-documents/${id}`, adminKey)
}

export async function patchMeetingDocumentPublish(
  base: string,
  adminKey: string,
  documentId: string,
  body: { published_to_portal: boolean },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(documentId.trim())
  return financeAdminJson(base, 'PATCH', `/api/admin/finance/meeting-documents/${id}`, adminKey, body)
}

export async function patchMeetingDocumentFields(
  base: string,
  adminKey: string,
  documentId: string,
  body: {
    title: string
    document_url: string | null
    document_text: string | null
    meeting_session_id: string | null
    agenda_id: string | null
  },
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(documentId.trim())
  return financeAdminJson(base, 'PATCH', `/api/admin/finance/meeting-documents/${id}`, adminKey, body)
}
