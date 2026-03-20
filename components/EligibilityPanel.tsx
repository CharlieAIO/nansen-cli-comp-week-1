import type { NansenCall } from "@/lib/types";

export function EligibilityPanel({ callLog }: { callLog: NansenCall[] }) {
  const cliCalls = callLog.filter((call) => call.via === "cli").length;
  const eligibleApiCalls = callLog.filter((call) => call.via !== "mock" && call.endpoint !== "nansen schema").length;

  const items = [
    {
      label: "CLI installed and used",
      value: cliCalls > 0 ? `Yes (${cliCalls})` : "Not yet",
      done: cliCalls > 0,
    },
    {
      label: "Minimum 10 live calls",
      value: `${eligibleApiCalls}/10`,
      done: eligibleApiCalls >= 10,
    },
    {
      label: "Creative build",
      value: "Arena app",
      done: true,
    },
    {
      label: "Share on X",
      value: "Manual step",
      done: false,
    },
  ];

  return (
    <section className="panel sidePanel eligibilityPanel">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>NANSEN_CLI_CHECKLIST</h3>
        <span className="pill">WEEK_1</span>
      </div>
      <div className="eligibilityRows">
        {items.map((item) => (
          <div key={item.label} className="eligibilityRow">
            <span className={`eligibilityDot ${item.done ? "done" : "pending"}`}></span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </div>
          </div>
        ))}
      </div>
      <p className="eligibilityNote">To finish eligibility, post on X with `@nansen_ai` and `#NansenCLI`.</p>
    </section>
  );
}
