import { Inject, Injectable } from '@nestjs/common'

import type { AppAuth } from './auth'

export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE')

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: AppAuth) {}

  get instance(): AppAuth {
    return this.auth
  }

  get api(): AppAuth['api'] {
    return this.auth.api
  }

  async getSession(headers: Headers) {
    return this.auth.api.getSession({ headers })
  }
}
