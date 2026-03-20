import type { AgentSummary } from "@/lib/types";
import Image from "next/image";

export function WinnerBanner({ winner, arenaId }: { winner: AgentSummary; arenaId: string | null }) {
  return (
    <section className="panel winnerBanner" style={{ borderTop: `4px solid ${winner.color}`, background: `${winner.color}08` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-md)" }}>
        <span className="pill" style={{ color: winner.color, borderColor: winner.color, background: `${winner.color}11` }}>
          Arena Champion
        </span>
        <div className="winnerInfo">
          <div className="avatarWrap" style={{ width: "96px", height: "96px", borderColor: winner.color, padding: "4px" }}>
            <Image 
              src={`/avatars/${winner.id}.png`} 
              alt={winner.name} 
              width={96} 
              height={96} 
              className="winnerAvatar"
              style={{ filter: "none" }}
            />
          </div>
          <div className="winnerDetails">
            <h2 style={{ fontSize: "2.5rem", marginBottom: "4px" }}>{winner.name}</h2>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", opacity: 0.9 }}>
              Total Portfolio: <strong style={{ color: winner.color }}>{winner.totalValueSol.toFixed(2)} SOL</strong>
              <span className="separator">{" | "}</span>
              Performance: <strong style={{ color: winner.color }}>{winner.returnPct.toFixed(2)}%</strong>
            </p>
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <span className="pill">Arena {arenaId?.slice(0, 8)} finalized</span>
              <span className="pill">Rank #1 Global Target</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

