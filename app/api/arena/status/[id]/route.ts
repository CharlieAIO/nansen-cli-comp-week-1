import { getArenaRecord } from "@/lib/arena-store";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const record = getArenaRecord(params.id);
  if (!record) {
    return Response.json({ arenaId: params.id, state: null }, { status: 404 });
  }

  return Response.json({ arenaId: params.id, state: record.state });
}
