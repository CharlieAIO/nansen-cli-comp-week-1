import { ArenaRecord } from "../lib/arena-store";
import { NansenMCPClient } from "./mcp-client";
import type {
  AgentId,
  AgentPortfolio,
  AgentRoundResult,
  ArenaConfig,
  ArenaEvent,
  ArenaResult,
  ArenaState,
  ExecutedTrade,
  RoundSummary,
  SharedMarketSnapshot,
} from "../lib/types";
import { getAgents } from "../agents/index";
import { AIService } from "./ai";
import { NansenService } from "./nansen";
import { SimulationEngine } from "./simulation";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createPortfolio(): AgentPortfolio {
  return {
    cashSol: 10,
    positions: [],
    totalValueSol: 10,
    totalValueUsd: 1420,
    returnPct: 0,
    currentRound: 1,
  };
}

export class ArenaOrchestrator {
  private readonly nansen = new NansenService();
  private readonly claude = new AIService();
  private readonly sim = new SimulationEngine();
  private readonly agents = getAgents();
  private readonly mcp: NansenMCPClient | undefined;
  readonly record: ArenaRecord;
  // Baseline captured from persisted state so new calls accumulate on top
  // rather than resetting to zero each time the process restarts.
  private readonly nansenBaseline: { totalCalls: number; totalCredits: number; callLog: ArenaState["nansen"]["callLog"] };

  constructor(private readonly arenaId: string, private readonly config: ArenaConfig, initialState?: ArenaState) {
    this.record = new ArenaRecord(initialState ? structuredClone(initialState) : this.initializeState());
    const mcpKey = process.env.NANSEN_API_KEY;
    if (mcpKey) {
      this.mcp = new NansenMCPClient(mcpKey);
    }
    this.nansenBaseline = {
      totalCalls: this.record.state.nansen.totalCalls,
      totalCredits: this.record.state.nansen.totalCredits,
      callLog: [...this.record.state.nansen.callLog],
    };
  }

  abort() {
    this.record.state.aborted = true;
    this.record.state.phase = "aborted";
    this.emit("arena_aborted", { message: "Arena aborted by user." });
  }

