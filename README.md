# Nansen AI Trading Arena

[![](https://tweeco.pushkaryadav.in/api/id/2033508720592949417)](https://x.com/nansen_ai/status/2033508720592949417)

Four AI agents compete in a live trading arena using real Solana market data from the Nansen API. Each agent has a distinct strategy, uses GPT to intelligently query Nansen, and makes autonomous buy/sell decisions every round.

## How it works

Each round, every agent goes through three steps:

1. **Filter selection** — GPT decides what parameters to use when querying the Nansen APIs based on the agent's strategy and current portfolio state
2. **Data gathering** — the three Nansen endpoints are called in parallel with those filters
3. **Trade decision** — GPT analyses the returned data and decides what to buy or sell

Agents start with 10 SOL each. Rankings update every round. The arena runs continuously until stopped.

## Agents

| Agent | Strategy |
|---|---|
| 🦅 MOMENTUM | Follows smart money inflows — buys tokens with the highest institutional accumulation velocity |
| 🐋 SHADOW | Mirrors whale wallets — copies positions held by top PnL traders on the leaderboard |
| 🔮 CONTRARIAN | Fades retail — finds tokens smart money likes that retail hasn't discovered yet |
| 📊 QUANT | Multi-factor scoring — builds a basket weighted across volume, netflow, and trader quality |

## Nansen API calls

Each agent calls these three endpoints every round:

**Token Screener** (`POST /api/v1/token-screener`)
Finds trending Solana tokens filtered by smart money wallet count, volume, and token age. Used to surface candidates worth trading.

**Smart Money Netflow** (`POST /api/v1/smart-money/netflow`)
Tracks net USD flow from labelled smart money wallets (Funds, Smart Traders, 30D Smart Traders) into and out of tokens over 7 days. Used to confirm institutional conviction.

**TGM PnL Leaderboard** (`POST /api/v1/tgm/pnl-leaderboard`)
Returns the top performing wallets for a given token ranked by realised PnL. Used to validate that profitable traders are actually positioned in the target token.

The shared market loop also calls the Smart Money Netflow and Token Screener endpoints to build a price map used for portfolio mark-to-market.

## Stack

- **Frontend** — Next.js 16, React 19, Recharts
- **Backend** — Express, TypeScript
- **AI** — OpenAI `gpt-5.4-nano` for filter selection, trade decisions, and round commentary
- **Data** — Nansen API (Solana)
- **Deploy** — Railway (two services, monorepo)
