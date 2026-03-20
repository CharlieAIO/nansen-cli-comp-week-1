"use client";

import { useEffect, useState } from "react";

import { AgentCard } from "@/components/AgentCard";
import { CommentaryPanel } from "@/components/CommentaryPanel";
import { EquityCurve } from "@/components/EquityCurve";
import { Leaderboard } from "@/components/Leaderboard";
import { LiveFeed } from "@/components/LiveFeed";
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
        <div className="agentCardDecoration">
          <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
        </div>
        <div>
          <span className="pill">AI Agent Trading Arena</span>
          <h1>Shared live arena</h1>
          <p>
            A backend-managed process keeps four agents trading continuously, and this page polls the
            latest state so anyone opening the site sees the same run in progress.
          </p>
        </div>
        <div className="heroActions">
          <div className="heroMeta">
            <span className="pill">Arena {arenaId ? arenaId.slice(0, 8) : "booting"}</span>
            <span className="pill">Data {state.nansen.source}</span>
            <span className="pill">Polling shared status</span>
          </div>
        </div>
      </section>

      <section className="overview grid overviewGrid">
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">Round</span>
          <strong>{state.mode === "continuous" ? `#${state.round}` : `${state.round}/${state.totalRounds ?? 0}`}</strong>
          <small>{state.activeAgentId ? `${state.activeAgentId} is processing` : "Waiting for next cycle"}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">Uptime</span>
          <strong>{Math.floor(runtimeSeconds / 60).toString().padStart(2, "0")}m {String(runtimeSeconds % 60).padStart(2, "0")}s</strong>
          <small>{secondsToNextUpdate === null ? "No timer active" : `Next update in about ${secondsToNextUpdate}s`}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">Lead signal</span>
          <strong>{state.sharedMarket.topInflowToken || "Scanning"}</strong>
          <small>Retail heat: {state.sharedMarket.topRetailToken}</small>
        </div>
        <div className="panel statCard">
          <div className="agentCardDecoration"><div className="corner-tl" style={{ background: "var(--accent)" }}></div></div>
          <span className="label">Nansen activity</span>
          <strong>{state.nansen.totalCalls} calls</strong>
          <small>{state.nansen.totalCredits} credits used · {state.nansen.source}</small>
        </div>
      </section>

      {state.error ? (
        <section className="panel statusBanner">
          <span className="pill">Status</span>
          <p>{state.error}</p>
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
          <CommentaryPanel commentary={state.commentaries.at(-1)} />
          <EquityCurve state={state} />
          <LiveFeed events={state.log.slice(-14).reverse()} />
        </div>
      </section>
    </main>
  );
}
