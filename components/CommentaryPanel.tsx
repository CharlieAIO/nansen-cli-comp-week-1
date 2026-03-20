import type { CommentaryOutput } from "@/lib/types";

export function CommentaryPanel({ commentary }: { commentary?: CommentaryOutput }) {
  return (
    <section className="panel sidePanel commentaryPanel">
      <div className="sectionHead">
        <h3>Commentator</h3>
        <span className="pill accent">Judge</span>
      </div>
      <p>{commentary?.round_commentary ?? "Waiting for the first round wrap-up."}</p>
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
