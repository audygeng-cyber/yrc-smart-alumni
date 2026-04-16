#!/usr/bin/env node
/**
 * แสดงไฟล์ migration ใน supabase/migrations ตามลำดับชื่อ (เวลาใน prefix)
 * ใช้เช็คก่อนรันใน Supabase SQL Editor หรือ supabase db push
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', 'supabase', 'migrations')

async function main() {
  const names = (await readdir(root)).filter((f) => f.endsWith('.sql')).sort()
  if (!names.length) {
    console.log('No .sql files in supabase/migrations')
    return
  }
  console.log('รันใน Supabase Dashboard → SQL → ตามลำดับนี้:\n')
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const p = join(root, name)
    const head = (await readFile(p, 'utf8')).split('\n').slice(0, 3).join('\n')
    console.log(`${i + 1}. ${name}`)
    console.log(head.split('\n').map((l) => '   ' + l).join('\n'))
    console.log('')
  }
  console.log('หรือ (ถ้า link โปรเจกต์แล้ว): npx supabase db push')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
