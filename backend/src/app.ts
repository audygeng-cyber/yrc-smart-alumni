import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { adminAuth } from './middleware/adminAuth.js'
import { cramAdminRouter } from './routes/cramAdmin.js'
import { schoolActivitiesAdminRouter } from './routes/schoolActivitiesAdmin.js'
import { financeAdminRouter } from './routes/financeAdmin.js'
import { appRolesAdminRouter } from './routes/appRolesAdmin.js'
import { importMembersRouter } from './routes/importMembers.js'
import { importTemplateRouter } from './routes/importTemplate.js'
import { lineAuthRouter } from './routes/lineAuth.js'
import { memberRequestsAdminRouter } from './routes/memberRequestsAdmin.js'
import { membersRouter } from './routes/members.js'
import { portalRouter } from './routes/portal.js'
import { pushRouter } from './routes/push.js'

/** ลบ slash ท้าย + lowercase — เปรียบเทียบ Origin จากเบราว์เซอร์กับ FRONTEND_ORIGINS */
function normalizeCorsOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '').toLowerCase()
}

function parseCorsOriginsNormalized(): string[] {
  const raw = process.env.FRONTEND_ORIGINS?.trim()
  if (!raw) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'].map(normalizeCorsOrigin)
  }
  return raw
    .split(',')
    .map((s) => normalizeCorsOrigin(s.trim()))
    .filter(Boolean)
}

/**
 * อนุญาต https://*.vercel.app ทุกตัว (preview / branch deploy คนละ subdomain กับ production)
 * - เปิดอัตโนมัติถ้า FRONTEND_ORIGINS มี origin ที่เป็น .vercel.app อยู่แล้ว
 * - บังคับปิด: FRONTEND_CORS_ALLOW_VERCEL=0 | false | no
 * - บังคับเปิดแม้ไม่มี vercel ใน list: FRONTEND_CORS_ALLOW_VERCEL=1
 */
function corsAllowsAnyVercelHttps(): boolean {
  const v = process.env.FRONTEND_CORS_ALLOW_VERCEL?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  if (v === '1' || v === 'true' || v === 'yes') return true
  return parseCorsOriginsNormalized().some((o) => o.includes('.vercel.app'))
}

function isHttpsVercelAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.protocol === 'https:' && u.hostname.toLowerCase().endsWith('.vercel.app')
  } catch {
    return false
  }
}

function createCorsOriginDelegate(): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
) => void {
  const allowed = new Set(parseCorsOriginsNormalized())
  const relaxVercel = corsAllowsAnyVercelHttps()
  return (requestOrigin, callback) => {
    if (!requestOrigin) {
      callback(null, true)
      return
    }
    const key = normalizeCorsOrigin(requestOrigin)
    if (allowed.has(key)) {
      callback(null, requestOrigin)
      return
    }
    if (relaxVercel && isHttpsVercelAppOrigin(requestOrigin)) {
      callback(null, requestOrigin)
      return
    }
    callback(null, false)
  }
}

