import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.js'

describe.sequential('createApp', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    delete process.env.FRONTEND_ORIGINS
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.FRONTEND_ORIGINS
  })

  it('GET /health returns ok', async () => {
    const app = createApp()
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, service: 'yrc-smart-alumni-api' })
  })

  it('GET / lists API paths', async () => {
    const app = createApp()
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.paths?.health).toBe('/health')
    expect(String(res.body.paths?.adminMemberRoles ?? '')).toContain('app-roles')
    expect(String(res.body.paths?.portal ?? '')).toContain('rsvp-summary')
  })

  it('POST /api/members/donations/history returns 400 without line_uid', async () => {
    const app = createApp()
    const res = await request(app).post('/api/members/donations/history').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('GET /api/members/donations/yupparaj-stats returns stats payload when Supabase is configured', async () => {
    const app = createApp()
    const res = await request(app).get('/api/members/donations/yupparaj-stats')
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      expect(res.status).toBe(500)
      expect(res.body.error).toBeDefined()
      return
    }
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.totalAmount).toBe('number')
    expect(typeof res.body.donationCount).toBe('number')
    expect(Array.isArray(res.body.byActivity)).toBe(true)
    expect(Array.isArray(res.body.byBatch)).toBe(true)
    expect(Array.isArray(res.body.donors)).toBe(true)
  })

  it('POST /api/members/profile-photo returns 400 without line_uid', async () => {
    const app = createApp()
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const res = await request(app)
      .post('/api/members/profile-photo')
      .attach('photo', buf, { filename: 'x.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('POST /api/members/profile-photo returns 400 without file', async () => {
    const app = createApp()
    const res = await request(app).post('/api/members/profile-photo').field('line_uid', 'Utest_line')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('GET /api/members/profile-versions returns 400 without line_uid', async () => {
    const app = createApp()
    const res = await request(app).get('/api/members/profile-versions')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('GET /api/members/profile-versions returns payload or error when Supabase configured', async () => {
    const app = createApp()
    const res = await request(app).get('/api/members/profile-versions').query({ line_uid: 'Utest_not_linked' })
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      expect(res.status).toBe(500)
      expect(res.body.error).toBeDefined()
      return
    }
    expect([403, 200]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.ok).toBe(true)
      expect(Array.isArray(res.body.versions)).toBe(true)
    }
  })

  it('POST /api/members/app-roles returns 400 without line_uid', async () => {
    const app = createApp()
    const res = await request(app).post('/api/members/app-roles').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('GET /api/portal/member returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/member')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.statsCards)).toBe(true)
    expect(res.body.roleCards?.member?.length).toBeGreaterThan(0)
    expect(res.body.roleCards?.staff?.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body.batchDistribution)).toBe(true)
    expect(Array.isArray(res.body.meetingReports)).toBe(true)
    expect(Array.isArray(res.body.requestTrend)).toBe(true)
    expect(res.body.requestTrend?.length).toBe(7)
    expect(Array.isArray(res.body.yupparajDonationActivities)).toBe(true)
  })

  it('GET /api/portal/committee returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/committee')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.metricCards)).toBe(true)
    expect(res.body.meetings?.[0]?.status).toBeDefined()
    expect(Array.isArray(res.body.attendanceRows)).toBe(true)
    expect(Array.isArray(res.body.openAgendas)).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(res.body, 'attendanceSession')).toBe(true)
    expect(Array.isArray(res.body.memberBatchDistribution)).toBe(true)
    expect(Array.isArray(res.body.memberDirectoryPreview)).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(res.body, 'associationMonthlyPl')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(res.body, 'cramSchoolMonthlyPl')).toBe(true)
    expect(typeof res.body.paymentRequestsPending).toBe('number')
    expect(Array.isArray(res.body.meetingDocuments)).toBe(true)
    expect(Array.isArray(res.body.recentMinutes)).toBe(true)
    expect(Array.isArray(res.body.closedAgendaResults)).toBe(true)
    expect(typeof res.body.meetingOverview?.openAgendaCount).toBe('number')
    expect(typeof res.body.meetingOverview?.closedAgendaCount).toBe('number')
    expect(typeof res.body.meetingOverview?.publishedDocumentCount).toBe('number')
    expect(typeof res.body.meetingOverview?.minutesPublishedCount).toBe('number')
    expect(Array.isArray(res.body.requestTrend)).toBe(true)
    expect(res.body.requestTrend?.length).toBe(7)
  })

  it('GET /api/portal/academy returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/academy')
    expect(res.status).toBe(200)
    expect(res.body.roleCards?.admin?.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body.classes)).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(res.body, 'cramSchoolMonthlyPl')).toBe(true)
    expect(Array.isArray(res.body.cramClassRoster)).toBe(true)
    expect(Array.isArray(res.body.schoolCourses)).toBe(true)
  })

  it('CORS allows default dev origin localhost:5173', async () => {
    const app = createApp()
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('GET import template CSV (public)', async () => {
    const app = createApp()
    const res = await request(app).get('/api/admin/members/import-template.csv')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']?.includes('text/csv')).toBe(true)
    expect(res.text).toContain('รุ่น')
    expect(res.text).toContain('ชื่อ')
  })

  it('GET import template XLSX (public)', async () => {
    const app = createApp()
    const res = await request(app).get('/api/admin/members/import-template.xlsx')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']?.includes('spreadsheetml')).toBe(true)
  })

  it('GET import summary requires admin key', async () => {
    vi.stubEnv('ADMIN_UPLOAD_KEY', 'test-admin-key')
    const app = createApp()
    const res = await request(app).get('/api/admin/members/summary')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('ไม่ได้รับอนุญาต')
  })

  it('PATCH /api/admin/members/app-roles/:memberId requires admin key', async () => {
    vi.stubEnv('ADMIN_UPLOAD_KEY', 'test-admin-key')
    const app = createApp()
    const res = await request(app)
      .patch('/api/admin/members/app-roles/00000000-0000-0000-0000-000000000001')
      .send({ committee: true })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('ไม่ได้รับอนุญาต')
  })

  it('GET /api/admin/cram/classrooms requires admin key', async () => {
    vi.stubEnv('ADMIN_UPLOAD_KEY', 'test-admin-key')
    const app = createApp()
    const res = await request(app).get('/api/admin/cram/classrooms')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('ไม่ได้รับอนุญาต')
  })

  it('GET /api/admin/school-activities requires admin key', async () => {
    vi.stubEnv('ADMIN_UPLOAD_KEY', 'test-admin-key')
    const app = createApp()
    const res = await request(app).get('/api/admin/school-activities')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('ไม่ได้รับอนุญาต')
  })

  it('CORS reflects FRONTEND_ORIGINS when set', async () => {
    vi.stubEnv('FRONTEND_ORIGINS', 'https://app.example.com')
    const app = createApp()
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://app.example.com')
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com')
  })
})
