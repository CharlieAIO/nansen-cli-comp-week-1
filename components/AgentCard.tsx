import type { AgentPortfolio, AgentRoundResult, AgentSummary } from "@/lib/types";
import Image from "next/image";

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
    <article className={`panel agentCard ${isActive ? "active" : ""}`} style={{ borderColor: isActive ? agent.color : undefined }}>
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: agent.color }}></div>
        <div className="corner-br" style={{ background: agent.color }}></div>
      </div>

      <header>
        <div className="agentHeaderInfo">
          <div className="avatarWrap" style={{ borderColor: agent.color }}>
            <Image 
              src={`/avatars/${agent.id}.png`} 
              alt={agent.name} 
              width={64} 
              height={64} 
              className="agentAvatar"
            />
          </div>
          <div>
            <span className="pill" style={{ color: agent.color, borderColor: `${agent.color}44` }}>Rank #{agent.rank}</span>
            <h2>{agent.name}</h2>
          </div>
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

      <div className="decisionArea">
        <span className="label">Last thesis</span>
        <p className="thinking">{result?.thinking ?? "Waiting for the first round."}</p>
      </div>

      <div className="positionsArea">
        <span className="label">Positions</span>
        <div className="tokenList">
          {portfolio.positions.length ? portfolio.positions.map((position) => (
            <span key={position.tokenAddress} className="tokenChip">
              {position.tokenSymbol} {position.currentValueUsd.toFixed(0)} USD
            </span>
          )) : <span className="tokenChip muted">No open positions</span>}
        </div>
      </div>

      <div className="tradesArea">
        <span className="label">Latest trades</span>
        <div className="tradeList">
          {result?.trades.length ? result.trades.map((trade, index) => (
            <div key={`${trade.token_address}-${index}`} className="tradeRow">
              <strong style={{ color: trade.action === "BUY" ? "var(--shadow)" : "var(--danger)" }}>{trade.action}</strong>
              <span>{trade.token_symbol}</span>
              <span>{trade.amount_sol.toFixed(2)} SOL</span>
            </div>
          )) : <div className="tradeRow muted"><span>No trades this round</span></div>}
        </div>
      </div>
    </article>
  );
}
