"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { ArenaConfig, ArenaState } from "@/lib/types";

const defaultState: ArenaState = {
  id: "",
  phase: "idle",
  round: 0,
  totalRounds: 6,
  startedAt: new Date(0).toISOString(),
  activeAgentId: null,
  rankings: [],
  portfolios: {
    momentum: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    shadow: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    contrarian: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
    quant: { cashSol: 10, positions: [], totalValueSol: 10, totalValueUsd: 1420, returnPct: 0, currentRound: 1 },
  },
  tradeHistory: { momentum: [], shadow: [], contrarian: [], quant: [] },
  thinkingHistory: { momentum: [], shadow: [], contrarian: [], quant: [] },
  lastRoundResults: {},
  commentaries: [],
  nansen: { totalCalls: 0, totalCredits: 0, callLog: [], schemaLoaded: false, source: "mock" },
  sharedMarket: { solPriceUsd: 142, topInflowToken: "JUP", topRetailToken: "BONK" },
  log: [],
  aborted: false,
};

export function useArenaStream() {
  const [arenaId, setArenaId] = useState<string | null>(null);
  const [state, setState] = useState<ArenaState>(defaultState);
  const [isStarting, setIsStarting] = useState(false);

  const startArena = useCallback(async (config: Partial<ArenaConfig>) => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/arena/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { arenaId: string };
      setArenaId(data.arenaId);
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopArena = useCallback(async () => {
    if (!arenaId) return;
    await fetch(`/api/arena/stop/${arenaId}`, { method: "POST" });
  }, [arenaId]);

  useEffect(() => {
    if (!arenaId) return;
    const source = new EventSource(`/api/arena/stream/${arenaId}`);
    source.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as { state?: ArenaState; data?: ArenaState };
      if (parsed.state) {
        setState(parsed.state);
      } else if (parsed.data && "phase" in parsed.data) {
        setState(parsed.data);
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [arenaId]);

  return useMemo(
    () => ({ arenaId, state, isStarting, startArena, stopArena }),
    [arenaId, state, isStarting, startArena, stopArena],
  );
}
