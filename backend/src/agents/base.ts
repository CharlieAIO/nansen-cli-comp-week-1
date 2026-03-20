import type {
  AgentNansenData,
  AgentPortfolio,
  AgentRunContext,
  ResearchSignal,
  TradeDecision,
  TradingAgent,
} from "../lib/types";

export abstract class BaseAgent implements TradingAgent {
  abstract id: TradingAgent["id"];
  abstract name: string;
  abstract emoji: string;
  abstract color: string;
  abstract maxAllocPct: number;
  abstract dataSources: string[];
  abstract readonly strategyPrompt: string;

  async gatherData(context: AgentRunContext): Promise<AgentNansenData> {
    // When MCP is connected, data gathering happens inside the agentic loop in decide()
    if (context.mcp?.connected) {
      return { screener: [], netflow: [], pnlLeaderboard: [] };
    }

    const { nansen, claude, portfolio, round } = context;

    const filters = await claude.getAgentFilters(
      { id: this.id, name: this.name, strategyPrompt: this.strategyPrompt, maxAllocPct: this.maxAllocPct },
      portfolio,
      round,
    );

    const [screener, netflow, pnlLeaderboard] = await Promise.allSettled([
      nansen.postTokenScreener(filters.screener),
      nansen.postSmartMoneyNetflow(filters.netflow),
      nansen.postPnlLeaderboard(filters.pnlLeaderboard),
    ]);

    return {
      screener: screener.status === "fulfilled" ? screener.value : [],
      netflow: netflow.status === "fulfilled" ? netflow.value : [],
      pnlLeaderboard: pnlLeaderboard.status === "fulfilled" ? pnlLeaderboard.value : [],
    };
  }

  async decide(
    args: { marketData: AgentNansenData; portfolio: AgentPortfolio },
    context: AgentRunContext,
    round: number,
  ): Promise<TradeDecision> {
    if (context.mcp?.connected) {
      return context.claude.runAgentWithMCP(
        { id: this.id, name: this.name, strategyPrompt: this.strategyPrompt, maxAllocPct: this.maxAllocPct },
        args.portfolio,
        round,
        context.mcp,
        (name, toolArgs) => context.nansen.logMcpCall(name, toolArgs),
      );
    }

    return context.claude.getAgentTradeDecision(
      { id: this.id, name: this.name, strategyPrompt: this.strategyPrompt, maxAllocPct: this.maxAllocPct },
      args.portfolio,
      args.marketData,
      round,
    );
  }

  protected signal(label: string, value: string, tone?: ResearchSignal["tone"]): ResearchSignal {
    return { label, value, tone };
  }
}

