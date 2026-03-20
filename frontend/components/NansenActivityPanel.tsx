import type { NansenCall } from "@/lib/types";

export function NansenActivityPanel({ calls }: { calls: NansenCall[] }) {
  const recentCalls = calls.slice(-6).reverse();

  return (
    <section className="panel sidePanel nansenPanel">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>Nansen activity</h3>
        <span className="pill">Recent calls</span>
      </div>
      <div className="nansenCallList">
        {recentCalls.length ? recentCalls.map((call, index) => (
          <div key={`${call.timestamp}-${call.endpoint}-${index}`} className="nansenCallRow">
            <div>
              <strong>{call.endpoint}</strong>
              <span>{call.via.toUpperCase()} · status {call.status}</span>
            </div>
            <div>
              <strong>{call.latencyMs}ms</strong>
              <span>{new Date(call.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</span>
            </div>
          </div>
        )) : <div className="nansenCallRow muted"><span>No Nansen calls recorded yet.</span></div>}
      </div>
    </section>
  );
}
