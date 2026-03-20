import { getArenaInstance, setActiveArena } from "@/lib/arena-store";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const instance = getArenaInstance(params.id);
  if (!instance) {
    return Response.json({ ok: false, message: "Arena not found" }, { status: 404 });
  }

  instance.orchestrator?.abort();
  setActiveArena(null);
  return Response.json({ ok: true });
}
