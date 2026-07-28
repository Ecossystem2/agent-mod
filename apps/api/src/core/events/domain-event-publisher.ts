import type { DomainEvent } from './domain-event'

export abstract class DomainEventPublisher {
  abstract publish(event: DomainEvent): Promise<void> | void
  abstract publishAll(events: DomainEvent[]): Promise<void> | void
}
