import { getArenaRecord } from "@/lib/arena-store";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const record = getArenaRecord(params.id);
  if (!record) {
    return Response.json({ ok: false, message: "Arena not found" }, { status: 404 });
  }

  record.state.aborted = true;
  record.state.phase = "aborted";
  return Response.json({ ok: true });
}
