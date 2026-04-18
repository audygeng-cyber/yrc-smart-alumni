#!/usr/bin/env node
/**
 * ตรวจ production stack: CORS (FRONTEND_ORIGINS) + LINE redirect allow-list (LINE_REDIRECT_URIS)
 * ไม่ต้องมี Channel Secret — ใช้ probe เดียวกับ verify-line-config
 *
 * Usage:
 *   node scripts/verify-vercel-line-cors.mjs <API_BASE> <FRONTEND_ORIGIN>
 *   npm run verify:vercel-line-cors -- https://xxx.run.app https://yyy.vercel.app
 *
 * FRONTEND_ORIGIN = ค่า Origin ที่เบราว์เซอร์ส่ง (มัก **ไม่มี** slash ท้าย) — ต้องตรงกับ FRONTEND_ORIGINS บน Cloud Run
 * คนละอย่างกับ VITE_LINE_REDIRECT_URI ที่มักลงท้ายด้วย /
 */

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const apiBase = (process.env.VERIFY_API_BASE || process.argv[2])?.replace(/\/$/, '').trim()
let feOrigin = (process.env.VERIFY_FRONTEND_ORIGIN || process.argv[3])?.trim()

if (!apiBase || !feOrigin) {
  console.error(
    'Usage: node scripts/verify-vercel-line-cors.mjs <API_BASE> <FRONTEND_ORIGIN>\n' +
      'Example: node scripts/verify-vercel-line-cors.mjs https://xxx.run.app https://yrc-smart-alumni-frontend.vercel.app\n' +
      '\n' +
      'FRONTEND_ORIGIN: ไม่ใส่ path — มักไม่มี / ท้าย (ต่างจาก VITE_LINE_REDIRECT_URI ที่อาจมี / ท้ายสำหรับ LINE OAuth)',
  )
  process.exit(1)
}

/** ตัด slash ท้ายเพื่อให้ตรงกับ header Origin ของเบราว์เซอร์ */
feOrigin = feOrigin.replace(/\/+$/, '')

async function corsPreflight(path) {
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
  const r = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: feOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  return {
    url,
    status: r.status,
    allowOrigin: r.headers.get('access-control-allow-origin'),
    allowMethods: r.headers.get('access-control-allow-methods'),
    allowHeaders: r.headers.get('access-control-allow-headers'),
  }
}

async function corsSimpleGet(path) {
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
  const r = await fetch(url, { headers: { Origin: feOrigin } })
  return {
    url,
    status: r.status,
    allowOrigin: r.headers.get('access-control-allow-origin'),
  }
}

function printChecklist() {
  console.log('\n--- Checklist ค่า env (อ้างอิง docs/LINE_LOGIN_CHECKLIST.md) ---\n')
  console.log('Vercel → Production:')
  console.log('  VITE_API_URL          = ' + apiBase + '   (ไม่มี slash ท้าย)')
  console.log('  VITE_LINE_CHANNEL_ID  = Channel ID (เดียวกับ LINE_CHANNEL_ID บน Cloud Run)')
  console.log('  VITE_LINE_REDIRECT_URI = เช่น ' + feOrigin + '/   (มี / ท้ายได้ — ต้องตรง LINE Console + LINE_REDIRECT_URIS)')
  console.log('')
  console.log('Cloud Run → yrc-api:')
  console.log('  FRONTEND_ORIGINS      = ' + feOrigin + '   (คั่นหลายค่าด้วย comma — มักไม่มี slash ท้าย)')
  console.log('  LINE_CHANNEL_ID / LINE_CHANNEL_SECRET / LINE_REDIRECT_URIS  = ตาม LINE Developers')
  console.log('')
}

async function main() {
  printChecklist()

  console.log('--- CORS: GET /health + Origin ---')
  const h = await corsSimpleGet('/health')
  console.log(`  ${h.status}  Access-Control-Allow-Origin: ${h.allowOrigin ?? '(ไม่มี)'}`)
  if (h.allowOrigin && h.allowOrigin !== feOrigin && h.allowOrigin !== '*') {
    console.log(`  WARN: คาดว่าจะเป็น "${feOrigin}" หรือ * — ถ้าไม่ตรงจะติด CORS`)
  }

  console.log('\n--- CORS: OPTIONS preflight → POST /api/members/app-roles ---')
  const p = await corsPreflight('/api/members/app-roles')
  console.log(`  ${p.status}`, {
    'access-control-allow-origin': p.allowOrigin,
    'access-control-allow-methods': p.allowMethods,
  })
  if (!p.allowOrigin || (p.allowOrigin !== feOrigin && p.allowOrigin !== '*')) {
    console.log(
      '\n✗ CORS preflight ไม่ยอมรับ Origin นี้ — แก้ FRONTEND_ORIGINS บน Cloud Run ให้มี:',
      feOrigin,
    )
    process.exit(3)
  }
  console.log('\n✓ CORS preflight OK สำหรับ Origin:', feOrigin)

  console.log('\n--- LINE: redirect_uri allow-list + channel (verify-line-config) ---')
  const lineExit = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, 'scripts', 'verify-line-config.mjs'), apiBase, feOrigin + '/'], {
      stdio: 'inherit',
      cwd: root,
    })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', reject)
  })
  if (lineExit !== 0) {
    console.log('\n✗ verify-line-config ไม่ผ่าน — แก้ LINE_REDIRECT_URIS / LINE_CHANNEL_* บน Cloud Run')
    process.exit(lineExit)
  }

  console.log('\n✓ สรุป: CORS + LINE redirect probe ผ่าน — ทดสอบล็อกอิน LINE จริงบน HTTPS ได้')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
