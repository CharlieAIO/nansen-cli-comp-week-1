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

    const filters = await claude.getAgentFilters(
      { id: this.id, name: this.name, strategyPrompt: this.strategyPrompt, maxAllocPct: this.maxAllocPct },
      portfolio,
      round,
    );

    const [screener, netflow, pnlLeaderboard] = await Promise.all([
      nansen.postTokenScreener(filters.screener),
      nansen.postSmartMoneyNetflow(filters.netflow),
      nansen.postPnlLeaderboard(filters.pnlLeaderboard),
    ]);

    return {
      screener,
      netflow,
      pnlLeaderboard,
    };
  }

  async decide(
    args: { marketData: AgentNansenData; portfolio: AgentPortfolio },
    context: AgentRunContext,
    round: number,
  ): Promise<TradeDecision> {
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
