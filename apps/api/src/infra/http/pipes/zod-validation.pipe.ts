import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common'
import { ZodError, ZodIssueCode, type ZodErrorMap, type ZodTypeAny, type z } from 'zod'

import { CustomHttpException } from '../exceptions/custom-http.exception'

const ptBrErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Campo obrigatório.' }
      }
      return { message: `Tipo inválido: esperado ${issue.expected}.` }

    case ZodIssueCode.too_small: {
      const min = Number(issue.minimum)
      if (issue.type === 'string') {
        return { message: issue.exact ? `Exatamente ${min} caractere${min !== 1 ? 's' : ''}.` : `Mínimo ${min} caractere${min !== 1 ? 's' : ''}.` }
      }
      if (issue.type === 'array') {
        return { message: `Selecione ao menos ${min} item${min !== 1 ? 's' : ''}.` }
      }
      if (issue.type === 'number') {
        return { message: `Valor mínimo: ${min}.` }
      }
      break
    }

    case ZodIssueCode.too_big: {
      const max = Number(issue.maximum)
      if (issue.type === 'string') {
        return { message: `Máximo ${max} caractere${max !== 1 ? 's' : ''}.` }
      }
      if (issue.type === 'number') {
        return { message: `Valor máximo: ${max}.` }
      }
      break
    }

    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'E-mail inválido.' }
      if (issue.validation === 'url') return { message: 'URL inválida.' }
      if (issue.validation === 'uuid') return { message: 'ID inválido.' }
      if (issue.validation === 'regex') return { message: 'Formato inválido.' }
      break

    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor inválido. Opções: ${issue.options.join(', ')}.` }

    case ZodIssueCode.invalid_date:
      return { message: 'Data inválida.' }

    case ZodIssueCode.custom:
      return { message: issue.message ?? ctx.defaultError }
  }

  return { message: ctx.defaultError }
}

@Injectable()
export class ZodValidationPipe<S extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<S> {
    try {
      return this.schema.parse(value, { errorMap: ptBrErrorMap }) as z.infer<S>
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }))
        throw CustomHttpException.badRequest('Dados inválidos.', details)
      }
      throw err
    }
  }
}
