/**
 * วัดขนาดไฟล์ใน `frontend/dist` — เขียน baseline, อัปเดต history และ LATEST
 *
 * ใช้:
 *   node scripts/measure-frontend-bundle.mjs              # build frontend แล้ววัด
 *   node scripts/measure-frontend-bundle.mjs --skip-build
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const distDir = join(repoRoot, 'frontend', 'dist')
const docsDir = join(repoRoot, 'docs')

const MAX_HISTORY = 80

function parseArgs() {
  const skipBuild = process.argv.includes('--skip-build')
  return { skipBuild }
}

function walkFiles(dir) {
  const out = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) out.push(...walkFiles(p))
    else out.push(p)
  }
  return out
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

/** อ่าน dist และคืนข้อมูล baseline — โยน error ถ้าไม่มี dist */
function measureFrontendDist() {
  if (!existsSync(distDir)) {
    throw new Error(`Missing ${distDir} — run npm run build -w frontend first, or omit --skip-build`)
  }

  const all = walkFiles(distDir).filter((f) => {
    const ext = extname(f)
    return ext === '.js' || ext === '.css' || ext === '.html'
  })

  const assets = all.map((abs) => {
    const buf = readFileSync(abs)
    const gz = gzipSync(buf)
    const name = relative(distDir, abs).replace(/\\/g, '/')
    return {
      name,
      ext: extname(abs),
      raw: buf.length,
      gzip: gz.length,
    }
  })

  const jsAssets = assets.filter((a) => a.ext === '.js')
  const cssAssets = assets.filter((a) => a.ext === '.css')

  const jsRaw = jsAssets.reduce((s, a) => s + a.raw, 0)
  const jsGzip = jsAssets.reduce((s, a) => s + a.gzip, 0)
  const cssRaw = cssAssets.reduce((s, a) => s + a.raw, 0)
  const cssGzip = cssAssets.reduce((s, a) => s + a.gzip, 0)
  const rawTotal = assets.reduce((s, a) => s + a.raw, 0)
  const gzipTotal = assets.reduce((s, a) => s + a.gzip, 0)

  const indexJs = jsAssets.filter((a) => /(^|\/)index-[^/]+\.js$/.test(a.name)).sort((a, b) => b.raw - a.raw)[0]
  const mainIndexJs = indexJs
    ? { name: indexJs.name, ext: '.js', raw: indexJs.raw, gzip: indexJs.gzip }
    : { name: '', ext: '.js', raw: 0, gzip: 0 }

  const topRaw = [...assets].sort((a, b) => b.raw - a.raw).slice(0, 12)
  const topGzip = [...assets].sort((a, b) => b.gzip - a.gzip).slice(0, 12)

  const generatedAt = new Date().toISOString()

  return {
    schemaVersion: 1,
    generatedAt,
    rawTotal,
    gzipTotal,
    jsRaw,
    jsGzip,
    cssRaw,
    cssGzip,
    mainIndexJs,
    topRaw,
    topGzip,
  }
}

function appendHistory(entry) {
  const path = join(docsDir, 'PERFORMANCE_HISTORY.json')
  let list = []
  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) list = parsed
    } catch {
      list = []
    }
  }
  list.push(entry)
  if (list.length > MAX_HISTORY) list = list.slice(-MAX_HISTORY)
  writeFileSync(path, `${JSON.stringify(list, null, 2)}\n`, 'utf8')
}

function writeLatestJson(baseline) {
  const latest = {
    schemaVersion: 1,
    generatedAt: baseline.generatedAt,
    snapshotGeneratedAt: baseline.generatedAt,
    mainJsGzipBytes: baseline.mainIndexJs.gzip,
    totalJsGzipBytes: baseline.jsGzip,
    totalAssetsGzipBytes: baseline.gzipTotal,
    mainIndexJsName: baseline.mainIndexJs.name || null,
  }
  writeFileSync(join(docsDir, 'PERFORMANCE_LATEST.json'), `${JSON.stringify(latest, null, 2)}\n`, 'utf8')
}

function writeBaselineFiles(json) {
  mkdirSync(docsDir, { recursive: true })
  writeFileSync(join(docsDir, 'PERFORMANCE_BASELINE.json'), `${JSON.stringify(json, null, 2)}\n`, 'utf8')

  const { mainIndexJs } = json
  const md = [
    '# Frontend Performance Baseline',
    '',
    `Generated at: ${json.generatedAt}`,
    '',
    '## Totals',
    '',
    `- All assets: ${formatKb(json.rawTotal)} (gzip ${formatKb(json.gzipTotal)})`,
    `- JavaScript: ${formatKb(json.jsRaw)} (gzip ${formatKb(json.jsGzip)})`,
    `- CSS: ${formatKb(json.cssRaw)} (gzip ${formatKb(json.cssGzip)})`,
    mainIndexJs.name
      ? `- Main chunk (\`${mainIndexJs.name}\`): ${formatKb(mainIndexJs.raw)} (gzip ${formatKb(mainIndexJs.gzip)})`
      : '- Main chunk: n/a',
    '',
    '## Top 12 Assets (by raw size)',
    '',
    '| Asset | Raw | Gzip |',
    '|---|---:|---:|',
    ...json.topRaw.map((a) => `| \`${a.name}\` | ${formatKb(a.raw)} | ${formatKb(a.gzip)} |`),
    '',
    '## Top 12 Assets (by gzip size)',
    '',
    '| Asset | Raw | Gzip |',
    '|---|---:|---:|',
    ...json.topGzip.map((a) => `| \`${a.name}\` | ${formatKb(a.raw)} | ${formatKb(a.gzip)} |`),
    '',
  ].join('\n')

  writeFileSync(join(docsDir, 'PERFORMANCE_BASELINE.md'), md, 'utf8')
}

function main() {
  const { skipBuild } = parseArgs()

  if (!skipBuild) {
    execSync('npm run build -w frontend', { cwd: repoRoot, stdio: 'inherit' })
  }

  const json = measureFrontendDist()
  writeBaselineFiles(json)
  appendHistory(json)
  writeLatestJson(json)

  console.log(
    `Wrote docs/PERFORMANCE_BASELINE.*, PERFORMANCE_LATEST.json, appended PERFORMANCE_HISTORY.json (${formatKb(json.gzipTotal)} gzip total)`,
  )
}

main()
