import { describe, expect, it } from 'vitest'

import { makeJobId } from './make-job-id'

describe('makeJobId', () => {
  it('joins segments with "_" preserving order', () => {
    expect(makeJobId('email', 'welcome', 'user-1')).toBe('email_welcome_user-1')
  })

  it('coerces numeric segments to string', () => {
    expect(makeJobId('reminder', 42)).toBe('reminder_42')
  })

  it('returns a single segment unchanged', () => {
    expect(makeJobId('digest')).toBe('digest')
  })

  it('throws when no segment is provided', () => {
    expect(() => makeJobId()).toThrow('makeJobId requires at least one segment')
  })

  it('throws when a segment is empty', () => {
    expect(() => makeJobId('email', '')).toThrow('makeJobId segment cannot be empty')
  })

  it('throws when a segment contains ":" (BullMQ reserved separator)', () => {
    expect(() => makeJobId('email', 'tenant:1')).toThrow(
      'makeJobId segment cannot contain ":" (BullMQ reserved): "tenant:1"',
    )
  })
})
