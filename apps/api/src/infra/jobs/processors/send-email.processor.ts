import { DEFAULT_WORKER_OPTIONS, QUEUE_NAMES } from '@apps/queue'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { Worker } from 'bullmq'

import type { SendEmailJobData } from './send-email.job'
import type { Job } from 'bullmq'
import type { Redis } from 'ioredis'

import { MailProvider } from '@/domain/application/providers/mail-provider'
import { RedisService } from '@/infra/cache/redis/redis.service'
import { DeadLetterService } from '@/infra/jobs/dead-letter.service'

@Injectable()
export class SendEmailProcessor implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker
  private connection!: Redis

  constructor(
    private readonly mail: MailProvider,
    private readonly redis: RedisService,
    private readonly dlq: DeadLetterService,
  ) {}

  onModuleInit(): void {
    // Conexão dedicada (duplicada): o Worker roda comandos bloqueantes (BRPOPLPUSH)
    // que seguram a conexão — compartilhar a do cache/auth starvaria os outros
    // consumidores. BullMQ exige connection própria por Worker.
    this.connection = this.redis.duplicate()
    this.worker = new Worker(
      QUEUE_NAMES.EMAILS,
      (job: Job<SendEmailJobData>) => this.process(job),
      { connection: this.connection, ...DEFAULT_WORKER_OPTIONS },
    )

    this.worker.on('failed', (job, err) => {
      if (job) void this.dlq.record(QUEUE_NAMES.EMAILS, job, err)
    })
  }

  async onModuleDestroy(): Promise<void> {
    // Ordem: fecha o Worker (para de puxar jobs) antes de fechar a conexão dele.
    await this.worker.close()
    await this.connection.quit()
  }

  async process(job: Job<SendEmailJobData>): Promise<{ sent: boolean }> {
    try {
      await this.mail.send({
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.html,
      })
      return { sent: true }
    } catch (err) {
      console.error('[SendEmailProcessor]', err)
      throw err
    }
  }
}
