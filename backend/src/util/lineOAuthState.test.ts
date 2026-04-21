import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSignedLineOAuthState, verifySignedLineOAuthState } from './lineOAuthState.js'

describe('lineOAuthState', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.LINE_OAUTH_STATE_SECRET
    delete process.env.LINE_CHANNEL_SECRET
  })

  it('create returns null without secret', () => {
    expect(createSignedLineOAuthState()).toBeNull()
  })

  it('round-trip verify with LINE_CHANNEL_SECRET', () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', 'test-secret-for-hmac')
    const s = createSignedLineOAuthState()
    expect(s).toBeTruthy()
    expect(verifySignedLineOAuthState(s!)).toBe(true)
  })

  it('rejects tampered state', () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', 'same-secret')
    const s = createSignedLineOAuthState()!
    const tampered = `${s.slice(0, -2)}xx`
    expect(verifySignedLineOAuthState(tampered)).toBe(false)
  })

  it('prefers LINE_OAUTH_STATE_SECRET over LINE_CHANNEL_SECRET', () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', 'channel')
    vi.stubEnv('LINE_OAUTH_STATE_SECRET', 'dedicated')
    const s = createSignedLineOAuthState()!
    expect(verifySignedLineOAuthState(s)).toBe(true)
    vi.unstubAllEnvs()
    vi.stubEnv('LINE_CHANNEL_SECRET', 'channel')
    delete process.env.LINE_OAUTH_STATE_SECRET
    expect(verifySignedLineOAuthState(s)).toBe(false)
  })
})
