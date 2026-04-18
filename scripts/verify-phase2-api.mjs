#!/usr/bin/env node
/**
 * Phase 2 — ตรวจแกน API: /health, index ที่ `/`, CORS, admin 401, push endpoints
 * สตาร์ท `backend/dist/index.js` ชั่วคราว (ต้อง `npm run build -w backend` ก่อน)
 *
 * ใน CI ไม่มี backend/.env — ส่ง ADMIN_UPLOAD_KEY ชั่วคราวให้ proccess ลูกเพื่อให้ได้ 401 แทน 500
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const backendRoot = join(root, 'backend')
const distIndex = join(backendRoot, 'dist', 'index.js')
const backendEnvPath = join(backendRoot, '.env')

function parseDotenvValue(content, key) {
  const re = new RegExp(`^${key}\\s*=\\s*(.*)$`, 'im')
  const m = re.exec(content)
  if (!m) return ''
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  return v.trim()
}

function parsePortFromEnv() {
  if (!existsSync(backendEnvPath)) return 4000
  const raw = readFileSync(backendEnvPath, 'utf8')
  const p = parseDotenvValue(raw, 'PORT')
  const n = Number.parseInt(p, 10)
  if (Number.isFinite(n) && n >= 1 && n <= 65535) return n
  return 4000
}

function adminKeyFallback() {
  if (process.env.ADMIN_UPLOAD_KEY?.trim()) return process.env.ADMIN_UPLOAD_KEY.trim()
  if (existsSync(backendEnvPath)) {
    const v = parseDotenvValue(readFileSync(backendEnvPath, 'utf8'), 'ADMIN_UPLOAD_KEY')
    if (v) return v
  }
  return 'phase2-verify-ci-admin-key'
}

async function waitHealth(port, timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 2500)
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: ctrl.signal })
      clearTimeout(t)
      if (r.ok) return true
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function main() {
  if (!existsSync(distIndex)) {
    console.error('ไม่พบ backend/dist/index.js — รันก่อน: npm run build -w backend')
    process.exit(1)
  }

  const port = parsePortFromEnv()
  const adminKey = adminKeyFallback()

  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ADMIN_UPLOAD_KEY: adminKey,
    },
  })

  if (!(await waitHealth(port))) {
    console.error(`✗ /health ไม่พร้อมภายในเวลา (พอร์ต ${port})`)
    try {
      child.kill('SIGTERM')
    } catch {
      /* ignore */
    }
    process.exit(1)
  }

  const base = `http://127.0.0.1:${port}`
  const errors = []

  try {
    // GET /health
    const h = await fetch(`${base}/health`)
    if (!h.ok) errors.push(`GET /health → ${h.status}`)
    else {
      const j = await h.json()
      if (!j.ok || j.service !== 'yrc-smart-alumni-api') errors.push('GET /health body ไม่ตรงที่คาด')
    }

    // GET / — service index
    const idx = await fetch(`${base}/`)
    if (!idx.ok) errors.push(`GET / → ${idx.status}`)
    else {
      const j = await idx.json()
      if (j.paths?.health !== '/health') errors.push('GET / paths.health ต้องเป็น /health')
      const pushDoc = String(j.paths?.push ?? '')
      if (!pushDoc.includes('vapid-public') || !pushDoc.includes('subscribe')) {
        errors.push('GET / paths.push ต้องอ้าง vapid-public และ subscribe')
      }
      const fin = String(j.paths?.finance ?? '')
      if (!fin.includes('payment-requests')) errors.push('GET / paths.finance ต้องมี payment-requests')
    }

    // CORS — default dev origin
    const hc = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } })
    const acao = hc.headers.get('access-control-allow-origin')
    if (acao !== 'http://localhost:5173') {
      errors.push(`CORS: คาด access-control-allow-origin สำหรับ localhost:5173 ได้ ${acao ?? '(ไม่มี)'}`)
    }

    // Push
    const vapid = await fetch(`${base}/api/push/vapid-public`)
    if (vapid.status !== 200 && vapid.status !== 503) {
      errors.push(`GET /api/push/vapid-public → ${vapid.status} (คาด 200 หรือ 503 เมื่อยังไม่ตั้ง VAPID)`)
    }

    const sub = await fetch(`${base}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (sub.status !== 400) {
      errors.push(`POST /api/push/subscribe {} → ${sub.status} (คาด 400 เมื่อไม่ส่ง endpoint/keys)`)
    }

    // Admin — ไม่ส่ง x-admin-key
    const fin = await fetch(`${base}/api/admin/finance/overview`)
    if (fin.status !== 401) {
      errors.push(`GET /api/admin/finance/overview ไม่มีคีย์ → ${fin.status} (คาด 401)`)
    } else {
      const b = await fin.json().catch(() => ({}))
      if (String(b.error ?? '') !== 'ไม่ได้รับอนุญาต') {
        errors.push('ข้อความ 401 admin ไม่ตรงที่คาด')
      }
    }
  } catch (e) {
    errors.push(`fetch error: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    child.kill('SIGTERM')
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 800))
  try {
    child.kill('SIGKILL')
  } catch {
    /* ignore */
  }

  if (errors.length) {
    console.error('✗ Phase 2 verify ไม่ผ่าน:\n')
    for (const e of errors) console.error(`  • ${e}`)
    process.exit(1)
  }

  console.log('✓ Phase 2 — /health, GET / (service index), CORS (localhost:5173), push routes, admin 401')
  console.log('  หมายเหตุ: deploy จริงตั้ง FRONTEND_ORIGINS ให้ตรงโดเมน frontend — ดู README และ backend/src/app.ts')
  process.exit(0)
}

main()
