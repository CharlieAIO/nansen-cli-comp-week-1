import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ArenaEvent, ArenaState } from "./types";
import type { ArenaOrchestrator } from "../services/arena";

type Listener = (event: ArenaEvent) => void;

const PERSIST_DIR = join(process.cwd(), ".arena");
const PERSIST_FILE = join(PERSIST_DIR, "active-state.json");

function trimState(state: ArenaState): ArenaState {
  return {
    ...state,
    log: state.log.slice(-400),
    nansen: {
      ...state.nansen,
      callLog: state.nansen.callLog.slice(-400),
    },
  };
}

function persistState(activeId: string | null, state: ArenaState | null) {
  mkdirSync(PERSIST_DIR, { recursive: true });
  writeFileSync(
    PERSIST_FILE,
    JSON.stringify({ activeArenaId: activeId, state: state ? trimState(state) : null }, null, 2),
    "utf8",
  );
}

function loadState(): { activeArenaId: string | null; state: ArenaState | null } {
  try {
    const raw = readFileSync(PERSIST_FILE, "utf8");
    const parsed = JSON.parse(raw) as { activeArenaId?: string | null; state?: ArenaState | null };
    return {
      activeArenaId: parsed.activeArenaId ?? parsed.state?.id ?? null,
      state: parsed.state ?? null,
    };
  } catch {
    return { activeArenaId: null, state: null };
  }
}

export class ArenaRecord {
  state: ArenaState;
  private listeners = new Set<Listener>();

  constructor(state: ArenaState) {
    this.state = state;
  }

  emit(event: ArenaEvent) {
    this.state.log.push(event);
    if (this.state.log.length > 400) {
      this.state.log = this.state.log.slice(-400);
    }
    persistState(activeArenaId ?? this.state.id, this.state);
    this.listeners.forEach((listener) => listener(event));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface ArenaInstance {
  record: ArenaRecord;
  orchestrator: ArenaOrchestrator | null;
}

const arenaStore = new Map<string, ArenaInstance>();
const persisted = loadState();
let activeArenaId: string | null = persisted.activeArenaId;

if (persisted.state) {
  const restoredState = trimState(persisted.state);
  arenaStore.set(restoredState.id, {
    record: new ArenaRecord(restoredState),
    orchestrator: null,
  });
  activeArenaId = restoredState.id;
}

export function setArenaInstance(id: string, instance: ArenaInstance) {
  arenaStore.set(id, instance);
  activeArenaId = id;
  persistState(activeArenaId, instance.record.state);
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
  persistState(activeArenaId, id ? arenaStore.get(id)?.record.state ?? null : null);
}
