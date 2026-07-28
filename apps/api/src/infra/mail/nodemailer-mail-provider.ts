import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { createTransport, type Transporter } from 'nodemailer'

import { MailProvider, type MailMessage } from '@/domain/application/providers/mail-provider'
import { EnvService } from '@/infra/env/env.service'

@Injectable()
export class NodemailerMailProvider implements MailProvider, OnModuleDestroy {
  private readonly transporter: Transporter
  private readonly defaultFrom: string | null

  constructor(private readonly env: EnvService) {
    const host = env.get('SMTP_HOST')
    const port = env.get('SMTP_PORT')
    const user = env.get('SMTP_USER')
    const pass = env.get('SMTP_PASS')

    if (!host || !port) {
      throw new Error('SMTP_HOST and SMTP_PORT are required to use NodemailerMailProvider')
    }

    this.transporter = createTransport({
      host,
      port,
      secure: env.get('SMTP_SECURE'),
      auth: user && pass ? { user, pass } : undefined,
    })

    this.defaultFrom = env.get('SMTP_FROM') ?? null
  }

  async send(message: MailMessage): Promise<void> {
    const from = message.from ?? this.defaultFrom
    if (!from) {
      throw new Error('MailMessage.from is required when SMTP_FROM is not configured')
    }

    await this.transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      headers: message.tag ? { 'X-Mail-Tag': message.tag } : undefined,
    })
  }

  onModuleDestroy(): void {
    this.transporter.close()
  }
}
