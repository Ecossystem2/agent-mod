import { DEFAULT_JOB_OPTIONS } from '@apps/queue'
import { Global, Module } from '@nestjs/common'
import { Queue } from 'bullmq'


import { QUEUE_NAMES, queueToken, type QueueName } from './queue.tokens'

import { RedisService } from '@/infra/cache/redis/redis.service'


// Módulo global do producer (cria as Queues BullMQ).
// Side dos workers (Processors) fica em infra/jobs/.
//
// Pra adicionar uma fila nova:
//   1. registre em QUEUE_NAMES
//   2. adicione no array `QUEUES_TO_CREATE` abaixo
//   3. injete via @Inject(queueToken(QUEUE_NAMES.MINHA_FILA)) onde produzir jobs
const QUEUES_TO_CREATE: readonly QueueName[] = Object.values(QUEUE_NAMES)

const queueProviders = QUEUES_TO_CREATE.map((name) => ({
  provide: queueToken(name),
  useFactory: (redis: RedisService) =>
    new Queue(name, {
      connection: redis,
      defaultJobOptions: { ...DEFAULT_JOB_OPTIONS },
    }),
  inject: [RedisService],
}))

@Global()
@Module({
  providers: queueProviders,
  exports: queueProviders,
})
export class QueueModule {}
