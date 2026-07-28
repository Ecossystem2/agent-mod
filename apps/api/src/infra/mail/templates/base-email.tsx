import { Body, Container, Head, Html, Preview } from '@react-email/components'
import type { ReactNode } from 'react'

interface BaseEmailProps {
  preview: string
  children: ReactNode
}

export function BaseEmail({ preview, children }: BaseEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          {children}
        </Container>
      </Body>
    </Html>
  )
}
