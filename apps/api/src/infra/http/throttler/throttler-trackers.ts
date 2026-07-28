import { createHash } from 'node:crypto'

const SESSION_COOKIE_SUFFIX = 'session_token'

export function ipTracker(req: Record<string, unknown>): string {
  const ip = typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown'
  return `ip:${ip}`
}

export function identityTracker(req: Record<string, unknown>): string {
  const token = sessionToken(req)
  if (token) return `sess:${createHash('sha256').update(token).digest('hex')}`
  return ipTracker(req)
}

function sessionToken(req: Record<string, unknown>): string | null {
  const headers = req.headers as Record<string, unknown> | undefined
  const cookieHeader = headers?.cookie
  if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) return null

  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (!name.endsWith(SESSION_COOKIE_SUFFIX)) continue
    const value = part.slice(eq + 1).trim()
    if (value.length > 0) return value
  }
  return null
}
