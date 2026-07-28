import type { UniqueEntityID } from '../entities/unique-entity-id'

// Marker interface para eventos de domínio.
// Eventos concretos vivem em src/domain/enterprise/events/<sub>/
// e implementam esta interface (occurredAt + getAggregateId).
export interface DomainEvent {
  readonly occurredAt: Date
  getAggregateId(): UniqueEntityID
}
