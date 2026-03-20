"use client";

import { AgentCard } from "@/components/AgentCard";
import { CommentaryPanel } from "@/components/CommentaryPanel";
import { EquityCurve } from "@/components/EquityCurve";
import { Leaderboard } from "@/components/Leaderboard";
import { LiveFeed } from "@/components/LiveFeed";
import { WinnerBanner } from "@/components/WinnerBanner";
import { useArenaStream } from "@/hooks/useArenaStream";

const AGENT_ORDER = ["momentum", "shadow", "contrarian", "quant"] as const;

export function ArenaView() {
  const { arenaId, state, isStarting, startArena, stopArena } = useArenaStream();
  const winner = state.phase === "complete" ? state.rankings[0] : null;
  const runtimeSeconds = Math.max(0, Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000));
  const secondsToNextUpdate = state.nextUpdateAt
    ? Math.max(0, Math.ceil((new Date(state.nextUpdateAt).getTime() - Date.now()) / 1000))
    : null;

  return (
    <main className="shell">
      <div className="scanline" />
      <section className="hero panel">
        <div className="agentCardDecoration">
          <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
        </div>
        <div>
          <span className="pill">QUANTUM_ARENA_v1.0</span>
          <h1>ALWAYS_ON. LIVE_PROGRESS. NO_RESET.</h1>
          <p>
            The arena stays live on the server, keeps cycling through rounds, and shows current progress,
            runtime, and the next scheduled update as soon as you open the site.
          </p>
        </div>
        <div className="heroActions">
          <div className="heroControlGroup">
            <button
              className="primaryButton"
              onClick={() => startArena({ mode: "continuous", totalRounds: null, roundDelayMs: 12000 })}
              disabled={isStarting || state.phase === "running"}
            >
              {isStarting ? "BOOTING_SEQUENCE..." : state.phase === "running" ? "ARENA_ACTIVE" : "RESTART_ENGINE"}
            </button>
            <button className="secondaryButton" onClick={stopArena} disabled={state.phase !== "running"}>
              TERMINATE
            </button>
          </div>
          <div className="heroMeta">
            <span className="pill">INSTANCE: {arenaId ? arenaId.slice(0, 8) : "IDLE"}</span>
            <span className="pill">DATA_STREAM: {state.nansen.source.toUpperCase()}</span>
          </div>
        </div>
      </section>

      <section className="overview grid overviewGrid">
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">CURRENT_PHASE</span>
          <strong>{state.mode === "continuous" ? `ROUND_${state.round.toString().padStart(3, "0")}` : `${state.round.toString().padStart(2, "0")} / ${(state.totalRounds ?? 0).toString().padStart(2, "0")}`}</strong>
          <small>{state.activeAgentId ? `NODE_${state.activeAgentId.toUpperCase()}_PROCESSING` : "AWAITING_ROUND_OPEN"}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">RUNTIME_AND_ETA</span>
          <strong>{Math.floor(runtimeSeconds / 60).toString().padStart(2, "0")}M {String(runtimeSeconds % 60).padStart(2, "0")}S</strong>
          <small>{secondsToNextUpdate === null ? "NO_TIMER_ACTIVE" : `NEXT_UPDATE_IN_${secondsToNextUpdate}S`}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">ALPHA_SIGNAL_TOP</span>
          <strong>{state.sharedMarket.topInflowToken || "SCANNING..."}</strong>
          <small>FOMO_RETAIL: {state.sharedMarket.topRetailToken}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">NANSEN_RATE_WINDOW</span>
          <strong>{state.nansen.totalCalls.toString().padStart(3, "0")} CALLS</strong>
          <small>{state.nansen.totalCredits} BUDGET_USED · {state.nansen.source.toUpperCase()}</small>
        </div>
      </section>

      {winner ? <WinnerBanner winner={winner} arenaId={arenaId} /> : null}

      <section className="grid mainGrid">
        <div className="grid cardsGrid">
          {AGENT_ORDER.map((agentId) => {
            const ranking = state.rankings.find((item) => item.id === agentId);
            const portfolio = state.portfolios[agentId];
            const result = state.lastRoundResults[agentId];
            return ranking ? (
              <AgentCard
                key={agentId}
                agent={ranking}
                portfolio={portfolio}
                result={result}
                isActive={state.activeAgentId === agentId}
              />
            ) : null;
          })}
        </div>

        <div className="grid sideGrid">
          <Leaderboard rankings={state.rankings} />
          <CommentaryPanel commentary={state.commentaries.at(-1)} />
          <EquityCurve state={state} />
          <LiveFeed events={state.log.slice(-14).reverse()} />
        </div>
      </section>
    </main>
  );
}
