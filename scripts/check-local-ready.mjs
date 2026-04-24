#!/usr/bin/env node
/**
 * ตรวจว่าพร้อมรัน YRC Smart Alumni บนเครื่องหรือยัง — ไม่แทนที่ npm run ci
 *
 * Usage: npm run doctor
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function parseDotenv(content) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function loadBackendEnv() {
  const p = join(root, 'backend', '.env')
  if (!existsSync(p)) return { path: p, vars: /** @type {Record<string, string>} */ ({}) }
  const vars = parseDotenv(readFileSync(p, 'utf8'))
  return { path: p, vars }
}

function parsePort(raw) {
  const n = Number.parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 1 || n > 65535) return 4000
  return n
}

/**
 * @param {number} port
 */
async function tryHealth(port) {
  const base = `http://127.0.0.1:${port}`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const r = await fetch(`${base}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) return { ok: false, detail: `HTTP ${r.status}` }
    const j = await r.json().catch(() => null)
    return { ok: true, detail: j?.service ? String(j.service) : 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, detail: msg.includes('abort') ? 'หมดเวลาเชื่อมต่อ' : msg }
  }
}

function mark(ok) {
  return ok ? '✓' : '✗'
}

const nodeMajor = Number(process.versions.node.split('.')[0])
const nodeOk = Number.isFinite(nodeMajor) && nodeMajor >= 20

const be = loadBackendEnv()
const hasBackendEnv = existsSync(be.path)
const url = (be.vars.SUPABASE_URL ?? '').trim()
const key = (be.vars.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
const admin = (be.vars.ADMIN_UPLOAD_KEY ?? '').trim()
const supabaseConfigured = Boolean(url && key && /^https?:\/\//i.test(url))
const adminConfigured = admin.length > 0
const apiPort = parsePort(be.vars.PORT)
const feEnvPath = join(root, 'frontend', '.env')
const hasFrontendEnv = existsSync(feEnvPath)

console.log('YRC Smart Alumni — ตรวจสภาพเครื่อง (local)\n')
console.log(`  ${mark(nodeOk)} Node.js ${process.version} (ต้องการ >= 20)`)
if (!nodeOk) {
  console.error('\nอัปเกรด Node.js แล้วรันใหม่')
  process.exit(1)
}

console.log(`  ${mark(hasBackendEnv)} มีไฟล์ backend/.env`)
if (!hasBackendEnv) {
  console.log('      → รัน: npm run setup:env')
}

console.log(`  ${mark(supabaseConfigured)} ตั้งค่า Supabase ใน backend/.env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)`)
if (!supabaseConfigured && hasBackendEnv) {
  console.log('      → ใส่ค่าจาก Supabase Dashboard → Settings → API')
  console.log('      → ถ้ายังไม่มีโปรเจกต์: พอร์ทัล GET /api/portal/* ใช้ข้อมูลตัวอย่างในโค้ดได้ชั่วคราว')
}

console.log(`  ${mark(adminConfigured)} ตั้งค่า ADMIN_UPLOAD_KEY ใน backend/.env`)
if (!adminConfigured && hasBackendEnv) {
  console.log('      → จำเป็นสำหรับแท็บ Admin / นำเข้าสมาชิก / กิจกรรมโรงเรียน ที่ต้องใช้ x-admin-key')
}

console.log(`  ${mark(hasFrontendEnv)} มีไฟล์ frontend/.env (ไม่บังคับ — โค้ด default VITE_API_URL ไปที่พอร์ต 4000)`)
if (!hasFrontendEnv) {
  console.log('      → รัน: npm run setup:env')
}

const health = await tryHealth(apiPort)
const healthUrl = `http://127.0.0.1:${apiPort}/health`
console.log(`  ${mark(health.ok)} API ${healthUrl} (${health.ok ? health.detail : health.detail})`)
if (!health.ok) {
  console.log('      → เปิด API ด้วย: npm run dev (จากโฟลเดอร์ราก)')
  if (apiPort !== 4000) {
    console.log(`      → ตั้ง PORT=${apiPort} ใน backend/.env — ให้ตรงกับที่รันอยู่`)
  }
}

console.log(
  '\nขั้นตอนถัดไปที่เร็วที่สุด: npm install → npm run setup:env → แก้ backend/.env → npm run dev\n' +
    'รายการไฟล์ migration: npm run migrations:list — ตรวจก่อน push: npm run ci\n',
)
console.log(
  'ข้อตกลงทีมพัฒนา: ช่วงเขียนโค้ดยาว — สโมกทดสอบบนเว็บทุกชั่วโมงตรงเวลา (เช่น 10:00, 11:00) และไม่เปิด mutation โดยไม่มี auth — ดู docs/OPERATIONAL_RUNBOOK.md (หัวข้อ นักพัฒนา) และ .cursorrules §7\n',
)

process.exit(0)
