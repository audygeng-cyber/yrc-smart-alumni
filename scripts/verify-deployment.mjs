#!/usr/bin/env node
/**
 * Post-deploy smoke test: GET /health, optional CORS, admin summary probe.
 * With --deep: API root, templates, VAPID, CORS preflight, frontend bundle vs API URL.
 *
 * Usage:
 *   node scripts/verify-deployment.mjs <API_BASE_URL> [FRONTEND_ORIGIN] [--deep]
 *   VERIFY_DEEP=1 VERIFY_API_BASE=... VERIFY_FRONTEND_ORIGIN=... node scripts/verify-deployment.mjs
 *
 * ลำดับความสำคัญ: อาร์กิวเมนต์บนบรรทัดคำสั่ง (argv) **มาก่อน** env — กันค่า VERIFY_API_BASE=placeholder ใน shell ทับ URL จริง
 */

const argv = process.argv.slice(2).filter((a) => a !== '--deep')
const deep =
  process.env.VERIFY_DEEP === '1' ||
  process.env.VERIFY_DEEP === 'true' ||
  process.argv.includes('--deep')

const apiBase = (argv[0]?.trim() || process.env.VERIFY_API_BASE || '').trim()
const frontendOrigin = (argv[1]?.trim() || process.env.VERIFY_FRONTEND_ORIGIN || '').trim()

if (!apiBase?.trim()) {
  console.error(
    'Missing API base URL.\n' +
      '  Example: node scripts/verify-deployment.mjs https://xxx.run.app https://yyy.vercel.app\n' +
      '  Add --deep for template/VAPID/CORS-preflight/frontend bundle checks.\n' +
      '  Or set VERIFY_API_BASE and optionally VERIFY_FRONTEND_ORIGIN',
  )
  process.exit(1)
}

const base = apiBase.replace(/\/$/, '')

/** รวมสายเหตุ Error.cause (Node fetch / undici มักซ้อนกัน) */
function errorChain(e) {
  const parts = []
  let cur = e
  for (let d = 0; d < 8 && cur; d++) {
    if (cur instanceof Error) {
      parts.push(cur.message)
      cur = cur.cause
    } else {
      parts.push(String(cur))
      break
    }
  }
  return parts.join(' → ')
}

/**
 * fetch พร้อม retry สั้นๆ (เครือข่ายหลุด/ชั่วคราว) และ error ที่บอก URL ชัด
 */
async function fetchOk(url, init) {
  const retries = 3
  let lastErr
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, init)
    } catch (e) {
      lastErr = e
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)))
      }
    }
  }
  throw new Error(`${errorChain(lastErr)} (after ${retries} tries) — URL: ${url}`)
}

function expectCors(origin, res, label) {
  const allow = res.headers.get('access-control-allow-origin')
  if (!allow) {
    throw new Error(`${label}: no Access-Control-Allow-Origin for Origin "${origin}"`)
  }
  if (allow !== '*' && allow !== origin) {
    throw new Error(`${label}: Access-Control-Allow-Origin is "${allow}", expected "${origin}"`)
  }
}

