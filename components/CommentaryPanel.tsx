import type { CommentaryOutput } from "@/lib/types";

export function CommentaryPanel({ commentary }: { commentary?: CommentaryOutput }) {
  return (
    <section className="panel sidePanel commentaryPanel">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>Commentary</h3>
        <span className="pill accent">Latest</span>
      </div>
      <p className="commentaryText">{commentary?.round_commentary ?? "Waiting for commentary from the first completed round."}</p>
      <div className="commentaryMeta">
        <div>
          <span className="label">MVP</span>
          <strong>{commentary?.mvp_this_round ?? "-"}</strong>
        </div>
        <div>
          <span className="label">Prediction</span>
          <strong>{commentary?.prediction ?? "-"}</strong>
        </div>
      </div>
    </section>
  );
}
