#!/usr/bin/env node
/**
 * ใส่การตั้งค่า Cursor/VS Code ให้ Ctrl+C ในเทอร์มินัลส่ง SIGINT เข้าเชลล์
 * และเปิด sendKeybindingsToShell (รวมถึงใน settings.json)
 *
 * รัน: npm run cursor:terminal-fix
 * แล้ว Reload Window ใน Cursor (Ctrl+Shift+P → Developer: Reload Window)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const termCtrlC = {
  key: 'ctrl+c',
  command: 'workbench.action.terminal.sendSequence',
  args: { text: '\u0003' },
  when: 'terminalFocus',
}

function cursorUserDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Cursor', 'User')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User')
  }
  return path.join(os.homedir(), '.config', 'Cursor', 'User')
}

function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const stripped = raw
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    return JSON.parse(stripped)
  }
}

function mergeKeybindings(dir) {
  const p = path.join(dir, 'keybindings.json')
  let arr = []
  if (fs.existsSync(p)) {
    try {
      const data = parseJsonLoose(fs.readFileSync(p, 'utf8'))
      arr = Array.isArray(data) ? data : []
    } catch {
      console.warn('แก้ keybindings.json ไม่ได้ (parse ไม่ผ่าน) — สำรองเป็น', p + '.bak')
      fs.copyFileSync(p, p + '.bak')
      arr = []
    }
  }
  const has = arr.some(
    (x) =>
      x &&
      x.key === termCtrlC.key &&
      x.command === termCtrlC.command &&
      x.when === termCtrlC.when,
  )
  if (!has) {
    arr.unshift(termCtrlC)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n', 'utf8')
    console.log('OK: เพิ่ม Ctrl+C → เทอร์มินัลใน', p)
  } else {
    console.log('OK: มี keybinding Ctrl+C เทอร์มินัลอยู่แล้ว —', p)
  }
}

function mergeSettings(dir) {
  const p = path.join(dir, 'settings.json')
  let obj = {}
  if (fs.existsSync(p)) {
    try {
      obj = parseJsonLoose(fs.readFileSync(p, 'utf8'))
      if (typeof obj !== 'object' || obj === null) obj = {}
    } catch (e) {
      console.error('อ่าน settings.json ไม่ได้:', e.message)
      return
    }
  }
  if (obj['terminal.integrated.sendKeybindingsToShell'] === true) {
    console.log('OK: settings มี sendKeybindingsToShell แล้ว —', p)
    return
  }
  obj['terminal.integrated.sendKeybindingsToShell'] = true
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  console.log('OK: ตั้ง terminal.integrated.sendKeybindingsToShell ใน', p)
}

const dir = cursorUserDir()
console.log('Cursor User folder:', dir)
mergeKeybindings(dir)
mergeSettings(dir)
console.log('\nขั้นต่อไป: Cursor → Ctrl+Shift+P → พิมพ์ Reload Window → Enter')
console.log('คัดลอกจากเทอร์มินัล: Ctrl+Shift+C (Windows)')