  async runArena(): Promise<ArenaResult> {
    try {
      this.record.state.aborted = false;
      this.record.state.error = undefined;
      this.record.state.completedAt = undefined;
      this.record.state.phase = "running";
      this.claude.ensureConfigured();
      if (!process.env.NANSEN_API_KEY) {
        throw new Error("NANSEN_API_KEY is not configured");
      }
      this.emit("arena_start", { totalRounds: this.config.totalRounds, source: this.nansen.getSource() });

      if (this.mcp) {
        try {
          await this.mcp.connect();
          this.emit("log", { message: `MCP connected — ${this.mcp.tools.length} tools available` });
        } catch (error) {
          this.emit("log", { message: `MCP unavailable, using REST research only: ${error instanceof Error ? error.message : String(error)}` });
        }
      }

      let round = this.record.state.round > 0 ? this.record.state.round + 1 : 1;
      while (!this.record.state.aborted && (this.config.mode === "continuous" || round <= (this.config.totalRounds ?? 0))) {
        if (this.record.state.aborted) {
          break;
        }

        this.record.state.round = round;
        this.record.state.roundStartedAt = new Date().toISOString();
        this.emit("round_start", { round });

        const shared = await this.loadSharedMarket();
        this.record.state.sharedMarket = {
          solPriceUsd: shared.solPriceUsd,
          topInflowToken: String(shared.netflows[0]?.token_symbol ?? "JUP"),
          topRetailToken: String(shared.screener[2]?.token_symbol ?? "BONK"),
        };
        if (!shared.isLiveData) {
          throw new Error("Live Nansen data is unavailable");
        }
        this.record.state.error = undefined;

        for (const agent of this.agents) {
          const portfolio = this.record.state.portfolios[agent.id];
          this.record.state.portfolios[agent.id] = this.sim.markToMarket(portfolio, shared.priceMap);
        }

        for (const agent of this.agents) {
          if (this.record.state.aborted) {
            break;
          }

          this.record.state.activeAgentId = agent.id;
          this.emit("agent_start", { agentId: agent.id, name: agent.name });

          const context = {
            nansen: this.nansen,
            claude: this.claude,
            mcp: this.mcp,
            shared,
            portfolio: this.record.state.portfolios[agent.id],
            round,
          };
          const marketData = await agent.gatherData(context);
          this.emit("agent_data", { agentId: agent.id, dataSources: agent.dataSources });
          const decision = await agent.decide({
            marketData,
            portfolio: this.record.state.portfolios[agent.id],
          }, context, round);
          this.emit("agent_decision", { agentId: agent.id, thinking: decision.thinking, tradeCount: decision.trades.length });
          const result = this.sim.executeTrades(this.record.state.portfolios[agent.id], decision.trades, shared.priceMap);
          this.record.state.portfolios[agent.id] = result.portfolio;
          this.record.state.tradeHistory[agent.id].push(...result.executedTrades);
          this.record.state.thinkingHistory[agent.id].push(decision.thinking);
          const roundResult: AgentRoundResult = {
            agentId: agent.id,
            trades: result.executedTrades,
            thinking: decision.thinking,
            portfolio: result.portfolio,
            focusToken: decision.focusToken,
            researchSummary: decision.researchSummary,
            researchSignals: decision.researchSignals,
          };
          this.record.state.lastRoundResults[agent.id] = roundResult;
          this.emit("agent_trades", {
            agentId: agent.id,
            trades: result.executedTrades,
            portfolio: result.portfolio,
            focusToken: decision.focusToken,
            researchSummary: decision.researchSummary,
          });

          this.refreshNansenStats();
          this.record.state.nextUpdateAt = new Date(Date.now() + this.config.roundDelayMs).toISOString();
          await sleep(this.config.roundDelayMs);
        }

        this.record.state.activeAgentId = null;
        this.captureEquityHistory(round);
        const commentary = await this.safeCommentary(round);
        if (commentary) {
          this.record.state.commentaries.push(commentary);
          this.emit("commentary", { round, commentary });
        }
        this.updateRankings();
        this.emit("round_end", { round, rankings: this.record.state.rankings });
        this.record.state.nextUpdateAt = new Date(Date.now() + this.config.roundDelayMs).toISOString();
        await sleep(this.config.roundDelayMs);
        round += 1;
      }

      this.record.state.nextUpdateAt = undefined;
      this.record.state.phase = this.record.state.aborted ? "aborted" : "complete";
      this.record.state.completedAt = new Date().toISOString();
      this.updateRankings();
      this.refreshNansenStats();
      if (!this.record.state.aborted) {
        this.emit("arena_complete", {
          winner: this.record.state.rankings[0] ?? null,
          totalCalls: this.record.state.nansen.totalCalls,
          totalCredits: this.record.state.nansen.totalCredits,
        });
      }

      return {
        arenaId: this.arenaId,
        winner: this.record.state.rankings[0] ?? null,
        state: this.record.state,
      };
    } catch (error) {
      const failedAgentId = this.record.state.activeAgentId;
      this.record.state.phase = "aborted";
      this.record.state.error = error instanceof Error ? error.message : "Arena crashed";
      this.record.state.activeAgentId = null;
      this.record.state.nextUpdateAt = undefined;
      this.refreshNansenStats();
      this.emit("agent_error", { agentId: failedAgentId, message: this.record.state.error });
      this.emit("log", { message: "Arena halted", error: this.record.state.error });
      return {
        arenaId: this.arenaId,
        winner: this.record.state.rankings[0] ?? null,
        state: this.record.state,
      };
    }
  }