/** Express app (ไม่ listen) — ใช้ในเทสและ production */
export function createApp(): express.Express {
  const app = express()

  app.set('trust proxy', 1)

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors({
      origin: createCorsOriginDelegate(),
      credentials: true,
    }),
  )
  app.use(express.json())

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'yrc-smart-alumni-api',
      message: 'Backend API — ไม่มีหน้าเว็บที่ / ใช้ path ด้านล่าง',
      paths: {
        health: '/health',
        lineOAuthState: 'GET|POST /api/auth/line/oauth-state',
        lineToken: 'POST /api/auth/line/token',
        membersVerify:
          'POST /api/members/verify-link — ผูก LINE กับสมาชิก + sync app_users (member_id, approved)',
        membersSession: 'POST /api/members/session-member (line_uid — โหลดสมาชิกที่ผูกไว้แล้วสำหรับกู้เซสชัน)',
        membersAppRoles:
          'POST /api/members/app-roles (line_uid, entry_source?) — app_users + roles + entry; sync member_id/approved ถ้าผูกสมาชิกแล้วแต่แถวค้าง',
        membersDonations:
          'POST /api/members/donations (line_uid + activity_id + amount — บริจาคกิจกรรม) | POST /api/members/donations/history (line_uid — ประวัติการบริจาค) | GET /api/members/donations/yupparaj-stats (สถิติกองยุพราชสาธารณะ)',
        membersRequestStatus: 'POST /api/members/request-status (line_uid — ดูคำร้องล่าสุดของสมาชิก)',
        membersUpdateSelf:
          'POST /api/members/update-self (line_uid + updates — หลังผูกแล้ว; บันทึก member_profile_versions) | POST /api/members/profile-photo (multipart: line_uid + photo) | GET /api/members/profile-versions?line_uid=…',
        membersRegister: 'POST /api/members/register-request',
        importTemplates:
          'GET /api/admin/members/import-template.csv | import-template.xlsx (ไม่ต้องมี key)',
        adminImport: 'POST /api/admin/members/import (ต้องใช้ Admin key: x-admin-key)',
        adminImportSummary:
          'GET /api/admin/members/summary?importBatchId=... (ต้องใช้ Admin key: x-admin-key)',
        finance:
          'GET /api/admin/finance/overview | bank-accounts | payment-requests | payment-requests/:id | journals | journals/:id | fixed-assets | fiscal-years | reports/pl-summary | reports/donations | reports/trial-balance | reports/general-ledger | reports/income-statement | reports/balance-sheet | reports/tax-monthly | exports/donations.csv | exports/payment-requests.csv | exports/meeting-sessions.csv | exports/auditor-package.csv | period-closing | period-closing/:id | period-closing/:id/auditor-package.csv | meeting-agendas | meeting-agendas/:id/vote-summary | meeting-sessions/:id/minutes | meeting-sessions/:id/minutes.txt | meeting-documents | meeting-documents/:id/download.txt (รองรับ query: legal_entity_code, from, to, scope, status, meeting_session_id, agenda_id, limit, auditor_handoff_status), POST /api/admin/finance/payment-requests | payment-requests/:id/approve | journals | journals/:id/lines | journals/:id/post | journals/:id/void | fixed-assets | fixed-assets/run-depreciation | fiscal-years | fiscal-years/:id/close | tax/calculate | period-closing | period-closing/:id/mark-auditor-sent | period-closing/:id/mark-auditor-completed | meeting-sessions | meeting-sessions/:id/sign-attendance | meeting-sessions/:id/minutes | meeting-sessions/:id/minutes/publish | meeting-agendas | meeting-agendas/:id/votes | meeting-agendas/:id/close | meeting-documents, PATCH /api/admin/finance/payment-requests/:id | meeting-agendas/:id | meeting-documents/:id, DELETE /api/admin/finance/meeting-documents/:id',
        memberRequests:
          'GET /api/admin/member-requests (Admin key: x-admin-key) — president-approve/reject ใช้ x-president-key หรือ x-admin-key',
        push: 'GET /api/push/vapid-public, POST /api/push/subscribe',
        portal:
          'GET /api/portal/member | /api/portal/committee | /api/portal/academy | /api/portal/committee/documents/:id/download.txt | /api/portal/committee/meetings/:id/minutes.txt | /api/portal/committee/meetings/:sessionId/rsvp-summary | /api/portal/committee/agendas/:id/vote-summary, POST /api/portal/committee/agendas/:id/vote | POST /api/portal/committee/meetings/:sessionId/rsvp — พอร์ทัล',
        adminMemberRoles:
          'PATCH /api/admin/members/app-roles/:memberId (x-admin-key) — committee / payment_approver',
        cramSchool:
          'GET/POST/PATCH /api/admin/cram/classrooms, GET/POST/PATCH/DELETE /api/admin/cram/students (Admin key: x-admin-key) — ห้อง/นักเรียนกวดวิชา',
        schoolActivities:
          'GET/POST/PATCH/DELETE /api/admin/school-activities (กิจกรรมโรงเรียน / school_activities) | GET …/donations/summary | GET …/yupparaj-export.csv (Admin key: x-admin-key)',
      },
    })
  })

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'yrc-smart-alumni-api' })
  })

  const membersPublicLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })

  const lineOAuthLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use('/api/auth/line', lineOAuthLimit, lineAuthRouter)
  app.use('/api/portal', membersPublicLimit, portalRouter)
  app.use('/api/push', pushRouter)
  app.use('/api/admin/member-requests', memberRequestsAdminRouter)
  app.use('/api/admin/finance', adminAuth, financeAdminRouter)
  app.use('/api/admin/cram', adminAuth, cramAdminRouter)
  app.use('/api/admin/school-activities', adminAuth, schoolActivitiesAdminRouter)
  app.use('/api/admin/members', importTemplateRouter)
  app.use('/api/admin/members', adminAuth, importMembersRouter)
  app.use('/api/admin/members', adminAuth, appRolesAdminRouter)
  app.use('/api/members', membersPublicLimit, membersRouter)

  return app
}
