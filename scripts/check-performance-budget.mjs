/**
 * เปรียบเทียบ docs/PERFORMANCE_BASELINE.json กับ docs/PERFORMANCE_BUDGETS.json
 * ออกรหัส 0 = ผ่าน, 1 = เกินงบ
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const baselinePath = join(root, 'docs', 'PERFORMANCE_BASELINE.json')
const budgetsPath = join(root, 'docs', 'PERFORMANCE_BUDGETS.json')

function main() {
  if (!existsSync(baselinePath)) {
    console.error('Missing docs/PERFORMANCE_BASELINE.json — run npm run perf:baseline first')
    process.exit(1)
  }
  if (!existsSync(budgetsPath)) {
    console.error('Missing docs/PERFORMANCE_BUDGETS.json')
    process.exit(1)
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8'))

  const mainGzip = baseline.mainIndexJs?.gzip ?? 0
  const totalJs = baseline.jsGzip ?? 0
  const totalAll = baseline.gzipTotal ?? 0

  const failures = []
  if (mainGzip > budgets.maxMainJsGzipBytes) {
    failures.push(`main JS gzip ${mainGzip} > max ${budgets.maxMainJsGzipBytes}`)
  }
  if (totalJs > budgets.maxTotalJsGzipBytes) {
    failures.push(`total JS gzip ${totalJs} > max ${budgets.maxTotalJsGzipBytes}`)
  }
  if (totalAll > budgets.maxTotalAssetsGzipBytes) {
    failures.push(`total assets gzip ${totalAll} > max ${budgets.maxTotalAssetsGzipBytes}`)
  }

  if (failures.length) {
    console.error('Performance budget FAILED:', failures.join('; '))
    process.exit(1)
  }
  console.log(
    `Performance budget OK — main JS gzip ${mainGzip}, total JS gzip ${totalJs}, all gzip ${totalAll}`,
  )
}

main()
