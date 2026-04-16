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
  })

  it('GET /api/portal/member returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/member')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.statsCards)).toBe(true)
    expect(res.body.roleCards?.member?.length).toBeGreaterThan(0)
    expect(res.body.roleCards?.staff?.length).toBeGreaterThan(0)
  })

  it('GET /api/portal/committee returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/committee')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.metricCards)).toBe(true)
    expect(res.body.meetings?.[0]?.status).toBeDefined()
  })

  it('GET /api/portal/academy returns dashboard snapshot', async () => {
    const app = createApp()
    const res = await request(app).get('/api/portal/academy')
    expect(res.status).toBe(200)
    expect(res.body.roleCards?.admin?.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body.classes)).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(res.body, 'cramSchoolMonthlyPl')).toBe(true)
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
    expect(res.body.error).toBe('Unauthorized')
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
