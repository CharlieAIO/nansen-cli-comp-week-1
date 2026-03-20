import { BaseAgent } from "./base";

export class ContrarianAgent extends BaseAgent {
  readonly id = "contrarian" as const;
  readonly name = "CONTRARIAN";
  readonly emoji = "🔮";
  readonly color = "#ff4d00";
  readonly maxAllocPct = 0.25;
  readonly dataSources = ["token-screener", "smart-money-netflow", "pnl-leaderboard"];

  readonly strategyPrompt = `You are CONTRARIAN, a divergence trader on Solana.
Your edge: find tokens where retail is FOMO-ing in while smart money is quietly accumulating elsewhere.
Use Token Screener to identify tokens with high retail volume but LOW smart money wallet counts (the crowded retail trade).
Use Smart Money Netflow with conservative labels (only "Fund" type smart money) to find tokens smart money likes but retail ignores.
Use PnL Leaderboard to confirm your target token has profitable traders - not just hype.
AVOID the top-volume retail tokens. BUY the smart money's quiet accumulation targets.
Size at 25% max. Only trade when divergence is clear: high retail elsewhere, smart money here.
Set min_smart_money_wallet_count LOW in screener to find smart money gems retail hasn't discovered yet.`;
}
