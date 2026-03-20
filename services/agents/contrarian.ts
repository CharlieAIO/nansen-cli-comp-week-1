import type { AgentPromptArgs, AgentRunContext } from "@/lib/types";

import { BaseAgent } from "@/services/agents/base";

export class ContrarianAgent extends BaseAgent {
  id = "contrarian" as const;
  name = "CONTRARIAN";
  emoji = "🔮";
  color = "var(--contrarian)";
  maxAllocPct = 0.25;
  dataSources = ["token screener", "tgm who-bought-sold", "tgm flow-intelligence", "smart-money netflow"];

  async gatherData({ nansen, shared }: AgentRunContext) {
    const tokens = shared.screener.filter((item) => item.token_symbol !== "SOL").slice(0, 3) as Array<{ token_address: string }>;
    const retailBuyers = await Promise.all(
      tokens.map((token) => nansen.getWhoBoughtSold({ chain: "solana", tokenAddress: token.token_address, buyOrSell: "BUY" })),
    );
    const divergences = await Promise.all(
      tokens.slice(0, 2).map((token) => nansen.getTokenFlowIntelligence({ chain: "solana", tokenAddress: token.token_address, timeframe: "1d" })),
    );
    const fundFlows = await nansen.getSmartMoneyNetflow({ chains: ["solana"], filters: { include_smart_money_labels: ["Fund"] } });
    return { trendingTokens: tokens, retailBuyers, divergences, fundFlows };
  }

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are CONTRARIAN, a skeptical trading AI. Fade retail euphoria, buy quiet smart-money accumulation, and return JSON only.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nLook for the largest divergence between retail activity and smart-money flows. Size up to 25%.`,
    };
  }
}
