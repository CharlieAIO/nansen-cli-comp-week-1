import { randomUUID } from "node:crypto";

import { getActiveArenaInstance, setArenaInstance } from "./arena-store";
import type { ArenaConfig, ArenaState } from "./types";
import { ArenaOrchestrator } from "../services/arena";

const defaultConfig: ArenaConfig = {
  mode: "fixed",
  totalRounds: 100,
  roundDelayMs: 60000,
  chain: "solana",
};

let bootPromise: Promise<ReturnType<typeof getActiveArenaInstance>> | null = null;

export function getArenaConfig(overrides: Partial<ArenaConfig> = {}): ArenaConfig {
  return {
    ...defaultConfig,
    ...overrides,
    chain: "solana",
  };
}

export async function ensureArenaRunning(overrides: Partial<ArenaConfig> = {}) {
  const existing = getActiveArenaInstance();
  if (existing?.record.state.phase === "running" && existing.orchestrator) {
    return existing;
  }

  if (bootPromise) {
    const pending = await bootPromise;
    return pending;
  }

  const config = getArenaConfig(overrides);

  bootPromise = Promise.resolve().then(() => {
    const active = getActiveArenaInstance();
    if (active?.record.state.phase === "running" && active.orchestrator) {
      return active;
    }

    const initialState: ArenaState | undefined = active?.record.state;
    const arenaId = initialState?.id ?? randomUUID();
    const orchestrator = new ArenaOrchestrator(arenaId, config, initialState);
    setArenaInstance(arenaId, { record: orchestrator.record, orchestrator });
    void orchestrator.runArena();
    return getActiveArenaInstance();
  }).finally(() => {
    bootPromise = null;
  });

  const booted = await bootPromise;
  return booted;
}
