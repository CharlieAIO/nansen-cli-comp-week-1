import type { AgentPromptArgs, AgentRunContext } from "@/lib/types";

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

  buildPrompt(args: AgentPromptArgs) {
    return {
      system:
        "You are SHADOW, a copy-trading AI. Follow proven wallets, keep sizing moderate, and return JSON only with thinking and trades.",
      user: `${this.promptIntro(args)}\n\nMARKET DATA\n${JSON.stringify(args.marketData, null, 2)}\n\nPick the best wallet to mirror and size trades up to 30% per position.`,
    };
  }
}
