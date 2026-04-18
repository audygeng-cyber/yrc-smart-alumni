#!/usr/bin/env node
/**
 * สตาร์ท API จาก backend/dist ชั่วคราว แล้วเรียก /health จนกว่าจะสำเร็จ — ใช้ปิด Phase 0 checklist
 * ต้องรัน `npm run build -w backend` ก่อน (หรือใช้ npm run phase0:verify ที่รวม build แล้ว)
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const backendRoot = join(root, 'backend')
const distIndex = join(backendRoot, 'dist', 'index.js')

function parsePortFromEnv() {
  const p = join(backendRoot, '.env')
  if (!existsSync(p)) return 4000
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = /^PORT\s*=\s*(.+)$/i.exec(t)
    if (m) {
      const n = Number.parseInt(String(m[1]).trim().replace(/^["']|["']$/g, ''), 10)
      if (Number.isFinite(n) && n >= 1 && n <= 65535) return n
    }
  }
  return 4000
}

async function tryHealth(port) {
  const url = `http://127.0.0.1:${port}/health`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) return { ok: false, url, detail: `HTTP ${r.status}` }
    const j = await r.json().catch(() => null)
    return { ok: true, url, detail: j }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, url, detail: msg }
  }
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
    env: { ...process.env },
  })

  const deadline = Date.now() + 25000
  let last = ''
  while (Date.now() < deadline) {
    const h = await tryHealth(port)
    if (h.ok) {
      console.log(`\n✓ ${h.url} OK`, h.detail && typeof h.detail === 'object' ? JSON.stringify(h.detail) : '')
      child.kill('SIGTERM')
      await new Promise((r) => setTimeout(r, 800))
      if (!child.killed) {
        try {
          child.kill('SIGKILL')
        } catch {
          /* ignore */
        }
      }
      process.exit(0)
    }
    last = h.detail
    await new Promise((r) => setTimeout(r, 400))
  }

  console.error(`\n✗ /health ไม่สำเร็จภายในเวลา (พอร์ต ${port}) — ล่าสุด: ${last}`)
  child.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 500))
  try {
    child.kill('SIGKILL')
  } catch {
    /* ignore */
  }
  process.exit(1)
}

main()
