#!/usr/bin/env node
/**
 * ตรวจว่า backend พร้อมสำหรับ LINE Login หรือไม่ — ไม่ต้องใส่ Channel Secret
 *
 * ส่ง POST /api/auth/line/token ด้วย code จำลอง + redirect_uri จาก Vercel
 * - 500 + LINE ยังไม่ตั้ง → ต้องใส่ env บน Cloud Run
 * - 400 + redirect_uri not allowed → แก้ LINE_REDIRECT_URIS ให้ตรง URL (รวม / ท้าย)
 * - 401 + line_token_exchange_failed → ถือว่าโครงสร้างพร้อม (LINE ปฏิเสธ code ปลอมตามปกติ)
 *
 * Usage:
 *   node scripts/verify-line-config.mjs <API_BASE> <FRONTEND_URL_OR_ORIGIN>
 *   VERIFY_API_BASE=... VERIFY_FRONTEND_URL=... node scripts/verify-line-config.mjs
 */

const apiBase = (process.env.VERIFY_API_BASE || process.argv[2])?.replace(/\/$/, '')
let fe = process.env.VERIFY_FRONTEND_URL || process.argv[3]

if (!apiBase?.trim() || !fe?.trim()) {
  console.error(
    'Usage: node scripts/verify-line-config.mjs <API_BASE> <FRONTEND_URL>\n' +
      'Example: node scripts/verify-line-config.mjs https://xxx.run.app https://yyy.vercel.app/',
  )
  process.exit(1)
}

fe = fe.trim()
/** LINE มักใช้ redirect ที่ลงท้าย / — ลองทั้งแบบมีและไม่มี / */
function redirectCandidates(originLike) {
  const u = originLike.replace(/\/+$/, '')
  return [u + '/', u]
}

async function postToken(redirectUri) {
  const url = `${apiBase}/api/auth/line/token`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'yrc-line-config-probe-invalid-code',
      redirect_uri: redirectUri,
    }),
  })
}

async function main() {
  console.log('API:', apiBase)
  console.log('Frontend:', fe)
  console.log('')

  for (const redirectUri of redirectCandidates(fe)) {
    const r = await postToken(redirectUri)
    const j = await r.json().catch(() => ({}))

    console.log(`Probe redirect_uri = "${redirectUri}"`)
    console.log(`  → HTTP ${r.status}`, JSON.stringify(j).slice(0, 500))

    if (r.status === 500) {
      const err = j.error || ''
      if (String(err).includes('LINE_REDIRECT') || err === 'LINE_REDIRECT_URIS (or LINE_REDIRECT_URI) is not configured') {
        console.log('\nสรุป: ยังไม่ตั้ง LINE_REDIRECT_URIS / LINE_REDIRECT_URI บน Cloud Run')
        console.log('  ใส่ค่าเช่น: https://yrc-smart-alumni-frontend.vercel.app/ (คั่นหลายค่าด้วย comma)')
        process.exit(2)
      }
      if (err.includes('LINE_CHANNEL')) {
        console.log('\nสรุป: ยังไม่ตั้ง LINE_CHANNEL_ID / LINE_CHANNEL_SECRET บน Cloud Run')
        process.exit(2)
      }
      console.log('\nสรุป: HTTP 500 — ดูข้อความ error ด้านบน')
      process.exit(1)
    }

    if (r.status === 400 && j.error === 'redirect_uri not allowed') {
      console.log('  (redirect นี้ยังไม่อยู่ใน allow list — ลองแบบอื่นหรือแก้ env)')
      console.log('')
      continue
    }

    if (r.status === 400) {
      console.log('\nสรุป: HTTP 400 —', j.error || j)
      process.exit(1)
    }

    if (r.status === 401 && j.error === 'line_token_exchange_failed') {
      console.log('\n✓ สรุป: โครงสร้าง LINE บน API พร้อม (LINE ปฏิเสธ code ปลอม — คาดหวาย)')
      console.log('  ขั้นถัดไป: ตั้ง VITE_LINE_CHANNEL_ID / VITE_LINE_REDIRECT_URI บน Vercel ให้ตรง และใส่ Callback URL ใน LINE Developers')
      process.exit(0)
    }

    if (r.status === 401) {
      console.log('\nสรุป: 401 —', JSON.stringify(j).slice(0, 300))
      process.exit(1)
    }

    console.log('')
  }

  console.log(
    '\nสรุป: ไม่มี redirect_uri ที่ผ่านการตรวจสอบรายการอนุญาต — เพิ่ม URL นี้ใน LINE_REDIRECT_URIS บน Cloud Run ให้ตรงกับ VITE_LINE_REDIRECT_URI',
  )
  console.log('  ลองทั้ง:', redirectCandidates(fe).join(' | '))
  process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
