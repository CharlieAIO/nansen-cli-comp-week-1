import type { AgentSummary } from "@/lib/types";

export function Leaderboard({ rankings }: { rankings: AgentSummary[] }) {
  return (
    <section className="panel sidePanel">
      <div className="sectionHead">
        <h3>Leaderboard</h3>
        <span className="pill">Live</span>
      </div>
      <div className="leaderRows">
        {rankings.map((agent) => (
          <div key={agent.id} className="leaderRow">
            <span>{agent.rank}</span>
            <strong>{agent.emoji} {agent.name}</strong>
            <span>{agent.totalValueSol.toFixed(2)} SOL</span>
          </div>
        ))}
      </div>
    </section>
  );
}
