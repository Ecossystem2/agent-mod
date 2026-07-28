import { describe, expect, it, vi } from 'vitest'

import { CustomHttpException } from '../exceptions/custom-http.exception'

import { PermissionGuard } from './permission.guard'

import type { ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

function makeReflector(required: unknown): Reflector {
  return { getAllAndOverride: vi.fn().mockReturnValue(required) } as unknown as Reflector
}

describe('PermissionGuard', () => {
  it('libera quando não há metadata de permissão', () => {
    const sut = new PermissionGuard(makeReflector(undefined))

    expect(sut.canActivate(makeContext({}))).toBe(true)
  })

  it('libera quando a lista de permissões é vazia', () => {
    const sut = new PermissionGuard(makeReflector([]))

    expect(sut.canActivate(makeContext({}))).toBe(true)
  })

  it('lança unauthorized quando não há user', () => {
    const sut = new PermissionGuard(makeReflector(['billing:write']))

    expect(() => sut.canActivate(makeContext({}))).toThrow(CustomHttpException)
  })

  it('libera quando o user tem a permissão requerida', () => {
    const sut = new PermissionGuard(makeReflector(['billing:write']))
    const req = { user: { permissions: ['billing:write'] } }

    expect(sut.canActivate(makeContext(req))).toBe(true)
  })

  it('lança forbidden quando faltam permissões', () => {
    const sut = new PermissionGuard(makeReflector(['billing:write']))
    const req = { user: { permissions: ['billing:read'] } }

    expect(() => sut.canActivate(makeContext(req))).toThrow(CustomHttpException)
  })

  it('trata user sem permissions como lista vazia', () => {
    const sut = new PermissionGuard(makeReflector(['billing:write']))
    const req = { user: {} }

    expect(() => sut.canActivate(makeContext(req))).toThrow(CustomHttpException)
  })
})
