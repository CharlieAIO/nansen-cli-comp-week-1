import type { ArenaEvent } from "@/lib/types";

export function LiveFeed({ events }: { events: ArenaEvent[] }) {
  return (
    <section className="panel sidePanel liveFeed">
      <div className="sectionHead">
        <h3>Live Feed</h3>
        <span className="pill">SSE</span>
      </div>
      <div className="feedRows">
        {events.map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="feedRow">
            <span>{event.type.replaceAll("_", " ")}</span>
            <strong>{new Date(event.timestamp).toLocaleTimeString()}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
