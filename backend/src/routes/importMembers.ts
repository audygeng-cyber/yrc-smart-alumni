import { Router } from 'express'
import multer from 'multer'
import readXlsxFile from 'read-excel-file/node'
import { getServiceSupabase } from '../lib/supabase.js'
import { buildPostImportSummary } from '../util/postImportSummary.js'
import { HEADER_TO_DB, mapExcelRow } from '../util/memberImportMap.js'
import { sheetRowsToObjects } from '../util/readExcelRows.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } })

const REQUIRED_THAI_HEADERS = ['รุ่น', 'ชื่อ', 'นามสกุล'] as const

export const importMembersRouter = Router()

type SummaryRow = {
  batch: string | null
  first_name: string | null
  last_name: string | null
  line_uid: string | null
  membership_status: string | null
}

async function fetchSummaryRows(importBatchId?: string): Promise<SummaryRow[]> {
  const supabase = getServiceSupabase()
  const pageSize = 1000
  const rows: SummaryRow[] = []

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    let query = supabase
      .from('members')
      .select('batch,first_name,last_name,line_uid,membership_status')
      .order('created_at', { ascending: true })
      .range(from, to)

    if (importBatchId) {
      query = query.eq('import_batch_id', importBatchId)
    }

    const { data, error } = await query
    if (error) throw error

    const page = (data ?? []) as SummaryRow[]
    rows.push(...page)

    if (page.length < pageSize) break
  }

  return rows
}

importMembersRouter.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Missing file field "file" (.xlsx)' })
      return
    }

    const sheets = await readXlsxFile(req.file.buffer)
    if (!sheets.length) {
      res.status(400).json({ error: 'Workbook has no sheets' })
      return
    }

    const { data: rawRows } = sheets[0]!
    const rows = sheetRowsToObjects(rawRows)

    if (rows.length === 0) {
      res.status(400).json({ error: 'No data rows' })
      return
    }

    const first = rows[0]!
    const headers = Object.keys(first).map((h) => h.trim())
    for (const reqH of REQUIRED_THAI_HEADERS) {
      if (!headers.includes(reqH)) {
        res.status(400).json({
          error: `Missing required column: "${reqH}"`,
          foundHeaders: headers,
          expectedMappingKeys: Object.keys(HEADER_TO_DB),
        })
        return
      }
    }

    const supabase = getServiceSupabase()

    const { data: batchRow, error: batchErr } = await supabase
      .from('import_batches')
      .insert({
        filename: req.file.originalname,
        row_count: rows.length,
        created_by: 'admin-upload',
      })
      .select('id')
      .single()

    if (batchErr || !batchRow) {
      res.status(500).json({ error: 'Failed to create import_batches', details: batchErr })
      return
    }

    const importBatchId = batchRow.id as string
    const mapped = rows.map((raw) => {
      const trimmed: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) {
        trimmed[k.trim()] = v
      }
      return mapExcelRow(trimmed, importBatchId)
    })

    const chunkSize = 300
    for (let i = 0; i < mapped.length; i += chunkSize) {
      const chunk = mapped.slice(i, i + chunkSize)
      const { error: insErr } = await supabase.from('members').insert(chunk)
      if (insErr) {
        res.status(500).json({
          error: 'Insert failed',
          details: insErr,
          importedSoFar: i,
          importBatchId,
        })
        return
      }
    }

    await supabase.from('import_batches').update({ row_count: mapped.length }).eq('id', importBatchId)

    res.json({
      ok: true,
      importBatchId,
      inserted: mapped.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

importMembersRouter.get('/summary', async (req, res) => {
  try {
    const importBatchIdRaw = typeof req.query.importBatchId === 'string' ? req.query.importBatchId : ''
    const importBatchId = importBatchIdRaw.trim() || undefined

    const rows = await fetchSummaryRows(importBatchId)
    const summary = buildPostImportSummary(rows)

    res.json({
      ok: true,
      importBatchId: importBatchId ?? null,
      summary,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

importMembersRouter.delete('/all', async (_req, res) => {
  try {
    const supabase = getServiceSupabase()
    const { error } = await supabase
      .from('members')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00+00:00')

    if (error) {
      res.status(500).json({ error: 'Delete failed', details: error })
      return
    }

    res.json({ ok: true, message: 'All members deleted' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})
