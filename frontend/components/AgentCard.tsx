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
  const solPrice = portfolio.totalValueSol > 0 ? portfolio.totalValueUsd / portfolio.totalValueSol : 0;

  return (
    <article 
      className={`panel agentCard ${isActive ? "active" : ""}`} 
      style={{ 
        borderTop: `2px solid ${agent.color}`,
        borderColor: isActive ? agent.color : undefined,
        boxShadow: isActive ? `0 4px 24px -12px ${agent.color}44` : undefined
      }}
    >
      <header>
        <div className="agentHeaderInfo">
          <div className="avatarWrap" style={{ borderColor: `${agent.color}44` }}>
            <Image
              src={`/avatars/${agent.id}.png`}
              alt={agent.name}
              width={64}
              height={64}
              className="agentAvatar"
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="pill" style={{ color: agent.color, borderColor: `${agent.color}22`, background: `${agent.color}08` }}>
                Rank #{agent.rank}
              </span>
              {result?.focusToken && <span className="pill">{result.focusToken}</span>}
            </div>
            <h2>{agent.name}</h2>
          </div>
        </div>

        <div className="agentValue">
          <span className="portfolioSOL">{portfolio.totalValueSol.toFixed(2)} SOL</span>
          <div className={`returnBadge ${agent.returnPct >= 0 ? "up" : "down"}`}>
            {agent.returnPct >= 0 ? "+" : ""}{agent.returnPct.toFixed(2)}%
          </div>
          <span className="cashLine">{portfolio.cashSol.toFixed(2)} SOL available</span>
        </div>
      </header>

      <div className="decisionArea">
        <span className="label">Strategic Insight</span>
        <p className="thinking">{result?.thinking ?? "Waiting for the first completed live research pass."}</p>
      </div>

      {result?.researchSummary && (
        <div className="researchArea">
          <span className="label">Market Research</span>
          <p className="researchSummary">{result.researchSummary}</p>
          {signals.length > 0 && (
            <div className="signalGrid">
              {signals.map((signal) => (
                <div key={`${agent.id}-${signal.label}`} className="signalCard">
                  <span className="label" style={{ marginBottom: '8px', opacity: 0.6, fontSize: '9px' }}>{signal.label}</span>
                  <div className="signalValue" style={{ width: '100%', overflowWrap: 'anywhere' }}>
                    {signal.value.includes(';') ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {signal.value.split(';').map((item, idx) => {
                          const trimmed = item.trim();
                          if (!trimmed) return null;
                          
                          // Try to split into key: value for better alignment
                          const colonIndex = trimmed.indexOf(':');
                          if (colonIndex !== -1) {
                            const key = trimmed.substring(0, colonIndex).trim();
                            const val = trimmed.substring(colonIndex + 1).trim();
                            return (
                              <li key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '11px', 
                                fontFamily: 'var(--font-mono)',
                                borderLeft: '2px solid var(--border-bright)',
                                padding: '2px 0 2px 8px',
                                gap: '8px'
                              }}>
                                <span style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{key}</span>
                                <strong style={{ 
                                  color: val.toLowerCase().includes('positive') ? 'var(--shadow)' : 
                                         val.toLowerCase().includes('negative') ? 'var(--danger)' : 'var(--text)',
                                  textAlign: 'right'
                                }}>{val}</strong>
                              </li>
                            );
                          }
                          
                          return (
                            <li key={idx} style={{ 
                              fontSize: '11px', 
                              fontFamily: 'var(--font-mono)',
                              borderLeft: '2px solid var(--border-bright)',
                              padding: '2px 0 2px 8px',
                            }}>
                              {trimmed}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <strong style={{ 
                        fontSize: '16px', 
                        fontFamily: 'var(--font-mono)',
                        color: signal.tone === 'positive' ? 'var(--shadow)' : 
                               signal.tone === 'negative' ? 'var(--danger)' : 'var(--text)',
                        display: 'block',
                        wordBreak: 'break-all'
                      }}>
                        {signal.value}
                      </strong>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="positionsArea">
        <span className="label">Open Positions</span>
        <div className="positionList">
          {positions.length ? positions.map((position) => (
            <div key={position.tokenAddress} className="positionRow">
              <div className="positionMain">
                <strong>{position.tokenSymbol}</strong>
                <span>{((position.currentValueUsd / (solPrice || 1)) || 0).toFixed(2)} SOL</span>
              </div>
              <div className="positionValue">
                <strong>${position.currentValueUsd.toFixed(2)}</strong>
                <span className={position.currentValueUsd >= position.entryValueUsd ? "up" : "down"}>
                  {position.entryValueUsd > 0
                    ? `${(((position.currentValueUsd - position.entryValueUsd) / position.entryValueUsd) * 100).toFixed(2)}%`
                    : "—"}
                </span>
              </div>
            </div>
          )) : <div className="positionRow" style={{ justifyContent: "center", opacity: 0.5 }}><span style={{ fontSize: "11px" }}>No active positions</span></div>}
        </div>
      </div>

      <div className="tradesArea">
        <span className="label">Execution Log</span>
        <div className="positionList">
          {result?.trades.length ? result.trades.map((trade, index) => (
            <div key={`${trade.token_address}-${index}`} className="positionRow">
              <div className="positionMain">
                <span style={{ 
                  fontSize: "9px", 
                  fontWeight: 800, 
                  color: trade.action === "BUY" ? "var(--shadow)" : "var(--danger)",
                  border: `1px solid ${trade.action === "BUY" ? "var(--shadow)44" : "var(--danger)44"}`,
                  padding: "1px 4px",
                  background: trade.action === "BUY" ? "var(--shadow)11" : "var(--danger)11"
                }}>
                  {trade.action}
                </span>
                <strong>{trade.token_symbol}</strong>
              </div>
              <div className="positionValue">
                <strong>{trade.amount_sol.toFixed(2)} SOL</strong>
                <span className="muted">${trade.usdValue.toFixed(2)} @ ${trade.executedPriceUsd.toFixed(2)}</span>
              </div>
            </div>
          )) : <div className="positionRow" style={{ justifyContent: "center", opacity: 0.5 }}><span style={{ fontSize: "11px" }}>No recent executions</span></div>}
        </div>
      </div>
    </article>
  );
}
