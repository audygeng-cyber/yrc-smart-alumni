#!/usr/bin/env node
/**
 * สร้าง backend/.env และ frontend/.env จาก .env.example ถ้ายังไม่มี
 * ใช้ครั้งแรกหลัง clone — จากนั้นแก้ backend/.env ใส่ Supabase และคีย์ Admin
 */

import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function copyIfMissing(exampleRel, targetRel) {
  const example = join(root, exampleRel)
  const target = join(root, targetRel)
  if (existsSync(target)) {
    console.log(`ข้าม (มีไฟล์แล้ว): ${targetRel}`)
    return
  }
  if (!existsSync(example)) {
    console.error(`ไม่พบ: ${exampleRel}`)
    process.exitCode = 1
    return
  }
  copyFileSync(example, target)
  console.log(`สร้างแล้ว: ${targetRel} ← ${exampleRel}`)
}

copyIfMissing('backend/.env.example', 'backend/.env')
copyIfMissing('frontend/.env.example', 'frontend/.env')

console.log(
  '\nถัดไป: แก้ backend/.env ใส่ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_UPLOAD_KEY แล้วรัน npm run dev\n' +
    '(ถ้ายังไม่มี Supabase — GET /api/portal/* ยังใช้ข้อมูลตัวอย่างในโค้ดได้)',
)
