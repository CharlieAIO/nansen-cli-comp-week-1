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

  return (
    <main className="shell">
      <section className="hero panel">
        <div>
          <span className="pill">AI Agent Trading Arena</span>
          <h1>Four Solana agents. Real Nansen data. One winner.</h1>
          <p>
            Server-side Nansen and Claude orchestration, simulated execution, live SSE updates, and a
            commentator calling every round.
          </p>
        </div>
        <div className="heroActions">
          <button className="primaryButton" onClick={() => startArena({ totalRounds: 6, roundDelayMs: 800 })} disabled={isStarting || state.phase === "running"}>
            {isStarting ? "Booting arena..." : state.phase === "running" ? "Arena live" : "Start arena"}
          </button>
          <button className="secondaryButton" onClick={stopArena} disabled={state.phase !== "running"}>
            Stop
          </button>
          <div className="heroMeta">
            <span className="pill">Arena {arenaId ? arenaId.slice(0, 8) : "ready"}</span>
            <span className="pill">Source {state.nansen.source}</span>
          </div>
        </div>
      </section>

      <section className="overview grid overviewGrid">
        <div className="panel statCard">
          <span className="label">Round</span>
          <strong>{state.round}/{state.totalRounds}</strong>
          <small>{state.activeAgentId ? `${state.activeAgentId} on deck` : "Waiting for open"}</small>
        </div>
        <div className="panel statCard">
          <span className="label">Nansen Calls</span>
          <strong>{state.nansen.totalCalls}</strong>
          <small>{state.nansen.totalCredits} credits</small>
        </div>
        <div className="panel statCard">
          <span className="label">Shared Signal</span>
          <strong>{state.sharedMarket.topInflowToken}</strong>
          <small>Retail heat: {state.sharedMarket.topRetailToken}</small>
        </div>
        <div className="panel statCard">
          <span className="label">SOL Price</span>
          <strong>${state.sharedMarket.solPriceUsd.toFixed(2)}</strong>
          <small>{state.nansen.schemaLoaded ? "Schema loaded" : "Loading schema"}</small>
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
