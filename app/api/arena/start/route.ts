import { randomUUID } from "node:crypto";

import { getActiveArenaInstance, setArenaInstance } from "@/lib/arena-store";
import type { ArenaConfig } from "@/lib/types";
import { ArenaOrchestrator } from "@/services/arena";

const defaultConfig: ArenaConfig = {
  mode: "continuous",
  totalRounds: null,
  roundDelayMs: 12000,
  chain: "solana",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<ArenaConfig>;
  const config: ArenaConfig = {
    ...defaultConfig,
    ...body,
    chain: "solana",
  };

  const active = getActiveArenaInstance();
  if (active?.record.state.phase === "running" && active.orchestrator) {
    return Response.json({ arenaId: active.record.state.id, config: active.record.state });
  }

  if (active?.record.state.phase === "running" && !active.orchestrator) {
    const resumedArena = new ArenaOrchestrator(active.record.state.id, config, active.record.state);
    setArenaInstance(active.record.state.id, { record: resumedArena.record, orchestrator: resumedArena });
    void resumedArena.runArena();
    return Response.json({ arenaId: active.record.state.id, config: active.record.state });
  }

  const arenaId = randomUUID();
  const arena = new ArenaOrchestrator(arenaId, config);
  setArenaInstance(arenaId, { record: arena.record, orchestrator: arena });
  void arena.runArena();
  return Response.json({ arenaId, config });
}
