import { Hr, Link, Text } from '@react-email/components'

import { BaseEmail } from './base-email'

interface ResetPasswordEmailProps {
  name: string
  resetUrl: string
  expiresInMinutes: number
}

export function ResetPasswordEmail({ name, resetUrl, expiresInMinutes }: ResetPasswordEmailProps) {
  return (
    <BaseEmail preview="Redefinição de senha">
      <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>Redefinição de senha</Text>
      <Text>Olá {name}, recebemos uma solicitação para redefinir sua senha.</Text>
      <Text>
        Clique no link abaixo para criar uma nova senha. Este link expira em {expiresInMinutes}{' '}
        minutos.
      </Text>
      <Hr />
      <Link href={resetUrl}>Redefinir minha senha</Link>
      <Hr />
      <Text style={{ color: '#666', fontSize: '12px' }}>
        Se você não solicitou a redefinição, ignore este email.
      </Text>
    </BaseEmail>
  )
}
