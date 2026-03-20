import type { AgentPortfolio, AgentRoundResult, AgentSummary } from "@/lib/types";

export function AgentCard({
  agent,
  portfolio,
  result,
  isActive,
}: {
  agent: AgentSummary;
  portfolio: AgentPortfolio;
  result?: AgentRoundResult;
  isActive: boolean;
}) {
  return (
    <article className={`panel agentCard ${isActive ? "active" : ""}`} style={{ borderColor: agent.color }}>
      <header>
        <div>
          <span className="pill">Rank #{agent.rank}</span>
          <h2>
            {agent.emoji} {agent.name}
          </h2>
        </div>
        <div className={`returnBadge ${agent.returnPct >= 0 ? "up" : "down"}`}>{agent.returnPct.toFixed(2)}%</div>
      </header>
      <div className="cardMetrics">
        <div>
          <span className="label">Portfolio</span>
          <strong>{portfolio.totalValueSol.toFixed(2)} SOL</strong>
        </div>
        <div>
          <span className="label">Cash</span>
          <strong>{portfolio.cashSol.toFixed(2)} SOL</strong>
        </div>
      </div>
      <div>
        <span className="label">Last decision</span>
        <p className="thinking">{result?.thinking ?? "No round yet."}</p>
      </div>
      <div>
        <span className="label">Positions</span>
        <div className="tokenList">
          {portfolio.positions.length ? portfolio.positions.map((position) => (
            <span key={position.tokenAddress} className="tokenChip">
              {position.tokenSymbol} {position.currentValueUsd.toFixed(0)} USD
            </span>
          )) : <span className="tokenChip muted">Flat</span>}
        </div>
      </div>
      <div>
        <span className="label">Executed this round</span>
        <div className="tradeList">
          {result?.trades.length ? result.trades.map((trade, index) => (
            <div key={`${trade.token_address}-${index}`} className="tradeRow">
              <strong>{trade.action}</strong>
              <span>{trade.token_symbol}</span>
              <span>{trade.amount_sol.toFixed(2)} SOL</span>
            </div>
          )) : <div className="tradeRow muted"><span>Hold</span></div>}
        </div>
      </div>
    </article>
  );
}
