import { HttpException, HttpStatus } from '@nestjs/common'

import type { UseCaseError } from '@/core/errors/use-case-error'

import { NotAllowedError } from '@/core/errors/not-allowed-error'
import { ResourceAlreadyExistsError } from '@/core/errors/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/resource-not-found-error'
import { UnexpectedError } from '@/core/errors/unexpected-error'

export class CustomHttpException extends HttpException {
  constructor(
    public readonly kind: string,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super(
      {
        error: { kind, message, details },
      },
      status,
    )
  }

  static fromUseCaseError(err: UseCaseError): CustomHttpException {
    if (err instanceof ResourceNotFoundError) {
      return new CustomHttpException(err.kind, err.message, HttpStatus.NOT_FOUND)
    }
    if (err instanceof NotAllowedError) {
      return new CustomHttpException(err.kind, err.message, HttpStatus.FORBIDDEN)
    }
    if (err instanceof ResourceAlreadyExistsError) {
      return new CustomHttpException(err.kind, err.message, HttpStatus.CONFLICT)
    }
    if (err instanceof UnexpectedError) {
      return new CustomHttpException(
        err.kind,
        'Ocorreu um erro inesperado.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
    return new CustomHttpException(err.kind, err.message, HttpStatus.BAD_REQUEST)
  }

  static badRequest(message: string, details?: unknown): CustomHttpException {
    return new CustomHttpException('bad-request', message, HttpStatus.BAD_REQUEST, details)
  }

  static unauthorized(message = 'Não autenticado.'): CustomHttpException {
    return new CustomHttpException('unauthorized', message, HttpStatus.UNAUTHORIZED)
  }

  static forbidden(message = 'Não autorizado.'): CustomHttpException {
    return new CustomHttpException('forbidden', message, HttpStatus.FORBIDDEN)
  }
}
