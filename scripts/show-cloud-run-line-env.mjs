#!/usr/bin/env node
/**
 * แสดงค่า LINE_REDIRECT_URIS / LINE_CHANNEL_ID จาก Cloud Run (ไม่แสดง LINE_CHANNEL_SECRET)
 * ใช้ตรวจว่า backend ตรงกับ Vercel / LINE Console หรือไม่
 *
 * ต้องมี gcloud login + สิทธิ์ดู service
 *
 * Usage:
 *   node scripts/show-cloud-run-line-env.mjs [SERVICE_NAME] [REGION] [PROJECT]
 */

import { execSync } from 'node:child_process'

const service = process.argv[2] || 'yrc-api'
const region = process.argv[3] || 'asia-southeast1'
const project = process.argv[4] || process.env.GCLOUD_PROJECT || 'yrc-smart-alumni'

function gcloudJson() {
  const cmd = [
    'gcloud',
    'run',
    'services',
    'describe',
    service,
    `--region=${region}`,
    `--project=${project}`,
    '--format=json',
  ].join(' ')
  const out = execSync(cmd, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
    windowsHide: true,
  })
  return JSON.parse(out)
}

function main() {
  let data
  try {
    data = gcloudJson()
  } catch (e) {
    console.error('gcloud failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  }
  const env = data?.spec?.template?.spec?.containers?.[0]?.env ?? []
  const map = Object.fromEntries(
    env.map((x) => [x.name, x.value]).filter(([, v]) => v !== undefined && v !== null),
  )
  const redir = map.LINE_REDIRECT_URIS || map.LINE_REDIRECT_URI || '(ไม่ได้ตั้ง)'
  const cid = map.LINE_CHANNEL_ID || '(ไม่ได้ตั้ง)'
  const hasSecret = map.LINE_CHANNEL_SECRET ? 'ตั้งแล้ว (ค่าถูกซ่อน)' : '(ไม่ได้ตั้ง)'

  console.log('Cloud Run service:', service, '/', region, '/', project)
  console.log('')
  console.log('LINE_REDIRECT_URIS หรือ LINE_REDIRECT_URI:')
  console.log(redir)
  console.log('')
  console.log('LINE_CHANNEL_ID:', cid)
  console.log('LINE_CHANNEL_SECRET:', hasSecret)
  console.log('')
  console.log('ให้เทียบกับ Vercel Production:')
  console.log('  VITE_LINE_REDIRECT_URI ต้องตรง **เป๊ะ** กับหนึ่งในค่าที่คั่นด้วย comma ด้านบน')
  console.log('  VITE_LINE_CHANNEL_ID ต้องตรงกับ LINE_CHANNEL_ID')
}

main()
