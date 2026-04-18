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

import { runVerifyLineConfigProbe } from './lib/verifyLineConfigProbe.mjs'

const apiBase = (process.env.VERIFY_API_BASE || process.argv[2])?.replace(/\/$/, '')
const fe = process.env.VERIFY_FRONTEND_URL || process.argv[3]

if (!apiBase?.trim() || !fe?.trim()) {
  console.error(
    'Usage: node scripts/verify-line-config.mjs <API_BASE> <FRONTEND_URL>\n' +
      'Example: node scripts/verify-line-config.mjs https://yrc-api-xxxxx.asia-southeast1.run.app https://yrc-smart-alumni-frontend.vercel.app/\n' +
      '(แทนที่ด้วย URL Cloud Run จริง — ห้ามพิมพ์ <URL-Cloud-Run> เป็นตัวอักษร)',
  )
  process.exit(1)
}

const code = await runVerifyLineConfigProbe(apiBase, fe.trim())
process.exit(code)
