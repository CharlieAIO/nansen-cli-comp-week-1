import { getActiveArenaInstance } from "@/lib/arena-store";

export async function GET() {
  const active = getActiveArenaInstance();
  if (!active) {
    return Response.json({ arenaId: null, state: null });
  }

  return Response.json({ arenaId: active.record.state.id, state: active.record.state });
}
