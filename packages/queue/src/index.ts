export const QUEUE_NAMES = {
  EMAILS: 'emails',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 } as const,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1_000 },
} as const

// Deve ser > timeout da operação mais lenta de qualquer job; senão o BullMQ
// marca o job como stalled e re-enfileira concorrentemente. Suba este valor
// junto com o timeout do job mais lento (regra: lockDuration ≥ 2× esse timeout).
export const WORKER_LOCK_DURATION_MS = 60_000

export const DEFAULT_WORKER_OPTIONS = {
  lockDuration: WORKER_LOCK_DURATION_MS,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1_000 },
} as const
