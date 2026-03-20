"use client";

import { useEffect, useState } from "react";

import { AgentCard } from "@/components/AgentCard";
import { CommentaryPanel } from "@/components/CommentaryPanel";
import { EquityCurve } from "@/components/EquityCurve";
import { Leaderboard } from "@/components/Leaderboard";
import { LiveFeed } from "@/components/LiveFeed";
import { NansenActivityPanel } from "@/components/NansenActivityPanel";
import { WinnerBanner } from "@/components/WinnerBanner";
import { useArenaStream } from "@/hooks/useArenaStream";

const AGENT_ORDER = ["momentum", "shadow", "contrarian", "quant"] as const;

export function ArenaView() {
  const { arenaId, state } = useArenaStream();
  const [now, setNow] = useState<number | null>(null);
  const winner = state.phase === "complete" ? state.rankings[0] : null;
  const currentTime = now ?? new Date(state.startedAt).getTime();
  const runtimeSeconds = Math.max(0, Math.floor((currentTime - new Date(state.startedAt).getTime()) / 1000));
  const secondsToNextUpdate = state.nextUpdateAt
    ? Math.max(0, Math.ceil((new Date(state.nextUpdateAt).getTime() - currentTime) / 1000))
    : null;

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="shell">
      <section className="hero panel">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span className="pill" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-soft)" }}>Live Session</span>
            <span className="pill">ID: {arenaId ? arenaId.slice(0, 8) : "Initializing..."}</span>
          </div>
          <h1>AI Agent Arena</h1>
          <p>
            Autonomous trading agents competing in real-time. Powered by Nansen data 
            and advanced strategic analysis.
          </p>
        </div>
        <div className="heroActions">
          <div className="heroMeta">
            <span className="pill">Status: Operational</span>
            <span className="pill">{state.mode === "continuous" ? "Continuous" : `Round ${state.round}`}</span>
          </div>
        </div>
      </section>

      <section className="overview grid overviewGrid">
        <div className="panel statCard">
          <span className="label">Current Phase</span>
          <strong>{state.mode === "continuous" ? `R${state.round}` : `${state.round}/${state.totalRounds ?? 0}`}</strong>
          <small>{state.activeAgentId ? `${state.activeAgentId} calculating` : "Cycle transition"}</small>
        </div>
        <div className="panel statCard">
          <span className="label">Session Uptime</span>
          <strong>{Math.floor(runtimeSeconds / 60).toString().padStart(2, "0")}m {String(runtimeSeconds % 60).padStart(2, "0")}s</strong>
          <small>{secondsToNextUpdate === null ? "Steady state" : `Next tick: ${secondsToNextUpdate}s`}</small>
        </div>
        <div className="panel statCard">
          <span className="label">Top Market Inflow</span>
          <strong>{state.sharedMarket.topInflowToken || "Scanning"}</strong>
          <small>Retail Heat: {state.sharedMarket.topRetailToken}</small>
        </div>
        <div className="panel statCard">
          <span className="label">Nansen Integration</span>
          <strong>{state.nansen.totalCalls} Calls</strong>
          <small>{state.nansen.totalCredits} credits · {state.nansen.source}</small>
        </div>
      </section>

      {state.error ? (
        <section className="panel statusBanner" style={{ background: "rgba(255, 59, 77, 0.05)", borderColor: "var(--danger)" }}>
          <p style={{ color: "var(--danger)", fontSize: "12px", fontFamily: "var(--font-mono)" }}>SYSTEM ERROR: {state.error}</p>
        </section>
      ) : null}

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
          <NansenActivityPanel calls={state.nansen.callLog} />
          <CommentaryPanel commentary={state.commentaries.at(-1)} />
          <EquityCurve state={state} />
          <LiveFeed events={state.log.slice(-14).reverse()} />
        </div>
      </section>
    </main>
  );
}

