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
    const { nansen, claude, portfolio, round } = context;

    // Step 1: Claude determines optimal filters for this agent's strategy
    const filters = await claude.getAgentFilters(
      {
        id: this.id,
        name: this.name,
        strategyPrompt: this.strategyPrompt,
        maxAllocPct: this.maxAllocPct,
      },
      portfolio,
      round,
    );

    // Step 2: Call all 3 Nansen endpoints in parallel
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
    return context.claude.getAgentTradeDecision(
      {
        id: this.id,
        name: this.name,
        strategyPrompt: this.strategyPrompt,
        maxAllocPct: this.maxAllocPct,
      },
      args.portfolio,
      args.marketData,
      round,
    );
  }

  protected signal(label: string, value: string, tone?: ResearchSignal["tone"]): ResearchSignal {
    return { label, value, tone };
  }
}

