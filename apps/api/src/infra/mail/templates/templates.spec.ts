import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderEmail } from '../render-email'

import { ResetPasswordEmail, WelcomeEmail } from './index'

describe('Email templates', () => {
  it('renders WelcomeEmail without throwing', async () => {
    const html = await renderEmail(
      createElement(WelcomeEmail, { name: 'Test User', loginUrl: 'https://example.com/login' }),
    )
    expect(html).toContain('Test User')
    expect(html).toContain('https://example.com/login')
  })

  it('renders ResetPasswordEmail without throwing', async () => {
    const html = await renderEmail(
      createElement(ResetPasswordEmail, {
        name: 'Test User',
        resetUrl: 'https://example.com/reset',
        expiresInMinutes: 30,
      }),
    )
    expect(html).toContain('Test User')
    expect(html).toContain('30')
    expect(html).toContain('https://example.com/reset')
  })
})
