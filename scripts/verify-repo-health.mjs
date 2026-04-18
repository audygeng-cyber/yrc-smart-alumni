/**
 * ตรวจแบบรวดเร็วว่าไฟล์หลักของโปรเจกต์ยังอยู่ (ใช้คู่กับ CI / qa)
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mustExist = [
  'backend/src/util/csvRows.ts',
  'backend/src/util/csvUtf8.ts',
  'backend/src/app.ts',
  'frontend/package.json',
  'supabase/migrations',
]

let failed = false
for (const rel of mustExist) {
  const p = join(root, rel)
  if (!existsSync(p)) {
    console.error(`[health] missing: ${rel}`)
    failed = true
  }
}

const migDir = join(root, 'supabase/migrations')
if (existsSync(migDir)) {
  const sql = readdirSync(migDir).filter((f) => f.endsWith('.sql'))
  console.log(`[health] supabase migrations: ${sql.length} .sql files`)
}

if (failed) {
  process.exit(1)
}
console.log('[health] ok')
