#!/usr/bin/env node
/**
 * Phase 3 — สมาชิก & LINE: ตรวจเส้นทาง API ที่ฝั่ง `/auth/link` และกู้เซสชันใช้
 * สตาร์ท backend/dist ชั่วคราว (ต้อง `npm run build -w backend` ก่อน)
 *
 * ไม่แทนการทดสอบ LINE Login จริง (ต้องมี code จาก LINE) — ตรวจ validation และพอร์ทัล snapshot
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
  return 'phase3-verify-ci-admin-key'
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

async function postJson(base, path, body) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
    // LINE OAuth — body ว่างต้อง 400
    const lineRes = await postJson(base, '/api/auth/line/token', {})
    const lineJ = await lineRes.json().catch(() => ({}))
    const lineErr = String(lineJ?.error ?? '')
    const lineOk =
      lineRes.status === 400 &&
      lineErr &&
      ((lineErr.includes('code') && lineErr.includes('redirect_uri')) ||
        lineErr.includes('ต้องระบุ code') ||
        lineErr.includes('redirect_uri'))
    if (!lineOk) {
      errors.push(`POST /api/auth/line/token {} → ${lineRes.status} ${JSON.stringify(lineJ)?.slice(0, 120)}`)
    }

    const sess = await postJson(base, '/api/members/session-member', {})
    if (sess.status !== 400) {
      errors.push(`POST /api/members/session-member {} → ${sess.status} (คาด 400)`)
    }

    const roles = await postJson(base, '/api/members/app-roles', {})
    if (roles.status !== 400) {
      errors.push(`POST /api/members/app-roles {} → ${roles.status} (คาด 400)`)
    }

    const vlink = await postJson(base, '/api/members/verify-link', {})
    if (vlink.status !== 400) {
      errors.push(`POST /api/members/verify-link {} → ${vlink.status} (คาด 400)`)
    }

    const portal = await fetch(`${base}/api/portal/member`)
    if (!portal.ok) {
      errors.push(`GET /api/portal/member → ${portal.status}`)
    } else {
      const pj = await portal.json().catch(() => null)
      if (!Array.isArray(pj?.statsCards)) {
        errors.push('GET /api/portal/member ต้องมี statsCards เป็น array')
      }
    }

    const idx = await fetch(`${base}/`)
    if (idx.ok) {
      const j = await idx.json().catch(() => null)
      const mLine = String(j?.paths?.membersVerify ?? '')
      if (!mLine.includes('verify-link')) {
        errors.push('GET / paths.membersVerify ต้องอ้าง verify-link')
      }
    }
  } catch (e) {
    errors.push(`fetch: ${e instanceof Error ? e.message : String(e)}`)
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
    console.error('✗ Phase 3 verify ไม่ผ่าน:\n')
    for (const e of errors) console.error(`  • ${e}`)
    process.exit(1)
  }

  console.log('✓ Phase 3 — LINE /token validation, session-member, app-roles, verify-link, portal/member, index paths')
  console.log('  หมายเหตุ: ทดสอบ LINE Login จริง + หน้า /auth/link บนอุปกรณ์จริง — ดู docs/MODULE_PROGRESS และทดสอบด้วยมือ')
  process.exit(0)
}

main()
