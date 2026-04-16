#!/usr/bin/env node
/**
 * ทดสอบ endpoint admin ด้วย x-admin-key (ไม่ commit key ลง repo)
 *
 * Usage:
 *   VERIFY_API_BASE=https://xxx.run.app VERIFY_ADMIN_KEY=... node scripts/verify-admin.mjs
 *
 * ตรวจ: GET /api/admin/members/summary (ทั้งหมด) และถ้ามี VERIFY_IMPORT_BATCH_ID จะ filter batch นั้น
 */

const base = (process.env.VERIFY_API_BASE || process.argv[2])?.replace(/\/$/, '')
const adminKey = process.env.VERIFY_ADMIN_KEY || process.argv[3]
const batchId = process.env.VERIFY_IMPORT_BATCH_ID?.trim() || ''

if (!base?.trim()) {
  console.error('Missing VERIFY_API_BASE or argv[1] (API URL)')
  process.exit(1)
}
if (!adminKey?.trim()) {
  console.error(
    'Missing VERIFY_ADMIN_KEY or argv[2].\n' +
      '  Example (PowerShell):\n' +
      '  $env:VERIFY_API_BASE="https://xxx.run.app"; $env:VERIFY_ADMIN_KEY="your-key"; node scripts/verify-admin.mjs',
  )
  process.exit(1)
}

async function main() {
  const q = batchId ? `?importBatchId=${encodeURIComponent(batchId)}` : ''
  const url = `${base}/api/admin/members/summary${q}`
  const r = await fetch(url, { headers: { 'x-admin-key': adminKey.trim() } })
  const text = await r.text()
  let j
  try {
    j = JSON.parse(text)
  } catch {
    throw new Error(`GET summary → HTTP ${r.status}, non-JSON: ${text.slice(0, 400)}`)
  }
  if (!r.ok) {
    throw new Error(`GET summary → HTTP ${r.status}: ${JSON.stringify(j)}`)
  }
  if (!j.ok || !j.summary) {
    throw new Error(`Unexpected body: ${JSON.stringify(j)}`)
  }
  console.log('OK: GET /api/admin/members/summary')
  console.log(JSON.stringify(j, null, 2))

  const url2 = `${base}/api/admin/member-requests`
  const r2 = await fetch(url2, { headers: { 'x-admin-key': adminKey.trim() } })
  const t2 = await r2.text()
  const j2 = JSON.parse(t2)
  if (!r2.ok) {
    throw new Error(`GET member-requests → HTTP ${r2.status}: ${t2.slice(0, 300)}`)
  }
  console.log('OK: GET /api/admin/member-requests (count in response keys as expected by API)')
  console.log(JSON.stringify(j2, null, 2).slice(0, 2000) + (JSON.stringify(j2).length > 2000 ? '\n…' : ''))
}

main().catch((e) => {
  console.error('VERIFY ADMIN FAILED:', e.message)
  process.exit(1)
})
