import { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'

import { REQUIRES_PERMISSION_KEY, RequiresPermission } from './requires-permission.decorator'

describe('RequiresPermission', () => {
  it('define a metadata com o array de permissões', () => {
    class Controller {
      @RequiresPermission('billing:write' as never, 'admin:any' as never)
      handler(this: void): null {
        return null
      }
    }

    const reflector = new Reflector()
    const value = reflector.get<string[]>(REQUIRES_PERMISSION_KEY, Controller.prototype.handler)

    expect(value).toEqual(['billing:write', 'admin:any'])
  })
})
