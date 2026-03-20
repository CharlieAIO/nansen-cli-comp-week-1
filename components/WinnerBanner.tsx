import type { AgentSummary } from "@/lib/types";

export function WinnerBanner({ winner, arenaId }: { winner: AgentSummary; arenaId: string | null }) {
  return (
    <section className="panel winnerBanner">
      <span className="pill accent">Arena Complete</span>
      <h2>
        {winner.emoji} {winner.name} wins the arena
      </h2>
      <p>
        Final score: {winner.totalValueSol.toFixed(2)} SOL ({winner.returnPct.toFixed(2)}%). Arena {arenaId?.slice(0, 8)}.
      </p>
    </section>
  );
}
