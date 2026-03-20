import type { AgentPromptArgs, AgentRunContext } from "@/lib/types";

import { BaseAgent } from "@/services/agents/base";

export class QuantAgent extends BaseAgent {
  id = "quant" as const;
  name = "QUANT";
  emoji = "📊";
  color = "var(--quant)";
  maxAllocPct = 0.15;
  dataSources = ["nansen-score top-tokens", "tgm quant-scores", "tgm ohlcv", "tgm holders"];

  async gatherData({ nansen }: AgentRunContext) {
    const topTokens = (await nansen.getNansenScoreTopTokens()).slice(0, 3) as Array<{ token_address: string }>;
    const quantScores = await Promise.all(
      topTokens.map((token) => nansen.getTokenQuantScores({ chain: "solana", tokenAddress: token.token_address })),
    );
    const ohlcv = await Promise.all(
      topTokens.map((token) => nansen.getTokenOhlcv({ chain: "solana", tokenAddress: token.token_address })),
    );
    const holders = await Promise.all(
      topTokens.slice(0, 2).map((token) => nansen.getTokenHolders({ chain: "solana", tokenAddress: token.token_address, limit: 20 })),
    );
    return { topTokens, quantScores, ohlcv, holders };
  }

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are QUANT, a systematic Solana trading AI. Prefer diversified baskets, respect holder concentration, and return JSON only.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nBuild or rebalance a diversified basket with trades capped at 15% each.`,
    };
  }
}
