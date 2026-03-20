import type { ArenaEvent, ArenaState } from "@/lib/types";

type Listener = (event: ArenaEvent) => void;

export class ArenaRecord {
  state: ArenaState;
  private listeners = new Set<Listener>();

  constructor(state: ArenaState) {
    this.state = state;
  }

  emit(event: ArenaEvent) {
    this.state.log.push(event);
    this.listeners.forEach((listener) => listener(event));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const arenaStore = new Map<string, ArenaRecord>();

export function setArenaRecord(id: string, record: ArenaRecord) {
  arenaStore.set(id, record);
}

export function getArenaRecord(id: string) {
  return arenaStore.get(id);
}
