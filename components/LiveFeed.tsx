import type { ArenaEvent } from "@/lib/types";

export function LiveFeed({ events }: { events: ArenaEvent[] }) {
  return (
    <section className="panel sidePanel liveFeed">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>SYSTEM_LOG</h3>
        <span className="pill">BUFFER_READY</span>
      </div>
      <div className="feedRows">
        {events.length ? events.map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="feedRow">
            <span className="feedTimestamp">[{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span className="feedEventName">{event.type.toUpperCase().replaceAll(" ", "_")}</span>
            <div className="feedDot"></div>
          </div>
        )) : <div className="feedRow muted">AWAITING_INPUT...</div>}
      </div>
    </section>
  );
}
