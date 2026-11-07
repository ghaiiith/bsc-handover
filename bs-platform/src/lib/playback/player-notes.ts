import type { PlayerNoteEvent } from '@/types/video-player'

export type PlayerNoteListener = (event: PlayerNoteEvent) => void

/** Internal note event bus — UI hidden until notes feature ships. */
export class PlayerNotesBus {
  private listeners = new Set<PlayerNoteListener>()

  subscribe(listener: PlayerNoteListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: PlayerNoteEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  dispose(): void {
    this.listeners.clear()
  }
}

export function createPlayerNotesBus(): PlayerNotesBus {
  return new PlayerNotesBus()
}
