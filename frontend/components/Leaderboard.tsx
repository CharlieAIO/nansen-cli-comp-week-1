import type { AgentId, AgentPortfolio, AgentSummary } from "@/lib/types";
import Image from "next/image";

export function Leaderboard({
  rankings,
  portfolios,
}: {
  rankings: AgentSummary[];
  portfolios: Record<AgentId, AgentPortfolio>;
}) {
  const liveRankings = rankings
    .map((agent) => {
      const portfolio = portfolios[agent.id];
      const totalValueSol = portfolio?.totalValueSol ?? agent.totalValueSol;
      const gainSol = totalValueSol - 10;
      const returnPct = totalValueSol > 0 ? ((totalValueSol - 10) / 10) * 100 : agent.returnPct;

      return {
        ...agent,
        totalValueSol,
        gainSol,
        returnPct,
      };
    })
    .sort((a, b) => b.totalValueSol - a.totalValueSol)
    .map((agent, index) => ({ ...agent, rank: index + 1 }));

  return (
    <section className="panel sidePanel leaderboard">
      <div className="sectionHead">
        <h3>Leaderboard</h3>
        <span className="pill">Live</span>
      </div>
      <div className="leaderRows">
        {liveRankings.map((agent) => (
          <div key={agent.id} className="leaderRow">
            <span className="rankIndex">#{agent.rank}</span>
            <div className="avatarWrap" style={{ width: "24px", height: "24px", borderColor: agent.color }}>
              <Image 
                src={`/avatars/${agent.id}.png`} 
                alt={agent.name} 
                width={24} 
                height={24} 
                className="miniAvatar"
              />
            </div>
            <strong className="agentName">{agent.name}</strong>
            <div style={{ textAlign: "right" }}>
              <span className="solValue">{agent.totalValueSol.toFixed(2)} SOL</span>
              <span className={agent.gainSol >= 0 ? "up" : "down"} style={{ fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                {agent.gainSol >= 0 ? "+" : ""}{agent.gainSol.toFixed(2)} SOL
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
