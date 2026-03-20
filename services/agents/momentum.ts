import type { AgentDecisionArgs, AgentPromptArgs, AgentRunContext } from "@/lib/types";

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

  decide({ marketData, portfolio }: AgentDecisionArgs) {
    const inflows = this.asRecords(marketData.topSmartMoneyInflows);
    const flows = this.asRecords(marketData.hourlyFlows);
    const dexTrades = this.asRecords(marketData.recentDexTrades);

    const scored = inflows.map((token, index) => {
      const flowRecord = this.asRecord(flows[index]);
      const hourly = this.asRecords(flowRecord?.hourly);
      const earlyFlow = hourly.slice(0, 3).reduce((sum, item) => sum + this.num(item.net_usd), 0);
      const lateFlow = hourly.slice(-3).reduce((sum, item) => sum + this.num(item.net_usd), 0);
      const buyPressure = dexTrades.reduce((sum, trade) => {
        const direction = this.text(trade.side) === "BUY" ? 1 : -1;
        return sum + direction * this.num(trade.volume_usd);
      }, 0);
      const netFlow = this.num(token.net_flow_24h_usd);
      const score = netFlow + (lateFlow - earlyFlow) * 2 + buyPressure;
      return { token, score, lateFlow, earlyFlow, buyPressure };
    });

    const best = scored.sort((a, b) => b.score - a.score)[0];
    if (!best) {
      return { thinking: "Momentum found no token with enough inflow data to act.", trades: [] };
    }

    const tokenAddress = this.text(best.token.token_address);
    const tokenSymbol = this.text(best.token.token_symbol);
    const accelerating = best.lateFlow > best.earlyFlow;
    const positivePressure = best.buyPressure >= 0;

    if (!accelerating && !positivePressure) {
      return {
        thinking: `${tokenSymbol} still leads smart-money inflow, but the move is losing force, so Momentum stays patient.`,
        trades: this.fullExitTrades(portfolio),
      };
    }

    const trades = this.fullExitTrades(portfolio, tokenAddress);
    if (!this.hasPosition(portfolio, tokenAddress)) {
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: Number((portfolio.totalValueSol * 0.42).toFixed(2)),
        confidence: 0.73,
        reasoning: `${tokenSymbol} has the strongest smart-money inflow with improving hourly flow momentum.`,
      });
    }

    return {
      thinking: `${tokenSymbol} leads on smart-money inflow, hourly flows are ${accelerating ? "accelerating" : "stable"}, and buy pressure remains ${positivePressure ? "supportive" : "mixed"}.`,
      trades,
    };
  }

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are MOMENTUM, an aggressive Solana trend follower. Concentrate capital into the strongest smart-money inflow. Return JSON only with thinking and trades.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nReturn JSON with { thinking, trades[] } and use up to 50% allocation on the strongest signal.`,
    };
  }
}
