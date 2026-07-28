// Handler async exige { async: true, promisify: true } — sem isso o emitter engole a rejeição:
//   @OnEvent(SomethingHappenedEvent.name, { async: true, promisify: true })
//   async handle(event: SomethingHappenedEvent) { ... }
export interface EventHandler<E> {
  handle(event: E): Promise<void> | void
}
