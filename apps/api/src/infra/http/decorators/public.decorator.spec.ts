import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'

import { IS_PUBLIC_KEY, Public } from './public.decorator'

describe('Public', () => {
  it('define a metadata IS_PUBLIC_KEY como true', () => {
    class Controller {
      @Public()
      handler(this: void): null {
        return null
      }
    }

    const reflector = new Reflector()
    const value = reflector.get<boolean>(IS_PUBLIC_KEY, Controller.prototype.handler)

    expect(value).toBe(true)
  })
})
