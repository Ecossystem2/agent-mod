import { describe, expect, it } from 'vitest'

import { WatchedList } from './watched-list'

class NumberWatchedList extends WatchedList<number> {
  compareItems(a: number, b: number): boolean {
    return a === b
  }
}

describe('WatchedList', () => {
  it('inicia com itens iniciais e sem diff', () => {
    const sut = new NumberWatchedList([1, 2, 3])

    expect(sut.getItems()).toEqual([1, 2, 3])
    expect(sut.getNewItems()).toEqual([])
    expect(sut.getRemovedItems()).toEqual([])
  })

  it('inicia vazia quando nenhum item é fornecido', () => {
    const sut = new NumberWatchedList()

    expect(sut.getItems()).toEqual([])
  })

  it('add registra item novo', () => {
    const sut = new NumberWatchedList([1])

    sut.add(2)

    expect(sut.getItems()).toEqual([1, 2])
    expect(sut.getNewItems()).toEqual([2])
  })

  it('add de item inicial não marca como novo', () => {
    const sut = new NumberWatchedList([1])

    sut.remove(1)
    sut.add(1)

    expect(sut.getItems()).toContain(1)
    expect(sut.getNewItems()).toEqual([])
    expect(sut.getRemovedItems()).toEqual([])
  })

  it('add idempotente não duplica nos currentItems', () => {
    const sut = new NumberWatchedList([])

    sut.add(5)
    sut.add(5)

    expect(sut.getItems()).toEqual([5])
    expect(sut.getNewItems()).toEqual([5])
  })

  it('remove de item inicial registra em removed', () => {
    const sut = new NumberWatchedList([1, 2])

    sut.remove(2)

    expect(sut.getItems()).toEqual([1])
    expect(sut.getRemovedItems()).toEqual([2])
  })

  it('remove de item novo descarta sem registrar em removed', () => {
    const sut = new NumberWatchedList([])

    sut.add(9)
    sut.remove(9)

    expect(sut.getItems()).toEqual([])
    expect(sut.getNewItems()).toEqual([])
    expect(sut.getRemovedItems()).toEqual([])
  })

  it('remove duas vezes não duplica em removed', () => {
    const sut = new NumberWatchedList([1])

    sut.remove(1)
    sut.remove(1)

    expect(sut.getRemovedItems()).toEqual([1])
  })

  it('exists reflete os itens atuais', () => {
    const sut = new NumberWatchedList([1])

    expect(sut.exists(1)).toBe(true)
    expect(sut.exists(2)).toBe(false)
  })

  it('update recalcula new e removed', () => {
    const sut = new NumberWatchedList([1, 2, 3])

    sut.update([2, 3, 4])

    expect(sut.getItems()).toEqual([2, 3, 4])
    expect(sut.getNewItems()).toEqual([4])
    expect(sut.getRemovedItems()).toEqual([1])
  })
})
