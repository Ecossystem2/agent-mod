import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from './env'

@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<T extends keyof Env>(key: T): Env[T] {
    return this.config.get(key, { infer: true })
  }
}
