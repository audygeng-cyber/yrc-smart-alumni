import { financeAdminHeaders, financeAdminJsonHeaders } from './adminFinanceHttp'
import { readApiJson, type ApiJsonResult } from './adminHttp'

/** GET JSON ไป `/api/admin/finance/*` */
export async function financeAdminGetJson(
  base: string,
  pathWithQuery: string,
  adminKey: string,
): Promise<ApiJsonResult> {
  const r = await fetch(`${base}${pathWithQuery}`, { headers: financeAdminHeaders(adminKey) })
  return readApiJson(r)
}

/** POST / PATCH / DELETE JSON ไป `/api/admin/finance/*` */
export async function financeAdminJson(
  base: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  adminKey: string,
  body?: unknown,
): Promise<ApiJsonResult> {
  const headers = method === 'DELETE' ? financeAdminHeaders(adminKey) : financeAdminJsonHeaders(adminKey)
  const init: RequestInit = { method, headers }
  if (body !== undefined) init.body = JSON.stringify(body)
  const r = await fetch(`${base}${path}`, init)
  return readApiJson(r)
}
