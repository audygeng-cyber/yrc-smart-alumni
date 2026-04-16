import { describe, expect, it } from 'vitest'
import { HEADER_TO_DB, IMPORT_TEMPLATE_HEADERS } from './memberImportMap.js'

describe('IMPORT_TEMPLATE_HEADERS', () => {
  it('includes every key from HEADER_TO_DB exactly once', () => {
    const dbKeys = new Set(Object.keys(HEADER_TO_DB))
    const templateSet = new Set(IMPORT_TEMPLATE_HEADERS)
    expect(IMPORT_TEMPLATE_HEADERS.length).toBe(dbKeys.size)
    expect(templateSet.size).toBe(dbKeys.size)
    for (const k of IMPORT_TEMPLATE_HEADERS) {
      expect(dbKeys.has(k), `unexpected template column: ${k}`).toBe(true)
    }
    for (const k of dbKeys) {
      expect(templateSet.has(k), `missing template column: ${k}`).toBe(true)
    }
  })
})
