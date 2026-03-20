export type AgentId = "momentum" | "shadow" | "contrarian" | "quant";

export type ArenaPhase = "idle" | "running" | "complete" | "aborted";

export type TradeAction = "BUY" | "SELL";

export interface ArenaConfig {
  totalRounds: number;
  roundDelayMs: number;
  chain: "solana";
}

export interface NansenCall {
  endpoint: string;
  params: unknown;
  status: number;
  latencyMs: number;
  timestamp: string;
  creditCost: number;
  via: "rest" | "cli" | "mock";
}

export interface TradeInstruction {
  action: TradeAction;
  token_symbol: string;
  token_address: string;
  amount_sol: number;
  confidence: number;
  reasoning: string;
}

export interface TradeDecision {
  thinking: string;
  trades: TradeInstruction[];
}

export interface ExecutedTrade extends TradeInstruction {
  executedPriceUsd: number;
  usdValue: number;
  realizedPnlPct?: number;
  status: "FILLED" | "SKIPPED";
}

export interface Position {
  tokenSymbol: string;
  tokenAddress: string;
  tokenAmount: number;
  entryValueUsd: number;
  entryPriceUsd: number;
  currentValueUsd: number;
  entryRound: number;
}

export interface AgentPortfolio {
  cashSol: number;
  positions: Position[];
  totalValueSol: number;
  totalValueUsd: number;
  returnPct: number;
  currentRound: number;
}

export interface AgentSummary {
  id: AgentId;
  name: string;
  emoji: string;
  color: string;
  totalValueSol: number;
  returnPct: number;
  rank: number;
}

export interface CommentaryOutput {
  round_commentary: string;
  tension_narrative: string;
  mvp_this_round: string;
  most_interesting_trade: string;
  prediction: string;
}

export interface AgentRoundResult {
  agentId: AgentId;
  trades: ExecutedTrade[];
  thinking: string;
  portfolio: AgentPortfolio;
}

export interface RoundSummary {
  round: number;
  agents: Array<{
    name: string;
    portfolio_value_sol: number;
    return_pct: number;
    this_round_trades: ExecutedTrade[];
    reasoning: string;
    nansen_data_used: string[];
  }>;
  market_context: {
    sol_price_usd: number;
    top_smart_money_inflow_token: string;
    biggest_retail_fomo_token: string;
  };
}

export interface ArenaState {
  id: string;
  phase: ArenaPhase;
  round: number;
  totalRounds: number;
  startedAt: string;
  completedAt?: string;
  activeAgentId: AgentId | null;
  rankings: AgentSummary[];
  portfolios: Record<AgentId, AgentPortfolio>;
  equityHistory: Record<AgentId, Array<{ round: number; valueSol: number }>>;
  tradeHistory: Record<AgentId, ExecutedTrade[]>;
  thinkingHistory: Record<AgentId, string[]>;
  lastRoundResults: Partial<Record<AgentId, AgentRoundResult>>;
  commentaries: CommentaryOutput[];
  nansen: {
    totalCalls: number;
    totalCredits: number;
    callLog: NansenCall[];
    schemaLoaded: boolean;
    source: "live" | "mock";
  };
  sharedMarket: {
    solPriceUsd: number;
    topInflowToken: string;
    topRetailToken: string;
  };
  log: ArenaEvent[];
  aborted: boolean;
  error?: string;
}

export interface ArenaResult {
  arenaId: string;
  winner: AgentSummary | null;
  state: ArenaState;
}

export interface ArenaEvent {
  type:
    | "arena_start"
    | "round_start"
    | "agent_start"
    | "agent_data"
    | "agent_decision"
    | "agent_trades"
    | "commentary"
    | "round_end"
    | "arena_complete"
    | "arena_aborted"
    | "agent_error"
    | "log";
  arenaId: string;
  timestamp: string;
  data: unknown;
}

export interface ArenaEventEnvelope {
  event: ArenaEvent["type"];
  data: unknown;
  state?: ArenaState;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  emoji: string;
  color: string;
  maxAllocPct: number;
  dataSources: string[];
}

export interface AgentMarketData {
  [key: string]: unknown;
}

export interface TradingAgent extends AgentDefinition {
  gatherData(context: AgentRunContext): Promise<AgentMarketData>;
  buildPrompt(args: AgentPromptArgs): { system: string; user: string };
}

export interface AgentPromptArgs {
  marketData: AgentMarketData;
  portfolio: AgentPortfolio;
  round: number;
  totalRounds: number;
  otherAgents: AgentSummary[];
  schemaSummary: string;
}

export interface AgentRunContext {
  nansen: import("@/services/nansen").NansenService;
  shared: SharedMarketSnapshot;
}

export interface SharedMarketSnapshot {
  netflows: Array<Record<string, unknown>>;
  screener: Array<Record<string, unknown>>;
  priceMap: Map<string, number>;
  solPriceUsd: number;
}
