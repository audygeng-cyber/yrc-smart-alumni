import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { adminAuth } from './middleware/adminAuth.js'
import { importMembersRouter } from './routes/importMembers.js'
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

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'yrc-smart-alumni-api' })
})

app.use('/api/admin/members', adminAuth, importMembersRouter)
app.use('/api/members', membersRouter)

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
