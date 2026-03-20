import type { AgentPromptArgs, AgentRunContext } from "@/lib/types";

import { BaseAgent } from "@/services/agents/base";

export class MomentumAgent extends BaseAgent {
  id = "momentum" as const;
  name = "MOMENTUM";
  emoji = "🦅";
  color = "var(--momentum)";
  maxAllocPct = 0.5;
  dataSources = ["smart-money netflow", "tgm flows", "tgm dex-trades"];

  async gatherData({ nansen }: AgentRunContext) {
    const netflowResponse = await nansen.cliSmartMoneyNetflow("solana", 20);
    const topTokens = (netflowResponse.data ?? netflowResponse).slice(0, 3);
    const hourlyFlows = await Promise.all(
      topTokens.map((token: { token_address: string }) =>
        nansen.getTokenFlows({ chain: "solana", tokenAddress: token.token_address, timeframe: "1d" }),
      ),
    );
    const recentDexTrades = topTokens[0]
      ? await nansen.getTokenDexTrades({ chain: "solana", tokenAddress: topTokens[0].token_address, limit: 10 })
      : [];
    return { topSmartMoneyInflows: topTokens, hourlyFlows, recentDexTrades };
  }

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are MOMENTUM, an aggressive Solana trend follower. Concentrate capital into the strongest smart-money inflow. Return JSON only with thinking and trades.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nReturn JSON with { thinking, trades[] } and use up to 50% allocation on the strongest signal.`,
    };
  }
}
