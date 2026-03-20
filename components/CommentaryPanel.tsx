import type { CommentaryOutput } from "@/lib/types";

export function CommentaryPanel({ commentary }: { commentary?: CommentaryOutput }) {
  return (
    <section className="panel sidePanel commentaryPanel">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>JUDGE_REPORT</h3>
        <span className="pill accent">MISSION_CONTROL</span>
      </div>
      <p className="commentaryText">{commentary?.round_commentary ?? "AWAITING ROUND_END_SUMMARY..."}</p>
      <div className="commentaryMeta">
        <div>
          <span className="label">TACTICAL_MVP</span>
          <strong>{commentary?.mvp_this_round ?? "N/A"}</strong>
        </div>
        <div>
          <span className="label">STRATEGIC_PREDICTION</span>
          <strong>{commentary?.prediction ?? "CALCULATING..."}</strong>
        </div>
      </div>
    </section>
  );
}
