import { Router } from 'express'
import writeXlsxFile from 'write-excel-file/node'
import { IMPORT_TEMPLATE_HEADERS } from '../util/memberImportMap.js'

export const importTemplateRouter = Router()

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** ดาวน์โหลดได้โดยไม่ต้องมี admin key — เป็นแค่รายชื่อคอลัมน์ */
importTemplateRouter.get('/import-template.csv', (_req, res) => {
  const line = IMPORT_TEMPLATE_HEADERS.map(escapeCsvField).join(',')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="yrc-members-import-template.csv"',
  )
  res.send(`\uFEFF${line}\n`)
})

importTemplateRouter.get('/import-template.xlsx', async (_req, res, next) => {
  try {
    const row = IMPORT_TEMPLATE_HEADERS.map((h) => ({ value: h }))
    const buffer = await writeXlsxFile([row], { buffer: true })
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="yrc-members-import-template.xlsx"',
    )
    res.send(buffer)
  } catch (e) {
    next(e)
  }
})
