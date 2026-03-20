import type { ArenaEvent } from "@/lib/types";

function describeEvent(event: ArenaEvent) {
  const data = event.data as Record<string, unknown> | null;
  if (!data || typeof data !== "object") {
    return event.type.replaceAll("_", " ");
  }

  switch (event.type) {
    case "agent_start":
      return `${String(data.name ?? data.agentId ?? "Agent")} started researching`;
    case "agent_data":
      return `${String(data.agentId ?? "agent")} fetched ${Array.isArray(data.dataSources) ? data.dataSources.length : 0} data sources`;
    case "agent_decision":
      return `${String(data.agentId ?? "agent")} produced ${String(data.tradeCount ?? 0)} trades`;
    case "agent_trades":
      return `${String(data.agentId ?? "agent")} executed ${Array.isArray(data.trades) ? data.trades.length : 0} trades`;
    case "commentary":
      return `Commentary updated for round ${String(data.round ?? "-")}`;
    case "round_end":
      return `Round ${String(data.round ?? "-")} closed`;
    case "agent_error":
      return String(data.message ?? "Agent error");
    case "log":
      return String(data.message ?? "Log update");
    default:
      return event.type.replaceAll("_", " ");
  }
}

export function LiveFeed({ events }: { events: ArenaEvent[] }) {
  return (
    <section className="panel sidePanel liveFeed">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>Live feed</h3>
        <span className="pill">Polling</span>
      </div>
      <div className="feedRows">
        {events.length ? events.map((event, index) => (
          <div key={`${event.timestamp}-${index}`} className="feedRow">
            <span className="feedTimestamp">[{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <div className="feedBody">
              <span className="feedEventName">{event.type.replaceAll("_", " ")}</span>
              <span className="feedDetail">{describeEvent(event)}</span>
            </div>
            <div className="feedDot"></div>
          </div>
        )) : <div className="feedRow muted">Waiting for events...</div>}
      </div>
    </section>
  );
}
