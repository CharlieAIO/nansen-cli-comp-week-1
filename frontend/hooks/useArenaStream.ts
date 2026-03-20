"use client";

import { useEffect, useMemo, useState } from "react";

import type { ArenaState } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

const defaultState: ArenaState = {
  id: "",
  phase: "idle",
  mode: "continuous",
  round: 0,
  totalRounds: null,
  startedAt: new Date(0).toISOString(),
  roundStartedAt: new Date(0).toISOString(),
  nextUpdateAt: undefined,
  activeAgentId: null,
  rankings: [],
  portfolios: {
    momentum: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    shadow: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    contrarian: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    quant: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
  },
  equityHistory: {
    momentum: [{ round: 0, valueSol: 10 }],
    shadow: [{ round: 0, valueSol: 10 }],
    contrarian: [{ round: 0, valueSol: 10 }],
    quant: [{ round: 0, valueSol: 10 }],
  },
  tradeHistory: { momentum: [], shadow: [], contrarian: [], quant: [] },
  thinkingHistory: { momentum: [], shadow: [], contrarian: [], quant: [] },
  lastRoundResults: {},
  commentaries: [],
  nansen: { totalCalls: 0, totalCredits: 0, callLog: [], schemaLoaded: false, source: "error" },
  sharedMarket: { solPriceUsd: 142, topInflowToken: "JUP", topRetailToken: "BONK" },
  log: [],
  aborted: false,
};

export function useArenaStream() {
  const [arenaId, setArenaId] = useState<string | null>(null);
  const [state, setState] = useState<ArenaState>(defaultState);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

  useEffect(() => {
    let active = true;

    async function pollArena() {
      const currentRes = await fetch(`${API_BASE}/api/arena/current`, { cache: "no-store" });
      const current = (await currentRes.json()) as { arenaId: string | null; state: ArenaState | null };
      if (!active) {
        return;
      }

      if (current.arenaId && current.state) {
        setArenaId(current.arenaId);
        setState(current.state);
      }
    }

    void pollArena();
    const interval = window.setInterval(() => {
      void pollArena();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [API_BASE]);

  return useMemo(() => ({ arenaId, state }), [arenaId, state]);
}
