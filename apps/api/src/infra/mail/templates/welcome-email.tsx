import { Hr, Link, Text } from '@react-email/components'

import { BaseEmail } from './base-email'

interface WelcomeEmailProps {
  name: string
  loginUrl: string
}

export function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <BaseEmail preview={`Bem-vindo, ${name}!`}>
      <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>Bem-vindo!</Text>
      <Text>Olá {name}, sua conta foi criada com sucesso.</Text>
      <Hr />
      <Link href={loginUrl}>Acessar minha conta</Link>
    </BaseEmail>
  )
}
