#!/usr/bin/env node
/**
 * Phase 1 — ตรวจความสม่ำเสมอของไฟล์ใน supabase/migrations (บนเครื่อง dev ก่อนรันบน Supabase)
 *
 * ไม่แทนการรัน SQL บน DB — หลังผ่านสคริปต์นี้ ให้รันตามลำดับใน Dashboard หรือ `npx supabase db push`
 * ดูรายละเอียด: npm run migrations:list
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')

/** รูปแบบที่ตกลงกัน: YYYYMMDDHHmmss_description.sql (14 หลัก + underscore) */
const FILENAME_RE = /^(\d{14})_([a-zA-Z0-9][a-zA-Z0-9_]*)\.sql$/

async function main() {
  const all = await readdir(migrationsDir).catch(() => [])
  const sqlFiles = all.filter((f) => f.endsWith('.sql')).sort()

  if (sqlFiles.length === 0) {
    console.error('✗ ไม่พบไฟล์ .sql ใน supabase/migrations')
    process.exit(1)
  }

  const errors = []
  const warnings = []
  const seenTs = new Map()

  for (const name of sqlFiles) {
    const m = FILENAME_RE.exec(name)
    if (!m) {
      errors.push(`ชื่อไฟล์ไม่ตรงรูปแบบ (ต้องเป็น 14 หลักวันที่เวลา + _ + ชื่อ .sql): ${name}`)
      continue
    }
    const ts = m[1]
    if (seenTs.has(ts)) {
      errors.push(`ซ้ำ prefix เวลา ${ts}: "${seenTs.get(ts)}" และ "${name}"`)
    } else {
      seenTs.set(ts, name)
    }

    const content = await readFile(join(migrationsDir, name), 'utf8')
    if (!content.replace(/^\uFEFF/, '').trim()) {
      errors.push(`ไฟล์ว่างหรือมีแต่ช่องว่าง: ${name}`)
    }
  }

  // ลำดับเวลา (string 14 หลัก) ต้องไม่ลดลงเมื่อเรียงชื่อไฟล์
  const timestamps = sqlFiles
    .map((name) => {
      const m = FILENAME_RE.exec(name)
      return m ? m[1] : null
    })
    .filter(Boolean)

  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] < timestamps[i - 1]) {
      errors.push(
        `ลำดับชื่อไฟล์ไม่สอดคล้องเวลา: ${sqlFiles[i - 1]} มาก่อน ${sqlFiles[i]} แต่ timestamp กลับไม่เรียง`,
      )
    }
  }

  console.log(`YRC Smart Alumni — ตรวจ supabase/migrations (${sqlFiles.length} ไฟล์)\n`)
  for (let i = 0; i < sqlFiles.length; i++) {
    console.log(`  ${String(i + 1).padStart(2, ' ')}. ${sqlFiles[i]}`)
  }

  if (warnings.length) {
    console.log('\nคำเตือน:')
    for (const w of warnings) console.log(`  ⚠ ${w}`)
  }

  if (errors.length) {
    console.error('\n✗ ตรวจไม่ผ่าน:')
    for (const e of errors) console.error(`  • ${e}`)
    process.exit(1)
  }

  console.log('\n✓ ชื่อไฟล์และลำดับเวลาโอเค — ไม่มีไฟล์ว่างหรือ timestamp ซ้ำ')
  console.log('\nนโยบาย (Phase 1):')
  console.log('  • อย่าแก้ไฟล์ migration เก่าที่นำไปรันใน dev/staging/production แล้ว — เพิ่มไฟล์ใหม่แทน')
  console.log('  • ทดสอบบน DB เป้าหมาย (dev/staging) ก่อนชี้ production')
  console.log('  • รัน SQL ตามลำดับด้านบน หรือ: npx supabase db push (ถ้า link โปรเจกต์แล้ว)')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
