export interface SendEmailJobData {
  to: string
  subject: string
  html: string
}

export const SEND_EMAIL_JOB = 'send-email' as const
