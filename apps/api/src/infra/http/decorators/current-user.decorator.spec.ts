import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'

import { CurrentUser, type SessionUser } from './current-user.decorator'

import type { ExecutionContext } from '@nestjs/common'

// createParamDecorator não expõe a factory diretamente; extraímos via metadata
// da rota (padrão consolidado pra testar param decorators do Nest).
type Factory = (data: unknown, ctx: ExecutionContext) => SessionUser

function getFactory(): Factory {
  class Controller {
    handler(this: void, @CurrentUser() user: SessionUser): SessionUser {
      return user
    }
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Controller, 'handler') as Record<
    string,
    { factory: Factory }
  >
  const entry = Object.values(metadata)[0]
  return entry.factory
}

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

describe('CurrentUser', () => {
  it('retorna o user quando presente no request', () => {
    const factory = getFactory()
    const user = { id: 'u1', email: 'a@b.com' } as SessionUser

    expect(factory(undefined, makeContext({ user }))).toBe(user)
  })

  it('lança quando o user não foi populado', () => {
    const factory = getFactory()

    expect(() => factory(undefined, makeContext({}))).toThrow(
      'CurrentUser usado em rota sem AuthGuard ou user não populado',
    )
  })
})
