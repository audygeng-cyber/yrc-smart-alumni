/**
 * Probe POST /api/auth/line/token — ใช้ร่วมกับ verify-line-config.mjs และ verify-vercel-line-cors.mjs
 * (รันใน process เดียวเพื่อหลีกเลี่ยงปัญหา libuv บน Windows เมื่อ spawn child หลัง fetch)
 */

/**
 * @param {string} label
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHttpBaseUrl(label, value) {
  const v = String(value).trim()
  if (!v) {
    console.error(`\nสรุป: ${label} ว่าง`)
    return false
  }
  if (/[<>]/.test(v) || /URL-Cloud-Run/i.test(v) || /^https?:\/\/<|^<\/?URL/i.test(v)) {
    console.error(
      `\nสรุป: ${label} ต้องเป็น URL จริง ไม่ใช่ตัวยึด เช่น <URL-Cloud-Run>\n` +
        'ตัวอย่าง Cloud Run: https://yrc-api-xxxxx.asia-southeast1.run.app\n' +
        'รัน: npm run verify:line -- https://…run.app https://ชื่อ-app.vercel.app/\n',
    )
    return false
  }
  try {
    const u = new URL(v)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      console.error(`\nสรุป: ${label} ต้องเป็น http(s):`, v)
      return false
    }
    return true
  } catch {
    console.error(`\nสรุป: ${label} ไม่ใช่ URL ที่อ่านได้:`, v)
    return false
  }
}

/** LINE มักใช้ redirect ที่ลงท้าย / — ลองทั้งแบบมีและไม่มี / */
export function redirectCandidates(originLike) {
  const u = String(originLike).trim().replace(/\/+$/, '')
  return [u + '/', u]
}

async function postToken(apiBase, redirectUri) {
  const url = `${apiBase.replace(/\/$/, '')}/api/auth/line/token`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'yrc-line-config-probe-invalid-code',
      redirect_uri: redirectUri,
    }),
  })
}

/**
 * @returns {Promise<number>} exit code 0 = OK, 1 = error, 2 = config missing / redirect list
 */
export async function runVerifyLineConfigProbe(apiBase, fe) {
  const base = apiBase.replace(/\/$/, '').trim()
  const feTrim = String(fe).trim()

  if (!isValidHttpBaseUrl('API_BASE (อาร์กิวเมนต์แรก — URL ฐานของ Cloud Run)', base)) {
    return 1
  }
  if (!isValidHttpBaseUrl('FRONTEND_URL (อาร์กิวเมนต์ที่สอง — URL หรือ Origin ของ Vercel)', feTrim)) {
    return 1
  }

  console.log('API:', base)
  console.log('Frontend:', feTrim)
  console.log('')

  for (const redirectUri of redirectCandidates(feTrim)) {
    const r = await postToken(base, redirectUri)
    const j = await r.json().catch(() => ({}))

    console.log(`Probe redirect_uri = "${redirectUri}"`)
    console.log(`  → HTTP ${r.status}`, JSON.stringify(j).slice(0, 500))

    if (r.status === 500) {
      const err = j.error || ''
      if (String(err).includes('LINE_REDIRECT') || err === 'LINE_REDIRECT_URIS (or LINE_REDIRECT_URI) is not configured') {
        console.log('\nสรุป: ยังไม่ตั้ง LINE_REDIRECT_URIS / LINE_REDIRECT_URI บน Cloud Run')
        console.log('  ใส่ค่าเช่น: https://yrc-smart-alumni-frontend.vercel.app/ (คั่นหลายค่าด้วย comma)')
        return 2
      }
      if (String(err).includes('LINE_CHANNEL')) {
        console.log('\nสรุป: ยังไม่ตั้ง LINE_CHANNEL_ID / LINE_CHANNEL_SECRET บน Cloud Run')
        return 2
      }
      console.log('\nสรุป: HTTP 500 — ดูข้อความ error ด้านบน')
      return 1
    }

    if (r.status === 400 && j.error === 'redirect_uri not allowed') {
      console.log('  (redirect นี้ยังไม่อยู่ใน allow list — ลองแบบอื่นหรือแก้ env)')
      console.log('')
      continue
    }

    if (r.status === 400) {
      console.log('\nสรุป: HTTP 400 —', j.error || j)
      return 1
    }

    if (r.status === 401 && j.error === 'line_token_exchange_failed') {
      console.log('\n✓ สรุป: โครงสร้าง LINE บน API พร้อม (LINE ปฏิเสธ code ปลอม — คาดหวาย)')
      console.log(
        '  ขั้นถัดไป: ตั้ง VITE_LINE_CHANNEL_ID / VITE_LINE_REDIRECT_URI บน Vercel ให้ตรง และใส่ Callback URL ใน LINE Developers',
      )
      return 0
    }

    if (r.status === 401) {
      console.log('\nสรุป: 401 —', JSON.stringify(j).slice(0, 300))
      return 1
    }

    console.log('')
  }

  console.log(
    '\nสรุป: ไม่มี redirect_uri ที่ผ่านการตรวจสอบรายการอนุญาต — เพิ่ม URL นี้ใน LINE_REDIRECT_URIS บน Cloud Run ให้ตรงกับ VITE_LINE_REDIRECT_URI',
  )
  console.log('  ลองทั้ง:', redirectCandidates(feTrim).join(' | '))
  return 2
}
