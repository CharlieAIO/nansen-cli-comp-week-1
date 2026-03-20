import type { AgentDecisionArgs, AgentPortfolio, AgentPromptArgs, TradeDecision, TradeInstruction, TradingAgent } from "@/lib/types";

export abstract class BaseAgent implements TradingAgent {
  abstract id: TradingAgent["id"];
  abstract name: string;
  abstract emoji: string;
  abstract color: string;
  abstract maxAllocPct: number;
  abstract dataSources: string[];

  abstract gatherData(context: Parameters<TradingAgent["gatherData"]>[0]): ReturnType<TradingAgent["gatherData"]>;
  abstract decide(args: AgentDecisionArgs): TradeDecision;

  protected promptIntro(args: AgentPromptArgs) {
    const roundLabel = args.totalRounds ? `${args.round}/${args.totalRounds}` : `${args.round} (continuous)`;
    return `ROUND ${roundLabel}\n\nSCHEMA\n${args.schemaSummary}\n\nPORTFOLIO\nCash: ${args.portfolio.cashSol.toFixed(2)} SOL\nPositions: ${JSON.stringify(args.portfolio.positions)}\nTotal Value: ${args.portfolio.totalValueSol.toFixed(2)} SOL\nReturn: ${args.portfolio.returnPct.toFixed(2)}%\n\nCOMPETITION\n${args.otherAgents.map((agent) => `${agent.name}: ${agent.returnPct.toFixed(1)}%`).join("\n")}`;
  }

  abstract buildPrompt(args: AgentPromptArgs): { system: string; user: string };

  protected asRecords(input: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(input)) {
      return [];
    }

    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  protected asRecord(input: unknown): Record<string, unknown> | null {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return null;
    }

    return input as Record<string, unknown>;
  }

  protected num(value: unknown, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  protected text(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
  }

  protected fullExitTrades(portfolio: AgentPortfolio, keepAddress?: string) {
    return portfolio.positions
      .filter((position) => position.tokenAddress !== keepAddress)
      .map<TradeInstruction>((position) => ({
        action: "SELL",
        token_symbol: position.tokenSymbol,
        token_address: position.tokenAddress,
        amount_sol: 0,
        confidence: 0.55,
        reasoning: `Exit ${position.tokenSymbol} because it is no longer the active thesis.`,
      }));
  }

  protected hasPosition(portfolio: AgentPortfolio, tokenAddress: string) {
    return portfolio.positions.some((position) => position.tokenAddress === tokenAddress);
  }
}
