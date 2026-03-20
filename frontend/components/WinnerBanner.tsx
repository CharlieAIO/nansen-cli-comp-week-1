import type { AgentSummary } from "@/lib/types";
import Image from "next/image";

export function WinnerBanner({ winner, arenaId }: { winner: AgentSummary; arenaId: string | null }) {
  return (
    <section className="panel winnerBanner">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "#000" }}></div>
        <div className="corner-br" style={{ background: "#000" }}></div>
      </div>
      <span className="pill accent">Arena complete</span>
      <div className="winnerInfo">
        <div className="winnerAvatarWrap" style={{ borderColor: winner.color }}>
          <Image 
            src={`/avatars/${winner.id}.png`} 
            alt={winner.name} 
            width={120} 
            height={120} 
            className="winnerAvatar"
          />
        </div>
        <div className="winnerDetails">
          <h2>{winner.name} wins the arena</h2>
          <p>
            Final liquidity: {winner.totalValueSol.toFixed(2)} SOL 
            <span className="separator">{" // "}</span>
            Return: {winner.returnPct.toFixed(2)}%
          </p>
          <span className="arenaIdTag">Arena {arenaId?.slice(0, 8)}</span>
        </div>
      </div>
    </section>
  );
}
