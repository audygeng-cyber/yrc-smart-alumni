#!/usr/bin/env node
/**
 * Post-deploy smoke test: GET /health and optional CORS header check.
 *
 * Usage:
 *   node scripts/verify-deployment.mjs <API_BASE_URL> [FRONTEND_ORIGIN]
 *   VERIFY_API_BASE=https://xxx.run.app VERIFY_FRONTEND_ORIGIN=https://yyy.vercel.app node scripts/verify-deployment.mjs
 */

const apiBase = process.env.VERIFY_API_BASE || process.argv[2]
const frontendOrigin = process.env.VERIFY_FRONTEND_ORIGIN || process.argv[3]

if (!apiBase?.trim()) {
  console.error(
    'Missing API base URL.\n' +
      '  Example: node scripts/verify-deployment.mjs https://xxx.run.app https://yyy.vercel.app\n' +
      '  Or set VERIFY_API_BASE and optionally VERIFY_FRONTEND_ORIGIN',
  )
  process.exit(1)
}

const base = apiBase.replace(/\/$/, '')

async function main() {
  const healthUrl = `${base}/health`
  const r1 = await fetch(healthUrl)
  if (!r1.ok) {
    throw new Error(`GET ${healthUrl} → HTTP ${r1.status}`)
  }
  const j = await r1.json().catch(() => null)
  if (!j?.ok) {
    throw new Error(`GET /health body missing { ok: true }: ${JSON.stringify(j)}`)
  }
  console.log('OK:', healthUrl, '→', JSON.stringify(j))

  if (!frontendOrigin?.trim()) {
    console.log('Skip: CORS check (pass 2nd arg or VERIFY_FRONTEND_ORIGIN)')
    return
  }

  const origin = frontendOrigin.trim()
  const r2 = await fetch(healthUrl, { headers: { Origin: origin } })
  const allow = r2.headers.get('access-control-allow-origin')
  if (!allow) {
    throw new Error(
      `CORS: no Access-Control-Allow-Origin for Origin "${origin}". ` +
        `Set FRONTEND_ORIGINS on Cloud Run to include this URL.`,
    )
  }
  if (allow !== '*' && allow !== origin) {
    throw new Error(
      `CORS: Access-Control-Allow-Origin is "${allow}", expected "${origin}"`,
    )
  }
  console.log('OK: CORS for Origin', origin, '→', allow)
}

main().catch((e) => {
  console.error('VERIFY FAILED:', e.message)
  process.exit(1)
})
