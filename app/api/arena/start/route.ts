import { ensureArenaRunning } from "@/lib/arena-service";
import type { ArenaConfig } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<ArenaConfig>;
  const active = await ensureArenaRunning(body);
  return Response.json({ arenaId: active?.record.state.id ?? null, state: active?.record.state ?? null });
}
