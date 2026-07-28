import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common'

import type { Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      // Já está formatado (provavelmente CustomHttpException) → repassa.
      const status = exception.getStatus()
      const body = exception.getResponse()
      if (status >= 500) {
        this.logger.error(`HttpException ${status}: ${exception.message}`, exception.stack)
      }
      res.status(status).json(typeof body === 'object' ? body : { error: { message: body } })
      return
    }

    const err = exception as Error
    this.logger.error(
      `Unhandled: ${err?.message ?? 'unknown'}`,
      err?.stack ?? undefined,
    )

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        kind: 'internal-error',
        message: 'Erro interno. Tente novamente em alguns instantes.',
      },
    })
  }
}
