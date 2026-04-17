#!/usr/bin/env node
/**
 * พิมพ์ลิงก์ไปหน้า Actions ของ remote origin — เปิดในเบราว์เซอร์เพื่อดู workflow หลัง push
 */
import { execSync } from 'node:child_process'

let remote = ''
try {
  remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
} catch {
  console.error('No git remote "origin" — add with: git remote add origin <url>')
  process.exit(1)
}

let path = 'audygeng-cyber/yrc-smart-alumni'
const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/i)
if (m) path = `${m[1]}/${m[2].replace(/\.git$/i, '')}`

const actionsUrl = `https://github.com/${path}/actions`
console.log(actionsUrl)
