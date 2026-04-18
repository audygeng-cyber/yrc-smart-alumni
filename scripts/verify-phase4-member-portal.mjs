#!/usr/bin/env node
/**
 * Phase 4 — พอร์ทัลสมาชิก: snapshot `/api/portal/member` + API ที่หน้า dashboard/บริจาค/คำร้องใช้
 * สตาร์ท backend/dist ชั่วคราว
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = join(__dirname, '..', 'backend')
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
  return 'phase4-verify-ci-admin-key'
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
  const child = spawn(process.execPath, ['dist/index.js'], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, ADMIN_UPLOAD_KEY: adminKeyFallback() },
  })

  if (!(await waitHealth(port))) {
    console.error(`✗ /health ไม่พร้อม (พอร์ต ${port})`)
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
    const portal = await fetch(`${base}/api/portal/member`)
    if (!portal.ok) {
      errors.push(`GET /api/portal/member → ${portal.status}`)
    } else {
      const pj = await portal.json().catch(() => null)
      if (!Array.isArray(pj?.statsCards)) errors.push('portal/member: ต้องมี statsCards')
      if (!Array.isArray(pj?.roleCards?.member) || pj.roleCards.member.length < 1) {
        errors.push('portal/member: roleCards.member ต้องมีอย่างน้อย 1 รายการ')
      }
      if (!Array.isArray(pj?.roleCards?.staff) || pj.roleCards.staff.length < 1) {
        errors.push('portal/member: roleCards.staff ต้องมีอย่างน้อย 1 รายการ')
      }
      if (!Array.isArray(pj?.batchDistribution)) errors.push('portal/member: ต้องมี batchDistribution')
      if (!Array.isArray(pj?.meetingReports)) errors.push('portal/member: ต้องมี meetingReports')
      if (!Array.isArray(pj?.requestTrend) || pj.requestTrend.length !== 7) {
        errors.push('portal/member: requestTrend ต้องยาว 7')
      }
      if (!Array.isArray(pj?.yupparajDonationActivities)) errors.push('portal/member: ต้องมี yupparajDonationActivities')
    }

    const dh = await postJson(base, '/api/members/donations/history', {})
    if (dh.status !== 400) errors.push(`POST /api/members/donations/history {} → ${dh.status} (คาด 400)`)

    const d = await postJson(base, '/api/members/donations', {})
    if (d.status !== 400) errors.push(`POST /api/members/donations {} → ${d.status} (คาด 400)`)

    const rs = await postJson(base, '/api/members/request-status', {})
    if (rs.status !== 400) errors.push(`POST /api/members/request-status {} → ${rs.status} (คาด 400)`)

    const us = await postJson(base, '/api/members/update-self', {})
    if (us.status !== 400) errors.push(`POST /api/members/update-self {} → ${us.status} (คาด 400)`)

    const vapid = await fetch(`${base}/api/push/vapid-public`)
    if (vapid.status !== 200 && vapid.status !== 503) {
      errors.push(`GET /api/push/vapid-public → ${vapid.status} (คาด 200 หรือ 503)`)
    }

    const idx = await fetch(`${base}/`)
    if (idx.ok) {
      const j = await idx.json().catch(() => null)
      const m = String(j?.paths?.membersDonations ?? '')
      if (!m.includes('donations')) errors.push('GET / paths.membersDonations ต้องอ้าง donations')
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
    console.error('✗ Phase 4 verify ไม่ผ่าน:\n')
    for (const e of errors) console.error(`  • ${e}`)
    process.exit(1)
  }

  console.log('✓ Phase 4 — portal/member snapshot, donations, request-status, update-self probes, push VAPID, index paths')
  console.log('  หมายเหตุ: UI `/member/*` + AppRoles — ทดสอบมือบนเบราว์เซอร์; ดู frontend/src/App.tsx')
  process.exit(0)
}

main()
