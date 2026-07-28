import { describe, expect, it, vi } from 'vitest'


import { NestEventPublisher } from './nest-event-publisher'

import type { DomainEvent } from '@/core/events/domain-event'
import type { EventEmitter2 } from '@nestjs/event-emitter'

import { UniqueEntityID } from '@/core/entities/unique-entity-id'

class FakeEvent implements DomainEvent {
  readonly occurredAt = new Date()

  getAggregateId(): UniqueEntityID {
    return new UniqueEntityID('agg')
  }
}

describe('NestEventPublisher', () => {
  it('publish emite usando o nome da classe do evento', async () => {
    const emitAsync = vi.fn().mockResolvedValue([])
    const sut = new NestEventPublisher({ emitAsync } as unknown as EventEmitter2)
    const event = new FakeEvent()

    await sut.publish(event)

    expect(emitAsync).toHaveBeenCalledWith('FakeEvent', event)
  })

  it('publishAll itera sobre todos os eventos', async () => {
    const emitAsync = vi.fn().mockResolvedValue([])
    const sut = new NestEventPublisher({ emitAsync } as unknown as EventEmitter2)
    const events = [new FakeEvent(), new FakeEvent()]

    await sut.publishAll(events)

    expect(emitAsync).toHaveBeenCalledTimes(2)
  })
})