  private initializeState(): ArenaState {
    const portfolios = Object.fromEntries(this.agents.map((agent) => [agent.id, createPortfolio()])) as Record<AgentId, AgentPortfolio>;
    const tradeHistory = Object.fromEntries(this.agents.map((agent) => [agent.id, [] as ExecutedTrade[]])) as Record<AgentId, ExecutedTrade[]>;
    const thinkingHistory = Object.fromEntries(this.agents.map((agent) => [agent.id, [] as string[]])) as Record<AgentId, string[]>;

    return {
      id: this.arenaId,
      phase: "idle",
      mode: this.config.mode,
      round: 0,
      totalRounds: this.config.totalRounds,
      startedAt: new Date().toISOString(),
      roundStartedAt: new Date().toISOString(),
      activeAgentId: null,
      rankings: this.agents.map((agent, index) => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        totalValueSol: 10,
        returnPct: 0,
        rank: index + 1,
      })),
      portfolios,
      equityHistory: {
        momentum: [{ round: 0, valueSol: 10 }],
        shadow: [{ round: 0, valueSol: 10 }],
        contrarian: [{ round: 0, valueSol: 10 }],
        quant: [{ round: 0, valueSol: 10 }],
      },
      tradeHistory,
      thinkingHistory,
      lastRoundResults: {},
      commentaries: [],
      nansen: {
        totalCalls: 0,
        totalCredits: 0,
        callLog: [],
        schemaLoaded: true,
        source: this.nansen.getSource(),
      },
      sharedMarket: {
        solPriceUsd: 142,
        topInflowToken: "JUP",
        topRetailToken: "BONK",
      },
      log: [],
      aborted: false,
    };
  }

  private async loadSharedMarket(): Promise<SharedMarketSnapshot> {
    const [sharedNetflows, sharedScreener] = await Promise.all([
      this.nansen.getSmartMoneyNetflow({ chain: "solana", limit: 20 }),
      this.nansen.getTokenScreener({ chain: "solana", timeframe: "24h", limit: 20 }),
    ]);
    const netflows = this.normalizeRecords(sharedNetflows);
    const screener = this.normalizeRecords(sharedScreener);
    const priceMap = this.sim.buildPriceMap(netflows, screener);
    const solPriceUsd = priceMap.get("SOL") ?? 142;
    const isLiveData = this.nansen.getSource() === "live" || (this.mcp?.connected ?? false);
    this.refreshNansenStats();
    return { netflows, screener, priceMap, solPriceUsd, isLiveData };
  }

  private normalizeRecords(input: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(input)) {
      return input.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }

    if (!input || typeof input !== "object") {
      return [];
    }

    const value = input as Record<string, unknown>;
    for (const key of ["data", "items", "results", "tokens", "rows"]) {
      if (Array.isArray(value[key])) {
        return value[key].filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
      }
    }

    return [];
  }

  private async safeCommentary(round: number) {
    try {
      return await this.claude.getCommentary(this.buildRoundSummary(round));
    } catch {
      return null;
    }
  }

  private buildRoundSummary(round: number): RoundSummary {
    return {
      round,
      agents: this.agents.map((agent) => ({
        name: agent.name,
        portfolio_value_sol: this.record.state.portfolios[agent.id].totalValueSol,
        return_pct: this.record.state.portfolios[agent.id].returnPct,
        this_round_trades: this.record.state.lastRoundResults[agent.id]?.trades ?? [],
        reasoning: this.record.state.lastRoundResults[agent.id]?.thinking ?? "No decision yet.",
        nansen_data_used: agent.dataSources,
      })),
      market_context: {
        sol_price_usd: this.record.state.sharedMarket.solPriceUsd,
        top_smart_money_inflow_token: this.record.state.sharedMarket.topInflowToken,
        biggest_retail_fomo_token: this.record.state.sharedMarket.topRetailToken,
      },
    };
  }

  private updateRankings() {
    this.record.state.rankings = this.agents
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        totalValueSol: this.record.state.portfolios[agent.id].totalValueSol,
        returnPct: this.record.state.portfolios[agent.id].returnPct,
        rank: 0,
      }))
      .sort((a, b) => b.totalValueSol - a.totalValueSol)
      .map((agent, index) => ({ ...agent, rank: index + 1 }));
  }

  private refreshNansenStats() {
    const newCalls = this.nansen.getCallLog();
    this.record.state.nansen = {
      totalCalls: this.nansenBaseline.totalCalls + this.nansen.getTotalCalls(),
      totalCredits: this.nansenBaseline.totalCredits + this.nansen.getTotalCredits(),
      callLog: [...newCalls, ...this.nansenBaseline.callLog].slice(-400),
      schemaLoaded: this.record.state.nansen.schemaLoaded,
      source: this.nansen.getSource(),
    };
  }

  private captureEquityHistory(round: number) {
    for (const agent of this.agents) {
      this.record.state.equityHistory[agent.id].push({
        round,
        valueSol: this.record.state.portfolios[agent.id].totalValueSol,
      });
    }
  }

  private emit(type: ArenaEvent["type"], data: unknown) {
    this.record.emit({
      type,
      arenaId: this.arenaId,
      timestamp: new Date().toISOString(),
      data,
    });
  }
}
