import type { ArenaEvent } from "@/lib/types";

function describeEvent(event: ArenaEvent) {
  const data = event.data as Record<string, unknown> | null;
  if (!data || typeof data !== "object") {
    return event.type.replaceAll("_", " ");
  }

  switch (event.type) {
    case "agent_start":
      return `${String(data.name ?? data.agentId ?? "Agent")} started research`;
    case "agent_data":
      return `${String(data.agentId ?? "agent")} ingested data from Nansen`;
    case "agent_decision":
      return `${String(data.agentId ?? "agent")} generated strategic model`;
    case "agent_trades":
      return `${String(data.agentId ?? "agent")} executed target orders`;
    case "commentary":
      return `Round commentary generated`;
    case "round_end":
      return `Round cycle completed`;
    default:
      return event.type.replaceAll("_", " ");
  }
}

export function LiveFeed({ events }: { events: ArenaEvent[] }) {
  return (
    <section className="panel sidePanel liveFeed">
      <div className="sectionHead">
        <h3>Network Activity</h3>
        <span className="pill">Shared stream</span>
      </div>
      <div className="feedRows">
        {events.length ? events.map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="feedRow">
            <span style={{ color: "var(--muted)", minWidth: "64px" }}>
              {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: "10px", fontWeight: 700 }}>
                {event.type.replaceAll("_", " ")}
              </span>
              <span style={{ color: "var(--text)", fontSize: "11px", opacity: 0.8 }}>
                {describeEvent(event)}
              </span>
            </div>
          </div>
        )) : <div className="feedRow" style={{ justifyContent: "center", opacity: 0.5 }}><span>Waiting for backend events...</span></div>}
      </div>
    </section>
  );
}
