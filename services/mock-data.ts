const TOKENS = [
  { symbol: "JUP", address: "JUP111111111111111111111111111111111111111", price: 1.18 },
  { symbol: "BONK", address: "BONK1111111111111111111111111111111111111", price: 0.000031 },
  { symbol: "PYTH", address: "PYTH1111111111111111111111111111111111111", price: 0.63 },
  { symbol: "WIF", address: "WIF11111111111111111111111111111111111111", price: 2.76 },
  { symbol: "JTO", address: "JTO11111111111111111111111111111111111111", price: 3.25 },
  { symbol: "DRIFT", address: "DRIFT11111111111111111111111111111111111", price: 0.81 },
  { symbol: "CLOUD", address: "CLOUD11111111111111111111111111111111111", price: 0.42 },
  { symbol: "MEW", address: "MEW11111111111111111111111111111111111111", price: 0.0072 },
];

let tick = 0;

function vary(base: number, spread: number, offset: number) {
  const wave = Math.sin((tick + offset) / 2.4);
  return Number((base * (1 + wave * spread)).toFixed(6));
}

export function nextTick() {
  tick += 1;
  return tick;
}

export function getMockSchema() {
  return {
    version: "mock-schema-v1",
    endpoints: [
      "smart-money/netflow",
      "token-screener",
      "tgm/flows",
      "tgm/dex-trades",
      "tgm/pnl-leaderboard",
      "profiler/address/transactions",
      "tgm/flow-intelligence",
      "tgm/quant-scores",
    ],
  };
}

export function getMockNetflows() {
  return TOKENS.map((token, index) => ({
    token_symbol: token.symbol,
    token_address: token.address,
    price_usd: vary(token.price, 0.08, index),
    net_flow_24h_usd: Math.round(vary(1500000 - index * 135000, 0.35, index + 2)),
    market_cap_usd: Math.round(vary(380000000 - index * 22000000, 0.12, index + 3)),
    smart_money_wallet_count: 40 - index * 3,
  }));
}

export function getMockScreener() {
  return [
    { token_symbol: "SOL", token_address: "SOL", price_usd: vary(142, 0.03, 1), volume_24h_usd: 2100000000 },
    ...TOKENS.map((token, index) => ({
      token_symbol: token.symbol,
      token_address: token.address,
      price_usd: vary(token.price, 0.09, index + 4),
      volume_24h_usd: Math.round(vary(9500000 - index * 850000, 0.42, index + 5)),
      holder_count: 18000 - index * 1200,
      retail_score: 85 - index * 7,
      quant_score: 92 - index * 5,
    })),
  ];
}

export function getMockFlows(tokenAddress: string) {
  return {
    token_address: tokenAddress,
    timeframe: "1d",
    hourly: Array.from({ length: 6 }, (_, idx) => ({
      hour: `${idx * 4}h`,
      net_usd: Math.round(vary(120000 + idx * 15000, 0.4, idx + 7)),
    })),
  };
}

export function getMockDexTrades(tokenAddress: string) {
  return Array.from({ length: 8 }, (_, idx) => ({
    token_address: tokenAddress,
    side: idx % 3 === 0 ? "SELL" : "BUY",
    volume_usd: Math.round(vary(42000 + idx * 4500, 0.32, idx + 10)),
    wallet_label: idx % 2 === 0 ? "Smart Trader" : "Fund",
  }));
}

export function getMockPnlLeaderboard(tokenAddress: string) {
  return Array.from({ length: 5 }, (_, idx) => ({
    token_address: tokenAddress,
    address: `wallet-${idx + 1}`,
    realized_pnl_usd: Math.round(vary(220000 - idx * 40000, 0.28, idx + 12)),
    win_rate: Number((0.79 - idx * 0.05).toFixed(2)),
  }));
}

export function getMockTransactions(addresses: string[]) {
  return addresses.flatMap((address, idx) =>
    TOKENS.slice(0, 3).map((token, tokenIndex) => ({
      address,
      token_symbol: token.symbol,
      token_address: token.address,
      side: (idx + tokenIndex) % 2 === 0 ? "BUY" : "SELL",
      value_usd: Math.round(vary(15000 + tokenIndex * 3500, 0.28, idx + tokenIndex + 14)),
    })),
  );
}

export function getMockPnlSummary(address: string) {
  return {
    address,
    realized_pnl_usd: Math.round(vary(680000, 0.18, 18)),
    win_rate: 0.71,
    average_hold_days: 9,
  };
}

export function getMockBalances(address: string) {
  return TOKENS.slice(0, 4).map((token, idx) => ({
    address,
    token_symbol: token.symbol,
    token_address: token.address,
    value_usd: Math.round(vary(88000 - idx * 12000, 0.22, idx + 20)),
  }));
}

export function getMockWhoBoughtSold(tokenAddress: string, buyOrSell: "BUY" | "SELL") {
  return Array.from({ length: 6 }, (_, idx) => ({
    token_address: tokenAddress,
    wallet_type: idx < 2 ? "Fund" : idx < 4 ? "Smart Money" : "Retail",
    side: buyOrSell,
    count: 14 - idx,
  }));
}

export function getMockFlowIntelligence(tokenAddress: string) {
  return {
    token_address: tokenAddress,
    smart_money_pct: Number(vary(0.54, 0.18, 24)),
    whales_pct: Number(vary(0.21, 0.14, 25)),
    retail_pct: Number(vary(0.25, 0.22, 26)),
  };
}

export function getMockTopScores() {
  return TOKENS.slice(0, 6).map((token, idx) => ({
    token_symbol: token.symbol,
    token_address: token.address,
    nansen_score: 95 - idx * 4,
  }));
}

export function getMockQuantScores(tokenAddress: string) {
  return {
    token_address: tokenAddress,
    momentum_score: Number(vary(0.76, 0.16, 27)),
    liquidity_score: Number(vary(0.68, 0.15, 28)),
    wallet_quality_score: Number(vary(0.72, 0.18, 29)),
  };
}

export function getMockOhlcv(tokenAddress: string) {
  const base = TOKENS.find((token) => token.address === tokenAddress)?.price ?? 1;
  return Array.from({ length: 12 }, (_, idx) => ({
    close: vary(base, 0.12, idx + 30),
    high: vary(base * 1.08, 0.1, idx + 31),
    low: vary(base * 0.92, 0.1, idx + 32),
    volume_usd: Math.round(vary(1200000, 0.35, idx + 33)),
  }));
}

export function getMockHolders(tokenAddress: string) {
  return Array.from({ length: 8 }, (_, idx) => ({
    token_address: tokenAddress,
    wallet: `holder-${idx + 1}`,
    share_pct: Number((0.18 - idx * 0.015).toFixed(3)),
  }));
}
