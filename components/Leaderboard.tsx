import type { AgentSummary } from "@/lib/types";
import Image from "next/image";

export function Leaderboard({ rankings }: { rankings: AgentSummary[] }) {
  return (
    <section className="panel sidePanel leaderboard">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>ARENA_RANKINGS</h3>
        <span className="pill">LIVE_STREAM</span>
      </div>
      <div className="leaderRows">
        {rankings.map((agent) => (
          <div key={agent.id} className="leaderRow">
            <span className="rankIndex">RANK_{agent.rank.toString().padStart(2, '0')}</span>
            <div className="miniAvatarWrap" style={{ borderColor: agent.color }}>
              <Image 
                src={`/avatars/${agent.id}.png`} 
                alt={agent.name} 
                width={24} 
                height={24} 
                className="miniAvatar"
              />
            </div>
            <strong className="agentName">{agent.name}</strong>
            <span className="solValue">{agent.totalValueSol.toFixed(2)} SOL</span>
          </div>
        ))}
      </div>
    </section>
  );
}
