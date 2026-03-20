import type { AgentDecisionArgs, AgentRunContext, TradeInstruction } from "@/lib/types";

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

  decide({ marketData, portfolio }: AgentDecisionArgs) {
    const topTokens = this.asRecords(marketData.topTokens);
    const quantScores = this.asRecords(marketData.quantScores);
    const ohlcvSeries = this.asRecords(marketData.ohlcv);
    const holdersSeries = this.asRecords(marketData.holders);

    const candidates = topTokens.map((token, index) => {
      const quant = this.asRecord(quantScores[index]);
      const candles = this.asRecords(ohlcvSeries[index]);
      const holders = this.asRecords(holdersSeries[index]);
      const firstClose = this.num(candles[0]?.close, 0);
      const lastClose = this.num(candles[candles.length - 1]?.close, firstClose);
      const trend = firstClose > 0 ? (lastClose - firstClose) / firstClose : 0;
      const concentration = holders.slice(0, 3).reduce((sum, holder) => sum + this.num(holder.share_pct), 0);
      const composite = this.num(token.nansen_score) + this.num(quant?.momentum_score) * 20 + trend * 50 - concentration * 100;
      return { token, composite, concentration, trend };
    });

    const selected = candidates
      .filter((candidate) => candidate.composite > 40)
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 3);

    const keep = new Set(selected.map((candidate) => this.text(candidate.token.token_address)).filter(Boolean));
    const trades: TradeInstruction[] = portfolio.positions
      .filter((position) => !keep.has(position.tokenAddress))
      .map((position) => ({
        action: "SELL" as const,
        token_symbol: position.tokenSymbol,
        token_address: position.tokenAddress,
        amount_sol: 0,
        confidence: 0.58,
        reasoning: `${position.tokenSymbol} dropped out of Quant's ranked basket.`,
      }));

    const allocation = selected.length > 0 ? Number((portfolio.totalValueSol * 0.12).toFixed(2)) : 0;
    for (const candidate of selected) {
      const tokenAddress = this.text(candidate.token.token_address);
      const tokenSymbol = this.text(candidate.token.token_symbol);
      if (!tokenAddress || this.hasPosition(portfolio, tokenAddress)) {
        continue;
      }
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: allocation,
        confidence: 0.63,
        reasoning: `${tokenSymbol} ranks well on quant score, trend, and holder concentration.`,
      });
    }

    return {
      thinking: selected.length
        ? `Quant keeps a diversified basket of ${selected.map((candidate) => this.text(candidate.token.token_symbol)).join(", ")} based on score, trend, and holder structure.`
        : "Quant sees no basket with a strong enough composite score and trims risk.",
      trades,
      focusToken: selected[0] ? this.text(selected[0].token.token_symbol) : undefined,
      researchSummary: selected.length
        ? `Quant ranked tokens on composite score, short-term trend, and holder concentration before rebalancing the basket.`
        : "Quant found no basket clearing its composite threshold, so it reduces exposure.",
      researchSignals: (selected.length ? selected : candidates.slice(0, 3)).map((candidate) => this.signal(
        this.text(candidate.token.token_symbol, "Token"),
        `score ${candidate.composite.toFixed(1)} | trend ${(candidate.trend * 100).toFixed(1)}%`,
        candidate.composite > 40 ? "positive" : "neutral",
      )),
    };
  }
}
