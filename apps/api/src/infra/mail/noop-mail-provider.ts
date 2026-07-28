import { Injectable, Logger } from '@nestjs/common'

import { MailProvider, type MailMessage } from '@/domain/application/providers/mail-provider'

@Injectable()
export class NoopMailProvider implements MailProvider {
  private readonly logger = new Logger(NoopMailProvider.name)

  async send(message: MailMessage): Promise<void> {
    this.logger.warn(
      `MAIL_ENABLED=false — email não enviado para "${Array.isArray(message.to) ? message.to.join(', ') : message.to}" (subject: "${message.subject}")`,
    )
  }
}
