import { Entity } from './entity'

import type { DomainEvent } from '../events/domain-event'

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = []

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearEvents(): void {
    this._domainEvents = []
  }
}
