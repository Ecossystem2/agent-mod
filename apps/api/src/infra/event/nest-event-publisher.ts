import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import type { DomainEvent } from '@/core/events/domain-event'

import { DomainEventPublisher } from '@/core/events/domain-event-publisher'

// Decisão arquitetural: NÃO usar o singleton estático global do DDD clássico
// (vaza estado entre requests/test runs). EventEmitter2 é per-process e cancellable.
//
// Handlers async usam @OnEvent(EventClass.name, { async: true, promisify: true }).
@Injectable()
export class NestEventPublisher extends DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {
    super()
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.emitter.emitAsync(event.constructor.name, event)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) await this.publish(event)
  }
}
