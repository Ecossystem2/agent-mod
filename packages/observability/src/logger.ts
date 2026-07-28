import { pino, type Logger as PinoLogger } from 'pino'

import { REDACT_PATHS } from './redact'

export type AppLogger = PinoLogger

export interface LoggerOptions {
  level?: string
  pretty?: boolean
  name?: string
}

export function createLogger(options: LoggerOptions = {}): AppLogger {
  const { level = 'info', pretty = false, name } = options

  return pino({
    level,
    name,
    redact: {
      paths: [...REDACT_PATHS],
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  })
}
