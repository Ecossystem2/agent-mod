import { Global, Module } from '@nestjs/common'

import { NodemailerMailProvider } from './nodemailer-mail-provider'
import { NoopMailProvider } from './noop-mail-provider'

import { MailProvider } from '@/domain/application/providers/mail-provider'
import { EnvModule } from '@/infra/env/env.module'
import { EnvService } from '@/infra/env/env.service'

@Global()
@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: MailProvider,
      useFactory: (env: EnvService): MailProvider => {
        return env.get('MAIL_ENABLED')
          ? new NodemailerMailProvider(env)
          : new NoopMailProvider()
      },
      inject: [EnvService],
    },
  ],
  exports: [MailProvider],
})
export class MailModule {}
