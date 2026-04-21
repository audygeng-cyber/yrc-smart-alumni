/**
 * สรุป one-page: baseline + งบ + ลิงก์ไฟล์ที่เกี่ยวข้อง → docs/PERFORMANCE_SUMMARY.md
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const docs = join(root, 'docs')

function kb(n) {
  return `${(n / 1024).toFixed(2)} kB`
}

function main() {
  const baselinePath = join(docs, 'PERFORMANCE_BASELINE.json')
  const budgetsPath = join(docs, 'PERFORMANCE_BUDGETS.json')
  const latestPath = join(docs, 'PERFORMANCE_LATEST.json')

  if (!existsSync(baselinePath)) {
    console.error('Missing PERFORMANCE_BASELINE.json')
    process.exit(1)
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const budgets = existsSync(budgetsPath) ? JSON.parse(readFileSync(budgetsPath, 'utf8')) : null
  const latest = existsSync(latestPath) ? JSON.parse(readFileSync(latestPath, 'utf8')) : null

  const mainGzip = baseline.mainIndexJs?.gzip ?? 0
  const totalJs = baseline.jsGzip ?? 0
  const totalAll = baseline.gzipTotal ?? 0

  let budgetLine = '—'
  if (budgets) {
    const ok =
      mainGzip <= budgets.maxMainJsGzipBytes &&
      totalJs <= budgets.maxTotalJsGzipBytes &&
      totalAll <= budgets.maxTotalAssetsGzipBytes
    budgetLine = ok ? 'PASS' : 'FAIL (ดูรายละเอียดด้านล่าง)'
  }

  const lines = [
    '# Performance summary',
    '',
    `Snapshot: ${baseline.generatedAt}`,
    '',
    '## Status',
    '',
    `- Budget check: **${budgetLine}**`,
    latest ? `- LATEST pointer: main JS gzip ${latest.mainJsGzipBytes ?? 'n/a'} bytes` : null,
    '',
    '## Metrics (gzip)',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Main index JS | ${kb(mainGzip)} |`,
    `| Total JavaScript | ${kb(totalJs)} |`,
    `| All tracked assets | ${kb(totalAll)} |`,
    '',
  ].filter(Boolean)

  if (budgets) {
    lines.push(
      '## Budgets',
      '',
      '| Limit | Max (bytes) | Current |',
      '|---|---:|---:|',
      `| Main JS gzip | ${budgets.maxMainJsGzipBytes} | ${mainGzip} |`,
      `| Total JS gzip | ${budgets.maxTotalJsGzipBytes} | ${totalJs} |`,
      `| Total assets gzip | ${budgets.maxTotalAssetsGzipBytes} | ${totalAll} |`,
      '',
    )
  }

  lines.push(
    '## Source files',
    '',
    '- `docs/PERFORMANCE_BASELINE.json` / `.md`',
    '- `docs/PERFORMANCE_BUDGETS.json`',
    '- `docs/PERFORMANCE_LATEST.json`',
    '- `docs/PERFORMANCE_HISTORY.json`',
    '',
    '## Legacy / snapshot bundles',
    '',
    'ไฟล์เช่น `PERFORMANCE_DASHBOARD.md`, `PERFORMANCE_COMPARE.md`, `PERFORMANCE_BUNDLES_INDEX.*`, `docs/performance-bundles/**` อาจเป็นของชุดเครื่องมือเก่าหรือสร้างด้วยสคริปต์อื่น — **อย่าอ้างตัวเลขจากไฟล์เหล่านั้น** หากไม่ได้ regenerate หลังเปลี่ยนโครงสร้าง bundle (เช่น main chunk รวมใน `assets/index-*.js`) แหล่งจริงสำหรับงบและ baseline คือไฟล์ใน `## Source files` ด้านบน',
    '',
  )

  mkdirSync(docs, { recursive: true })
  writeFileSync(join(docs, 'PERFORMANCE_SUMMARY.md'), lines.join('\n'), 'utf8')
  console.log('Wrote docs/PERFORMANCE_SUMMARY.md')
}

main()
