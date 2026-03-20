import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ArenaEvent, ArenaState } from "./types";
import type { ArenaOrchestrator } from "../services/arena";

type Listener = (event: ArenaEvent) => void;

const PERSIST_DIR = join(process.cwd(), ".arena");
const ARENAS_DIR = join(PERSIST_DIR, "arenas");
const INDEX_FILE = join(PERSIST_DIR, "index.json");

interface ArenaIndexEntry {
  id: string;
  phase: string;
  startedAt: string;
  completedAt?: string;
}

interface Index {
  activeArenaId: string | null;
  arenas: ArenaIndexEntry[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function ensureDirs() {
  mkdirSync(ARENAS_DIR, { recursive: true });
}

function arenaFile(id: string) {
  return join(ARENAS_DIR, `${id}.json`);
}

function trimState(state: ArenaState): ArenaState {
  return {
    ...state,
    log: state.log.slice(-400),
    nansen: { ...state.nansen, callLog: state.nansen.callLog.slice(-400) },
  };
}

function writeArenaFile(state: ArenaState) {
  ensureDirs();
  writeFileSync(arenaFile(state.id), JSON.stringify(trimState(state), null, 2), "utf8");
}

function readIndex(): Index {
  try {
    return JSON.parse(readFileSync(INDEX_FILE, "utf8")) as Index;
  } catch {
    return { activeArenaId: null, arenas: [] };
  }
}

function writeIndex(index: Index) {
  ensureDirs();
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
}

function upsertIndexEntry(id: string, state: ArenaState) {
  const index = readIndex();
  const existing = index.arenas.findIndex(a => a.id === id);
  const entry: ArenaIndexEntry = {
    id,
    phase: state.phase,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
  };
  if (existing >= 0) {
    index.arenas[existing] = entry;
  } else {
    index.arenas.unshift(entry);
  }
  writeIndex(index);
}

// ─── boot: load all persisted arenas ────────────────────────────────────────

function loadAllArenas(): { activeArenaId: string | null; states: ArenaState[] } {
  ensureDirs();
  const index = readIndex();
  const states: ArenaState[] = [];

  try {
    const files = readdirSync(ARENAS_DIR).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const state = JSON.parse(readFileSync(join(ARENAS_DIR, file), "utf8")) as ArenaState;
        states.push(trimState(state));
      } catch {
        // skip corrupt files
      }
    }
  } catch {
    // empty dir
  }

  // Migrate legacy single-file if no arena files exist yet
  if (states.length === 0) {
    try {
      const legacy = JSON.parse(readFileSync(join(PERSIST_DIR, "active-state.json"), "utf8")) as { state?: ArenaState };
      if (legacy.state) {
        states.push(trimState(legacy.state));
      }
    } catch {
      // no legacy file
    }
  }

  return { activeArenaId: index.activeArenaId ?? (states[0]?.id ?? null), states };
}

// ─── ArenaRecord ─────────────────────────────────────────────────────────────

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
    writeArenaFile(this.state);
    upsertIndexEntry(this.state.id, this.state);
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

// ─── in-memory store (seeded from disk on boot) ───────────────────────────────

const arenaStore = new Map<string, ArenaInstance>();

const { activeArenaId: persistedActiveId, states } = loadAllArenas();
let activeArenaId: string | null = persistedActiveId;

for (const state of states) {
  arenaStore.set(state.id, { record: new ArenaRecord(state), orchestrator: null });
}

// ─── exports ─────────────────────────────────────────────────────────────────

export function setArenaInstance(id: string, instance: ArenaInstance) {
  arenaStore.set(id, instance);
  activeArenaId = id;
  writeArenaFile(instance.record.state);
  upsertIndexEntry(id, instance.record.state);
  const index = readIndex();
  index.activeArenaId = id;
  writeIndex(index);
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
  const index = readIndex();
  index.activeArenaId = id;
  writeIndex(index);
}

export function getAllArenas(): ArenaIndexEntry[] {
  return readIndex().arenas;
}
