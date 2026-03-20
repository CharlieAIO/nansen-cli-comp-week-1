import type { CommentaryOutput } from "@/lib/types";

export function CommentaryPanel({ commentary }: { commentary?: CommentaryOutput }) {
  return (
    <section className="panel sidePanel commentaryPanel">
      <div className="sectionHead">
        <h3>Market Commentary</h3>
        <span className="pill accent">Round Insight</span>
      </div>
      <p className="commentaryText">{commentary?.round_commentary ?? "Awaiting initial round analysis..."}</p>
      {commentary?.tension_narrative && <p className="commentarySubtext">{commentary.tension_narrative}</p>}
      
      <div className="commentaryMeta">
        <div>
          <span className="label">Performance MVP</span>
          <strong style={{ display: "block", color: "var(--accent)", fontSize: "1.1rem" }}>{commentary?.mvp_this_round ?? "-"}</strong>
        </div>
        <div>
          <span className="label">Trend Forecast</span>
          <strong style={{ display: "block", color: "var(--accent)", fontSize: "1.1rem" }}>{commentary?.prediction ?? "-"}</strong>
        </div>
      </div>

      {commentary?.most_interesting_trade && (
        <div className="commentaryCallout">
          <span className="label">Notable Execution</span>
          <p>{commentary.most_interesting_trade}</p>
        </div>
      )}
    </section>
  );
}

