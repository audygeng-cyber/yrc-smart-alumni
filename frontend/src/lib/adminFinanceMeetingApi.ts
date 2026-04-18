import { financeAdminHeaders } from './adminFinanceHttp'
import { readApiJson, type ApiJsonResult } from './adminHttp'

async function getJson(
  base: string,
  pathWithQuery: string,
  adminKey: string,
): Promise<ApiJsonResult> {
  const r = await fetch(`${base}${pathWithQuery}`, { headers: financeAdminHeaders(adminKey) })
  return readApiJson(r)
}

export async function fetchMeetingSessionSummary(
  base: string,
  adminKey: string,
  meetingSessionId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return getJson(base, `/api/admin/finance/meeting-sessions/${id}/summary`, adminKey)
}

export async function fetchMeetingMinutesAdmin(
  base: string,
  adminKey: string,
  meetingSessionId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(meetingSessionId.trim())
  return getJson(base, `/api/admin/finance/meeting-sessions/${id}/minutes`, adminKey)
}

/** `querySuffix` จาก `meetingAgendasQuerySuffix` */
export async function fetchMeetingAgendas(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/meeting-agendas${querySuffix}`, adminKey)
}

export async function fetchAgendaVoteSummaryAdmin(
  base: string,
  adminKey: string,
  agendaId: string,
): Promise<ApiJsonResult> {
  const id = encodeURIComponent(agendaId.trim())
  return getJson(base, `/api/admin/finance/meeting-agendas/${id}/vote-summary`, adminKey)
}

/** `querySuffix` จาก `meetingDocumentsQuerySuffix` */
export async function fetchMeetingDocumentsList(
  base: string,
  adminKey: string,
  querySuffix: string,
): Promise<ApiJsonResult> {
  return getJson(base, `/api/admin/finance/meeting-documents${querySuffix}`, adminKey)
}
