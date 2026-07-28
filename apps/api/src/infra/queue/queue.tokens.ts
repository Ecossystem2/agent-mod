import { QUEUE_NAMES, type QueueName } from '@apps/queue'

export { QUEUE_NAMES, type QueueName }

export const queueToken = (name: QueueName): symbol => Symbol.for(`Queue:${name}`)