async function main() {
  const healthUrl = `${base}/health`
  const r1 = await fetchOk(healthUrl)
  if (!r1.ok) {
    throw new Error(`GET ${healthUrl} → HTTP ${r1.status}`)
  }
  const j = await r1.json().catch(() => null)
  if (!j?.ok) {
    throw new Error(`GET /health body missing { ok: true }: ${JSON.stringify(j)}`)
  }
  console.log('OK:', healthUrl, '→', JSON.stringify(j))

  const summaryUrl = `${base}/api/admin/members/summary`
  const rSum = await fetchOk(summaryUrl)
  if (rSum.status === 404) {
    throw new Error(
      `GET ${summaryUrl} → 404. Deploy the latest backend so GET /api/admin/members/summary exists.`,
    )
  }
  if (rSum.status !== 401 && rSum.status !== 500) {
    const t = await rSum.text()
    throw new Error(
      `GET ${summaryUrl} (no auth probe) → unexpected HTTP ${rSum.status}: ${t.slice(0, 240)}`,
    )
  }
  console.log('OK: admin import summary route exists (no-key probe → HTTP', `${rSum.status})`)

  const lineOAuthStateUrl = `${base}/api/auth/line/oauth-state`
  const rOAuthStateProbe = await fetchOk(lineOAuthStateUrl, { method: 'GET', cache: 'no-store' })
  if (rOAuthStateProbe.status === 404) {
    throw new Error(
      'GET /api/auth/line/oauth-state → HTTP 404 — Cloud Run ยังรัน image เก่า (ไม่มี route นี้). docker build + gcloud run deploy จาก repo ล่าสุด',
    )
  }
  if (rOAuthStateProbe.status !== 200 && rOAuthStateProbe.status !== 500) {
    throw new Error(`GET /api/auth/line/oauth-state → unexpected HTTP ${rOAuthStateProbe.status}`)
  }
  console.log('OK: LINE oauth-state route present (HTTP', rOAuthStateProbe.status + ')')

  if (!frontendOrigin?.trim()) {
    console.log('Skip: CORS check (pass 2nd arg or VERIFY_FRONTEND_ORIGIN)')
    if (deep) {
      console.warn('Skip: --deep frontend checks need FRONTEND_ORIGIN (2nd arg)')
    }
    return
  }

  const origin = frontendOrigin.trim()

  const r2 = await fetchOk(healthUrl, { headers: { Origin: origin } })
  expectCors(origin, r2, 'GET /health')
  console.log('OK: CORS for Origin', origin, '→', r2.headers.get('access-control-allow-origin'))

  if (!deep) {
    return
  }

  console.log('\n--- Deep checks ---\n')

  const rRoot = await fetchOk(`${base}/`)
  if (!rRoot.ok) {
    throw new Error(`GET ${base}/ → HTTP ${rRoot.status}`)
  }
  const rootJson = await rRoot.json().catch(() => null)
  if (!rootJson?.ok || !rootJson?.paths) {
    throw new Error(`GET / expected { ok, paths }: got ${JSON.stringify(rootJson)?.slice(0, 200)}`)
  }
  console.log('OK: GET / → API root JSON (paths.health =', rootJson.paths?.health ?? 'n/a', ')')

  const csvUrl = `${base}/api/admin/members/import-template.csv`
  const rCsv = await fetchOk(csvUrl)
  if (!rCsv.ok) {
    throw new Error(`GET import-template.csv → HTTP ${rCsv.status}`)
  }
  const csvText = await rCsv.text()
  if (!csvText.includes('รุ่น') || !csvText.includes('ชื่อ')) {
    throw new Error('import-template.csv: expected Thai headers รุ่น / ชื่อ in body')
  }
  console.log('OK: import-template.csv (Thai headers present, length', csvText.length, ')')

  const xlsxUrl = `${base}/api/admin/members/import-template.xlsx`
  const rXlsx = await fetchOk(xlsxUrl)
  if (!rXlsx.ok) {
    throw new Error(`GET import-template.xlsx → HTTP ${rXlsx.status}`)
  }
  const xlsxBuf = await rXlsx.arrayBuffer()
  const u8 = new Uint8Array(xlsxBuf.slice(0, 4))
  const zipSig = u8[0] === 0x50 && u8[1] === 0x4b
  if (!zipSig) {
    throw new Error('import-template.xlsx: expected ZIP signature (xlsx)')
  }
  console.log('OK: import-template.xlsx (ZIP/xlsx signature, bytes', xlsxBuf.byteLength, ')')

  const vapidUrl = `${base}/api/push/vapid-public`
  const rV = await fetchOk(vapidUrl)
  const vj = await rV.json().catch(() => null)
  if (rV.ok && vj?.publicKey && typeof vj.publicKey === 'string') {
    console.log('OK: VAPID public key exposed (push opt-in can work)')
  } else if (rV.status === 503 && vj?.error) {
    console.log('WARN: VAPID not configured (503) — Web Push opt-in will show error until env set on API')
  } else {
    throw new Error(
      `GET /api/push/vapid-public → unexpected HTTP ${rV.status}: ${JSON.stringify(vj)?.slice(0, 120)}`,
    )
  }

  const lineTokenUrl = `${base}/api/auth/line/token`
  const rLine = await fetchOk(lineTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({}),
  })
  const lineJ = await rLine.json().catch(() => null)
  const errText = String(lineJ?.error ?? '')
  const lineTokenBadBody =
    rLine.status === 400 &&
    errText &&
    (errText === 'code and redirect_uri are required' ||
      (errText.includes('code') && errText.includes('redirect_uri')))
  if (!lineTokenBadBody) {
    throw new Error(
      `POST /api/auth/line/token (empty body) → expected HTTP 400 + code/redirect_uri error, got ${rLine.status} ${JSON.stringify(lineJ)?.slice(0, 160)}`,
    )
  }
  console.log('OK: LINE token route responds (400 when body empty — expected)')

  const preUrl = `${base}/api/members/verify-link`
  const rOpt = await fetchOk(preUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  expectCors(origin, rOpt, 'OPTIONS /api/members/verify-link')
  const optAllowMethods = rOpt.headers.get('access-control-allow-methods')
  if (optAllowMethods && !optAllowMethods.toUpperCase().includes('POST')) {
    console.warn('WARN: CORS allow-methods may omit POST:', optAllowMethods)
  } else {
    console.log('OK: CORS preflight OPTIONS verify-link →', rOpt.status, {
      allowMethods: optAllowMethods ?? '(not sent)',
    })
  }

  const fe = origin.replace(/\/$/, '')
  const rHtml = await fetchOk(fe + '/')
  if (!rHtml.ok) {
    throw new Error(`GET ${fe}/ → HTTP ${rHtml.status}`)
  }
  const html = await rHtml.text()
  const m = html.match(/src="(\/assets\/[^"]+\.js)"/)
  const looksLikeViteDev = html.includes('@vite/client') || html.includes('"/src/main') || html.includes("'/src/main")
  if (!m && looksLikeViteDev) {
    console.log('OK: frontend index looks like Vite dev — skip production-bundle API host check')
    console.log('\n--- Deep checks passed ---')
    return
  }
  if (!m) {
    throw new Error('Frontend index: no /assets/*.js script tag (not a Vite production build?)')
  }
  const jsPath = m[1]
  const rJs = await fetchOk(fe + jsPath)
  if (!rJs.ok) {
    throw new Error(`GET ${jsPath} → HTTP ${rJs.status}`)
  }
  const jsText = await rJs.text()
  const apiHost = base.replace(/^https?:\/\//, '')
  if (!jsText.includes(apiHost)) {
    throw new Error(
      `Frontend bundle does not contain API host "${apiHost}". ` +
        `Rebuild Vercel with VITE_API_URL=${base} (Settings → Env → Production).`,
    )
  }
  console.log('OK: production JS contains API host', apiHost)
  console.log('\n--- Deep checks passed ---')
}

main().catch((e) => {
  console.error('VERIFY FAILED:', e instanceof Error ? e.message : String(e))
  if (e instanceof Error && e.stack) {
    console.error(e.stack.split('\n').slice(0, 5).join('\n'))
  }
  process.exit(1)
})
