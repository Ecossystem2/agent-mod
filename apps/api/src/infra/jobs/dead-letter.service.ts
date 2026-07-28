import { Injectable, Logger } from '@nestjs/common'

import type { Job } from 'bullmq'

import { PrismaService } from '@/infra/database/prisma/prisma.service'

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name)

  constructor(private readonly prisma: PrismaService) {}

  async record(queueName: string, job: Job, err: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1
    if (job.attemptsMade < maxAttempts) return // ainda vai retry, ignora

    try {
      await this.prisma.deadLetterJob.create({
        data: {
          queueName,
          jobName: job.name,
          payload: job.data as object,
          attempts: job.attemptsMade,
          errorName: err.name,
          errorMessage: err.message,
          errorStack: err.stack ?? null,
        },
      })
      this.logger.warn(`Job ${queueName}:${job.id} → DLQ após ${job.attemptsMade} tentativas`)
    } catch (dbErr) {
      // Último recurso: se nem pra DLQ escrevemos (blip de DB), o job terminal se
      // perde. Logar o payload junto pra permitir reprocessamento manual a partir
      // do log — sem isso o job some silenciosamente.
      this.logger.error(
        `Falha ao gravar DLQ pra ${queueName}:${job.id} — payload pra recuperação: ${JSON.stringify(job.data)}`,
        dbErr,
      )
    }
  }
}
