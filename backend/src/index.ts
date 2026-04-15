import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { adminAuth } from './middleware/adminAuth.js'
import { importMembersRouter } from './routes/importMembers.js'
import { lineAuthRouter } from './routes/lineAuth.js'
import { memberRequestsAdminRouter } from './routes/memberRequestsAdmin.js'
import { membersRouter } from './routes/members.js'

const app = express()
const port = Number(process.env.PORT) || 4000

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
      lineToken: 'POST /api/auth/line/token',
      membersVerify: 'POST /api/members/verify-link',
      membersRegister: 'POST /api/members/register-request',
      adminImport: 'POST /api/admin/members/import (ต้องใช้ x-admin-key)',
      memberRequests: 'GET /api/admin/member-requests (x-admin-key)',
    },
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'yrc-smart-alumni-api' })
})

app.use('/api/auth/line', lineAuthRouter)
app.use('/api/admin/member-requests', adminAuth, memberRequestsAdminRouter)
app.use('/api/admin/members', adminAuth, importMembersRouter)
app.use('/api/members', membersRouter)

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
