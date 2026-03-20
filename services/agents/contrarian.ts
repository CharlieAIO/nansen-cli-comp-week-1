import type { AgentDecisionArgs, AgentRunContext } from "@/lib/types";

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

  decide({ marketData, portfolio }: AgentDecisionArgs) {
    const tokens = this.asRecords(marketData.trendingTokens);
    const divergences = this.asRecords(marketData.divergences);
    const candidates = tokens.map((token, index) => {
      const divergence = this.asRecord(divergences[index]);
      const smartMoneyPct = this.num(divergence?.smart_money_pct);
      const retailPct = this.num(divergence?.retail_pct);
      const retailScore = this.num(token.retail_score, 100);
      const edge = smartMoneyPct - retailPct - retailScore / 200;
      return { token, edge, smartMoneyPct, retailPct, retailScore };
    });

    const best = candidates.sort((a, b) => b.edge - a.edge)[0];
    if (!best || best.edge <= 0) {
      return {
        thinking: "Contrarian sees retail euphoria without enough smart-money support, so it avoids new risk.",
        trades: this.fullExitTrades(portfolio),
        researchSummary: "No token showed a positive enough smart-money versus retail divergence to justify entry.",
        researchSignals: candidates.slice(0, 3).map((candidate) => this.signal(
          this.text(candidate.token.token_symbol, "Token"),
          `edge ${candidate.edge.toFixed(2)}`,
          candidate.edge > 0 ? "positive" : "negative",
        )),
      };
    }

    const tokenAddress = this.text(best.token.token_address);
    const tokenSymbol = this.text(best.token.token_symbol);
    const trades = this.fullExitTrades(portfolio, tokenAddress);

    if (!this.hasPosition(portfolio, tokenAddress)) {
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: Number((portfolio.totalValueSol * 0.2).toFixed(2)),
        confidence: 0.65,
        reasoning: `${tokenSymbol} shows the best smart-money versus retail divergence.`,
      });
    }

    return {
      thinking: `${tokenSymbol} has the cleanest divergence: smart money is stronger than retail participation while the crowd is less overheated.`,
      trades,
      focusToken: tokenSymbol,
      researchSummary: `${tokenSymbol} stood out because smart-money share beat retail share while retail intensity stayed comparatively lower.`,
      researchSignals: [
        this.signal("Smart-money share", `${Math.round(best.smartMoneyPct * 100)}%`, "positive"),
        this.signal("Retail share", `${Math.round(best.retailPct * 100)}%`, best.retailPct < best.smartMoneyPct ? "neutral" : "negative"),
        this.signal("Retail heat", `${Math.round(best.retailScore)}`, best.retailScore < 70 ? "positive" : "negative"),
      ],
    };
  }
}
