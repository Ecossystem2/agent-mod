import { describe, expect, it } from 'vitest'

import { AggregateRoot } from './aggregate-root'
import { UniqueEntityID } from './unique-entity-id'

import type { DomainEvent } from '../events/domain-event'

class FakeEvent implements DomainEvent {
  readonly occurredAt = new Date()

  constructor(private readonly aggregateId: UniqueEntityID) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}

interface FakeProps {
  value: string
}

class FakeAggregate extends AggregateRoot<FakeProps> {
  static create(props: FakeProps) {
    return new FakeAggregate(props)
  }

  raise(event: DomainEvent) {
    this.addDomainEvent(event)
  }
}

describe('AggregateRoot', () => {
  it('inicia sem domain events', () => {
    const sut = FakeAggregate.create({ value: 'x' })

    expect(sut.domainEvents).toHaveLength(0)
  })

  it('acumula domain events via addDomainEvent', () => {
    const sut = FakeAggregate.create({ value: 'x' })
    const event = new FakeEvent(new UniqueEntityID('agg'))

    sut.raise(event)

    expect(sut.domainEvents).toHaveLength(1)
    expect(sut.domainEvents[0]).toBe(event)
  })

  it('limpa os eventos com clearEvents', () => {
    const sut = FakeAggregate.create({ value: 'x' })
    sut.raise(new FakeEvent(new UniqueEntityID('agg')))

    sut.clearEvents()

    expect(sut.domainEvents).toHaveLength(0)
  })
})
