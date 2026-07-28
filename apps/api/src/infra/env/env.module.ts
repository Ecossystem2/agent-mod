import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { envSchema } from './env'
import { EnvService } from './env.service'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        const parsed = envSchema.safeParse(env)
        if (!parsed.success) {
          console.error('✗ Configuração de env inválida:')
          for (const issue of parsed.error.issues) {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
          }
          process.exit(1)
        }
        return parsed.data
      },
    }),
  ],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}
