import type { NansenCall } from "@/lib/types";

export function NansenActivityPanel({ calls }: { calls: NansenCall[] }) {
  const recentCalls = calls.slice(-6).reverse();

  return (
    <section className="panel sidePanel nansenPanel">
      <div className="sectionHead">
        <h3>Nansen Intel</h3>
        <span className="pill">Recent Calls</span>
      </div>
      <div className="nansenCallList">
        {recentCalls.length ? recentCalls.map((call, index) => (
          <div key={`${call.timestamp}-${call.endpoint}-${index}`} className="nansenCallRow">
            <div>
              <strong>{call.endpoint}</strong>
              <span>{call.via.toUpperCase()} · STATUS {call.status}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong style={{ color: "var(--accent)" }}>{call.latencyMs}ms</strong>
              <span>{new Date(call.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
            </div>
          </div>
        )) : <div className="nansenCallRow" style={{ justifyContent: "center", opacity: 0.5 }}><span>No activity recorded</span></div>}
      </div>
    </section>
  );
}

