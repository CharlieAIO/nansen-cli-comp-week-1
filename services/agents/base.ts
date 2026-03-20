import type { AgentPromptArgs, TradingAgent } from "@/lib/types";

export abstract class BaseAgent implements TradingAgent {
  abstract id: TradingAgent["id"];
  abstract name: string;
  abstract emoji: string;
  abstract color: string;
  abstract maxAllocPct: number;
  abstract dataSources: string[];

  abstract gatherData(context: Parameters<TradingAgent["gatherData"]>[0]): ReturnType<TradingAgent["gatherData"]>;

  protected promptIntro(args: AgentPromptArgs) {
    const roundLabel = args.totalRounds ? `${args.round}/${args.totalRounds}` : `${args.round} (continuous)`;
    return `ROUND ${roundLabel}\n\nSCHEMA\n${args.schemaSummary}\n\nPORTFOLIO\nCash: ${args.portfolio.cashSol.toFixed(2)} SOL\nPositions: ${JSON.stringify(args.portfolio.positions)}\nTotal Value: ${args.portfolio.totalValueSol.toFixed(2)} SOL\nReturn: ${args.portfolio.returnPct.toFixed(2)}%\n\nCOMPETITION\n${args.otherAgents.map((agent) => `${agent.name}: ${agent.returnPct.toFixed(1)}%`).join("\n")}`;
  }

  abstract buildPrompt(args: AgentPromptArgs): { system: string; user: string };
}
