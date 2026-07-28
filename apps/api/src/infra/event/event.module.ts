import { Global, Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'

import { NestEventPublisher } from './nest-event-publisher'

import { DomainEventPublisher } from '@/core/events/domain-event-publisher'


@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 50,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [{ provide: DomainEventPublisher, useClass: NestEventPublisher }],
  exports: [DomainEventPublisher],
})
export class EventModule {}
