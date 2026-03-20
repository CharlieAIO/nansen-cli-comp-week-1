import { ensureArenaRunning } from "@/lib/arena-service";

export async function GET() {
  const active = await ensureArenaRunning();
  if (!active) {
    return Response.json({ arenaId: null, state: null });
  }

  return Response.json({ arenaId: active.record.state.id, state: active.record.state });
}
