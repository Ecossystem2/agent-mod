export interface MailMessage {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  tag?: string
}

export abstract class MailProvider {
  abstract send(message: MailMessage): Promise<void>
}
