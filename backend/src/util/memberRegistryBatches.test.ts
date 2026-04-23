import { describe, expect, it } from 'vitest'
import { sortMemberBatchLabels } from './memberRegistryBatches.js'

describe('sortMemberBatchLabels', () => {
  it('sorts numerically within strings', () => {
    expect(['99', '2520', '100'].sort(sortMemberBatchLabels)).toEqual(['99', '100', '2520'])
  })
})
