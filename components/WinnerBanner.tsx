import type { AgentSummary } from "@/lib/types";
import Image from "next/image";

export function WinnerBanner({ winner, arenaId }: { winner: AgentSummary; arenaId: string | null }) {
  return (
    <section className="panel winnerBanner">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "#000" }}></div>
        <div className="corner-br" style={{ background: "#000" }}></div>
      </div>
      <span className="pill accent">ARENA_CYCLE_COMPLETE</span>
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
          <h2>{winner.name} DOMINATES THE ARENA</h2>
          <p>
            FINAL_LIQUIDITY: {winner.totalValueSol.toFixed(2)} SOL 
            <span className="separator">{" // "}</span>
            YIELD_GENERATED: {winner.returnPct.toFixed(2)}%
          </p>
          <span className="arenaIdTag">INSTANCE_ID: {arenaId?.slice(0, 8)}</span>
        </div>
      </div>
    </section>
  );
}
