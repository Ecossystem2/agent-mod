import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { identityTracker, ipTracker } from './throttler-trackers'

function sessKey(token: string): string {
  return `sess:${createHash('sha256').update(token).digest('hex')}`
}

describe('ipTracker', () => {
  it('chaveia pelo req.ip quando presente', () => {
    expect(ipTracker({ ip: '203.0.113.7' })).toBe('ip:203.0.113.7')
  })

  it('usa fallback ip:unknown quando req.ip é undefined', () => {
    expect(ipTracker({})).toBe('ip:unknown')
  })

  it('usa fallback ip:unknown quando req.ip é string vazia', () => {
    expect(ipTracker({ ip: '' })).toBe('ip:unknown')
  })
})

describe('identityTracker', () => {
  it('chaveia por sessão quando há cookie better-auth.session_token', () => {
    const tracker = identityTracker({ headers: { cookie: 'better-auth.session_token=abc123' } })

    expect(tracker).toBe(sessKey('abc123'))
  })

  it('aceita o prefixo __Secure- no cookie de sessão', () => {
    const tracker = identityTracker({
      headers: { cookie: '__Secure-better-auth.session_token=xyz' },
    })

    expect(tracker).toBe(sessKey('xyz'))
  })

  it('encontra o cookie de sessão entre vários cookies', () => {
    const tracker = identityTracker({
      headers: { cookie: 'foo=1; better-auth.session_token=tok; bar=2' },
    })

    expect(tracker).toBe(sessKey('tok'))
  })

  it('ignora cookie sem `=` e ainda encontra a sessão', () => {
    const tracker = identityTracker({
      headers: { cookie: 'foo; better-auth.session_token=tok' },
    })

    expect(tracker).toBe(sessKey('tok'))
  })

  it('cai no IP quando o cookie de sessão tem valor vazio', () => {
    const tracker = identityTracker({
      headers: { cookie: 'better-auth.session_token=; other=1' },
      ip: '203.0.113.7',
    })

    expect(tracker).toBe('ip:203.0.113.7')
  })

  it('chaveia por IP quando não há cookie de sessão', () => {
    const tracker = identityTracker({ headers: { cookie: 'foo=1; bar=2' }, ip: '203.0.113.9' })

    expect(tracker).toBe('ip:203.0.113.9')
  })

  it('chaveia por IP quando não há header de cookie', () => {
    expect(identityTracker({ headers: {}, ip: '198.51.100.4' })).toBe('ip:198.51.100.4')
  })

  it('chaveia por IP quando o header de cookie é string vazia', () => {
    expect(identityTracker({ headers: { cookie: '' }, ip: '198.51.100.5' })).toBe('ip:198.51.100.5')
  })

  it('usa fallback ip:unknown quando não há sessão nem req.ip', () => {
    expect(identityTracker({ headers: {} })).toBe('ip:unknown')
  })
})
