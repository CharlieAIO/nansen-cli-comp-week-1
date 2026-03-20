import type { ArenaEvent, ArenaState } from "@/lib/types";
import type { ArenaOrchestrator } from "@/services/arena";

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

interface ArenaInstance {
  record: ArenaRecord;
  orchestrator: ArenaOrchestrator;
}

const arenaStore = new Map<string, ArenaInstance>();
let activeArenaId: string | null = null;

export function setArenaInstance(id: string, instance: ArenaInstance) {
  arenaStore.set(id, instance);
  activeArenaId = id;
}

export function getArenaRecord(id: string) {
  return arenaStore.get(id)?.record;
}

export function getArenaInstance(id: string) {
  return arenaStore.get(id);
}

export function getActiveArenaInstance() {
  return activeArenaId ? arenaStore.get(activeArenaId) ?? null : null;
}

export function setActiveArena(id: string | null) {
  activeArenaId = id;
}
