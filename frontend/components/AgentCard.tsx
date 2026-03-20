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
  const positions = portfolio.positions.slice(0, 3);
  const signals = result?.researchSignals?.slice(0, 3) ?? [];

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
            {result?.focusToken ? <p className="focusToken">{result.focusToken}</p> : null}
          </div>
        </div>
        <div className={`returnBadge ${agent.returnPct >= 0 ? "up" : "down"}`}>{agent.returnPct.toFixed(2)}%</div>
      </header>

      <div className="cardMetrics">
        <div>
          <span className="label">Portfolio</span>
          <strong>{portfolio.totalValueSol.toFixed(3)} SOL</strong>
        </div>
        <div>
          <span className="label">Cash</span>
          <strong>{portfolio.cashSol.toFixed(3)} SOL</strong>
        </div>
        <div>
          <span className="label">Positions</span>
          <strong>{portfolio.positions.length}</strong>
        </div>
      </div>

      <div className="decisionArea">
        <span className="label">Thinking</span>
        <p className="thinking">{result?.thinking ?? "—"}</p>
      </div>

      {result?.researchSummary ? (
        <div className="researchArea">
          <span className="label">Research</span>
          <p className="researchSummary">{result.researchSummary}</p>
          {signals.length > 0 && (
            <div className="signalGrid">
              {signals.map((signal) => (
                <div key={`${agent.id}-${signal.label}`} className={`signalCard ${signal.tone ?? "neutral"}`}>
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="positionsArea">
        <span className="label">Positions</span>
        <div className="positionList">
          {positions.length ? positions.map((position) => (
            <div key={position.tokenAddress} className="positionRow">
              <div>
                <strong>{position.tokenSymbol}</strong>
                <span>{position.tokenAmount.toFixed(4)}</span>
              </div>
              <div>
                <strong>${position.currentValueUsd.toFixed(0)}</strong>
                <span className={position.currentValueUsd >= position.entryValueUsd ? "up" : "down"}>
                  {position.entryValueUsd > 0
                    ? `${(((position.currentValueUsd - position.entryValueUsd) / position.entryValueUsd) * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>
          )) : <div className="positionRow muted"><span>No open positions</span></div>}
        </div>
      </div>

      <div className="tradesArea">
        <span className="label">Last trades</span>
        <div className="tradeList">
          {result?.trades.length ? result.trades.map((trade, index) => (
            <div key={`${trade.token_address}-${index}`} className="tradeRow">
              <span style={{ color: trade.action === "BUY" ? "var(--shadow)" : "var(--danger)" }}>{trade.action}</span>
              <span>{trade.token_symbol}</span>
              <span>{trade.amount_sol.toFixed(2)} SOL</span>
              <span className="muted">@ ${trade.executedPriceUsd.toFixed(4)}</span>
            </div>
          )) : <div className="tradeRow muted"><span>No trades this round</span></div>}
        </div>
      </div>
    </article>
  );
}
