export interface Identifiable {
  id: string
}

export class KeyedRegistry<T extends Identifiable> {
  private items = new Map<string, T>()

  register(item: T): void {
    if (this.items.has(item.id)) {
      console.warn(`[AeroSpot] registry: "${item.id}" déjà enregistré, remplacement.`)
    }
    this.items.set(item.id, item)
  }

  unregister(id: string): void {
    this.items.delete(id)
  }

  get(id: string): T | undefined {
    return this.items.get(id)
  }

  has(id: string): boolean {
    return this.items.has(id)
  }

  all(): T[] {
    return [...this.items.values()]
  }

  get size(): number {
    return this.items.size
  }
}
