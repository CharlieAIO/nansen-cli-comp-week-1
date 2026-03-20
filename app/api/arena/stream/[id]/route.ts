import { getArenaRecord } from "@/lib/arena-store";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const record = getArenaRecord(params.id);
  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "snapshot", data: record.state })}\n\n`));
      const unsubscribe = record.subscribe((event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: event.type, data: event.data, state: record.state })}\n\n`));
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
