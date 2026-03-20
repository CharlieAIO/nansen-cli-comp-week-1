import type { AgentDecisionArgs, AgentPromptArgs, AgentRunContext } from "@/lib/types";

import { BaseAgent } from "@/services/agents/base";

export class ShadowAgent extends BaseAgent {
  id = "shadow" as const;
  name = "SHADOW";
  emoji = "🐋";
  color = "var(--shadow)";
  maxAllocPct = 0.3;
  dataSources = ["tgm pnl-leaderboard", "profiler transactions", "wallet pnl summary", "profiler balance"];

  async gatherData({ nansen, shared }: AgentRunContext) {
    const trendingToken = shared.netflows[0] as { token_address: string } | undefined;
    if (!trendingToken) {
      return { leaderboard: [], walletTransactions: [], walletSummary: null, walletBalances: [] };
    }
    const leaderboard = await nansen.getPnlLeaderboard({ chain: "solana", tokenAddress: trendingToken.token_address });
    const wallets = leaderboard.slice(0, 3).map((item: { address: string }) => item.address);
    const walletTransactions = wallets.length
      ? await nansen.getWalletTransactions({ chain: "solana", addresses: wallets, limit: 20 })
      : [];
    const bestWallet = wallets[0];
    const walletSummary = bestWallet ? await nansen.getWalletPnlSummary({ chain: "solana", address: bestWallet }) : null;
    const walletBalances = bestWallet ? await nansen.cliProfilerBalance(bestWallet, "solana") : { data: [] };
    return { leaderboard, walletTransactions, walletSummary, walletBalances: walletBalances.data ?? walletBalances };
  }

  decide({ marketData, portfolio }: AgentDecisionArgs) {
    const balances = this.asRecords(marketData.walletBalances);
    const transactions = this.asRecords(marketData.walletTransactions);
    const walletSummary = this.asRecord(marketData.walletSummary);
    const winRate = this.num(walletSummary?.win_rate);

    const balanceTarget = [...balances].sort((a, b) => this.num(b.value_usd) - this.num(a.value_usd))[0];
    const transactionTarget = [...transactions]
      .filter((tx) => this.text(tx.side) === "BUY")
      .sort((a, b) => this.num(b.value_usd) - this.num(a.value_usd))[0];
    const target = balanceTarget ?? transactionTarget;

    if (!target || winRate < 0.55) {
      return {
        thinking: "Shadow could not validate a strong enough wallet to mirror this round.",
        trades: [],
      };
    }

    const tokenAddress = this.text(target.token_address);
    const tokenSymbol = this.text(target.token_symbol);
    const trades = this.fullExitTrades(portfolio, tokenAddress);

    if (!this.hasPosition(portfolio, tokenAddress)) {
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: Number((portfolio.totalValueSol * 0.28).toFixed(2)),
        confidence: 0.69,
        reasoning: `${tokenSymbol} is the clearest current conviction in the copied wallet set.`,
      });
    }

    return {
      thinking: `Shadow follows the highest-conviction wallet exposure in ${tokenSymbol} after validating a ${Math.round(winRate * 100)}% win rate.`,
      trades,
    };
  }

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are SHADOW, a copy-trading AI. Follow proven wallets, keep sizing moderate, and return JSON only with thinking and trades.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nPick the best wallet to mirror and size trades up to 30% per position.`,
    };
  }
}
