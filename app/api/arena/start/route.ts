import { randomUUID } from "node:crypto";

import { setArenaRecord } from "@/lib/arena-store";
import type { ArenaConfig } from "@/lib/types";
import { ArenaOrchestrator } from "@/services/arena";

const defaultConfig: ArenaConfig = {
  totalRounds: 6,
  roundDelayMs: 800,
  chain: "solana",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<ArenaConfig>;
  const config: ArenaConfig = {
    ...defaultConfig,
    ...body,
    chain: "solana",
  };
  const arenaId = randomUUID();
  const arena = new ArenaOrchestrator(arenaId, config);
  setArenaRecord(arenaId, arena.record);
  void arena.runArena();
  return Response.json({ arenaId, config });
}
