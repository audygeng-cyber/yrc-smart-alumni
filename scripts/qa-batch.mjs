/**
 * ชุดตรวจแบบรวม ~50 ขั้น (ไฟล์หลัก, migration, สตริงสำคัญในโค้ด)
 * รัน: node scripts/qa-batch.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  const p = join(root, rel)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

function ok(name, pass) {
  const s = pass ? '✓' : '✗'
  console.log(`  [${s}] ${name}`)
  return pass
}

const checks = []

// --- 1–10: runtime & โครงโปรเจกต์ ---
checks.push(() =>
  ok('Node major >= 20', Number.parseInt(process.version.slice(1), 10) >= 20),
)
checks.push(() => ok('package.json', existsSync(join(root, 'package.json'))))
checks.push(() => ok('workspaces: frontend', existsSync(join(root, 'frontend/package.json'))))
checks.push(() => ok('workspaces: backend', existsSync(join(root, 'backend/package.json'))))
checks.push(() => ok('supabase/migrations', existsSync(join(root, 'supabase/migrations'))))
checks.push(() => ok('backend/src/app.ts', existsSync(join(root, 'backend/src/app.ts'))))
checks.push(() => ok('backend/src/routes/members.ts', existsSync(join(root, 'backend/src/routes/members.ts'))))
checks.push(() => ok('backend/src/routes/financeAdmin.ts', existsSync(join(root, 'backend/src/routes/financeAdmin.ts'))))
checks.push(() => ok('backend/src/routes/schoolActivitiesAdmin.ts', existsSync(join(root, 'backend/src/routes/schoolActivitiesAdmin.ts'))))
checks.push(() => ok('scripts/verify-repo-health.mjs', existsSync(join(root, 'scripts/verify-repo-health.mjs'))))

// --- 11–20: util & test ---
checks.push(() => ok('backend/src/util/csvRows.ts', existsSync(join(root, 'backend/src/util/csvRows.ts'))))
checks.push(() => ok('backend/src/util/csvUtf8.ts', existsSync(join(root, 'backend/src/util/csvUtf8.ts'))))
checks.push(() => ok('backend/src/app.test.ts', existsSync(join(root, 'backend/src/app.test.ts'))))
checks.push(() => ok('frontend/src/App.tsx', existsSync(join(root, 'frontend/src/App.tsx'))))
checks.push(() => ok('frontend/src/portal/memberPages.tsx', existsSync(join(root, 'frontend/src/portal/memberPages.tsx'))))
checks.push(() => ok('frontend/src/portal/dataAdapter.ts', existsSync(join(root, 'frontend/src/portal/dataAdapter.ts'))))
checks.push(() => ok('docs/ACCOUNTING_FLOW.md', existsSync(join(root, 'docs/ACCOUNTING_FLOW.md'))))
checks.push(() => {
  const mig = join(root, 'supabase/migrations')
  const n = existsSync(mig) ? readdirSync(mig).filter((f) => f.endsWith('.sql')).length : 0
  return ok('migrations .sql count >= 20', n >= 20)
})
checks.push(() => {
  const mig = join(root, 'supabase/migrations')
  const n = existsSync(mig) ? readdirSync(mig).filter((f) => f.endsWith('.sql')).length : 0
  return ok('migrations .sql count <= 500 (sanity)', n <= 500)
})
checks.push(() => ok('list-supabase-migrations.mjs', existsSync(join(root, 'scripts/list-supabase-migrations.mjs'))))

// --- 21–30: backend สตริงสำคัญ ---
const membersSrc = () => read('backend/src/routes/members.ts')
const financeSrc = () => read('backend/src/routes/financeAdmin.ts')
const portalSrc = () => read('backend/src/lib/portalFromDb.ts')
const schoolAdminSrc = () => read('backend/src/routes/schoolActivitiesAdmin.ts')
const csvRowsSrc = () => read('backend/src/util/csvRows.ts')
const appTestSrc = () => read('backend/src/app.test.ts')

checks.push(() => ok('members: donations/history route', membersSrc().includes('/donations/history')))
checks.push(() => ok('members: POST /donations', membersSrc().includes("membersRouter.post('/donations'")))
checks.push(() => ok('financeAdmin: rowsToCsv import', financeSrc().includes("from '../util/csvRows.js'")))
checks.push(() => ok('financeAdmin: withUtf8Bom', financeSrc().includes("from '../util/csvUtf8.js'")))
checks.push(() => ok('financeAdmin: journal_entry_id insert', financeSrc().includes('journal_entry_id')))
checks.push(() => ok('portalFromDb: yupparajDonationActivities', portalSrc().includes('yupparajDonationActivities')))
checks.push(() => ok('portalFromDb: fund_scope yupparaj exclude', portalSrc().includes("r.fund_scope === 'yupparaj_school'")))
checks.push(() => ok('schoolActivitiesAdmin: donations/summary', schoolAdminSrc().includes('/donations/summary')))
checks.push(() => ok('schoolActivitiesAdmin: yupparaj-export.csv', schoolAdminSrc().includes('yupparaj-export.csv')))
checks.push(() => ok('csvRows: rowsToCsv', /function\s+rowsToCsv|export\s+function\s+rowsToCsv/.test(csvRowsSrc())))

// --- 31–40: app test & migration ชื่อ ---
checks.push(() => ok('app.test: donations/history 400', appTestSrc().includes('/donations/history')))
checks.push(() => ok('app.test: yupparajDonationActivities', appTestSrc().includes('yupparajDonationActivities')))
const appSrc = () => read('backend/src/app.ts')
checks.push(() => ok('app.ts: membersDonations doc', appSrc().includes('membersDonations')))
checks.push(() => ok('app.ts: school-activities donations', appSrc().includes('donations/summary')))
checks.push(() => {
  const mig = join(root, 'supabase/migrations')
  const files = existsSync(mig) ? readdirSync(mig).filter((f) => f.endsWith('.sql')) : []
  const allNamed = files.every((f) => /^\d{14}_/.test(f))
  return ok('migration filenames: YYYYMMDDHHmmss_', files.length === 0 || allNamed)
})
checks.push(() => {
  const f = read('supabase/migrations/20260418140000_school_donations_fund_scope.sql')
  return ok('migration school_donations_fund_scope: fund_scope', f.includes('fund_scope'))
})
checks.push(() => {
  const f = read('supabase/migrations/20260418120000_payment_requests_journal_entry_link.sql')
  return ok('migration journal_entry link', f.includes('journal_entry_id'))
})
checks.push(() => ok('ACCOUNTING_FLOW: journal_entry_id', read('docs/ACCOUNTING_FLOW.md').includes('journal_entry_id')))
checks.push(() => ok('ACCOUNTING_FLOW: yupparaj_school', read('docs/ACCOUNTING_FLOW.md').includes('yupparaj_school')))
checks.push(() => ok('ACCOUNTING_FLOW: ลงชื่อเข้าประชุม (UTF-8)', read('docs/ACCOUNTING_FLOW.md').includes('ลงชื่อเข้าประชุม')))

// --- 41–50: frontend & ไม่มี replacement char ในไฟล์หลัก ---
const memberPages = () => read('frontend/src/portal/memberPages.tsx')
const dataAdapter = () => read('frontend/src/portal/dataAdapter.ts')
const adminSchool = () => read('frontend/src/components/AdminSchoolActivitiesPanel.tsx')

checks.push(() => ok('memberPages: บริจาค / donation', /บริจาค|donation/i.test(memberPages())))
checks.push(() => ok('dataAdapter: yupparaj', dataAdapter().includes('yupparaj')))
checks.push(() => ok('AdminSchoolActivitiesPanel: fund_scope', adminSchool().includes('fund_scope')))
checks.push(() => ok('AdminSchoolActivitiesPanel: yupparaj_school option', adminSchool().includes('yupparaj_school')))
checks.push(() => ok('members.ts: fund_scope insert', membersSrc().includes('fund_scope')))
checks.push(() => ok('financeAdmin: yupparaj_school filter', financeSrc().includes('yupparaj_school')))
checks.push(() => ok('no U+FFFD in members.ts', !membersSrc().includes('\uFFFD')))
checks.push(() => ok('no U+FFFD in financeAdmin.ts', !financeSrc().includes('\uFFFD')))
checks.push(() => ok('no U+FFFD in ACCOUNTING_FLOW.md', !read('docs/ACCOUNTING_FLOW.md').includes('\uFFFD')))
checks.push(() => ok('check count is 50', checks.length === 50))

console.log('[qa-batch] running', checks.length, 'checks …\n')

let failed = 0
for (let i = 0; i < checks.length; i++) {
  try {
    if (!checks[i]()) failed++
  } catch (e) {
    console.error(`  [✗] check ${i + 1} threw:`, e)
    failed++
  }
}

console.log('')
if (failed > 0) {
  console.error(`[qa-batch] FAILED: ${failed} check(s)`)
  process.exit(1)
}
console.log('[qa-batch] all checks passed')
process.exit(0)
