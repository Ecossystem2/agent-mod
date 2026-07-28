import { describe, expect, it, vi } from 'vitest'

import { EnvService } from './env.service'

import type { Env } from './env'
import type { ConfigService } from '@nestjs/config'

describe('EnvService', () => {
  it('delega get para o ConfigService com infer', () => {
    const get = vi.fn().mockReturnValue(3333)
    const config = { get } as unknown as ConfigService<Env, true>
    const sut = new EnvService(config)

    const result = sut.get('PORT')

    expect(result).toBe(3333)
    expect(get).toHaveBeenCalledWith('PORT', { infer: true })
  })
})
