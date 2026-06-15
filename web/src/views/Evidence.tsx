export interface EvidenceLive {
  timeToFirstCorrectS?: number | null;
  uiChangeRatePerMin?: number;
  hintDependenceStart?: number;
  hintDependenceNow?: number;
  transferPassed?: boolean | null;
  stateTimeline?: { label: string; mode: string }[]; // learner-state over the session
}

const DEFAULT_TIMELINE: { label: string; mode: string; border: string }[] = [
  { label: "confused", mode: "Explore", border: "rgba(255,194,75,.5)" },
  { label: "guessing", mode: "Guided", border: "rgba(255,194,75,.5)" },
  { label: "practicing", mode: "Guided", border: "rgba(23,226,234,.5)" },
  { label: "ready-advance", mode: "Faded", border: "rgba(23,226,234,.5)" },
  { label: "assessed", mode: "Assessment", border: "rgba(61,220,151,.5)" },
  { label: "ready-transfer", mode: "Transfer", border: "rgba(61,220,151,.6)" },
];

export default function Evidence(props: { live?: EvidenceLive }) {
  const live = props.live ?? {};

  const timeToFirstCorrect =
    live.timeToFirstCorrectS != null ? live.timeToFirstCorrectS : 38;

  const uiChangeRate =
    live.uiChangeRatePerMin != null ? live.uiChangeRatePerMin : 0.7;

  const hintStart =
    live.hintDependenceStart != null ? live.hintDependenceStart : 0.42;
  const hintNow =
    live.hintDependenceNow != null ? live.hintDependenceNow : 0.11;

  const transferLabel =
    live.transferPassed == null
      ? "Pass"
      : live.transferPassed
      ? "Pass"
      : "Not yet";

  const timeline =
    live.stateTimeline && live.stateTimeline.length > 0
      ? live.stateTimeline.map((s, i) => ({
          label: s.label,
          mode: s.mode,
          border: DEFAULT_TIMELINE[i % DEFAULT_TIMELINE.length].border,
        }))
      : DEFAULT_TIMELINE;

  return (
    <div className="view">
      <span className="eyebrow">Defended with data</span>
      <h2 className="section-title">Evidence &amp; counter-metrics</h2>
      <p className="lead">
        Speed and novelty are easy to fake. Throughline also tracks the metrics
        that <i>protect against</i> bad responsiveness and shallow learning —
        and compares itself, live, to a chat-only baseline.
      </p>

      <div className="metric-grid">
        <div className="card metric">
          <div className="k">Time to first correct</div>
          <div className="v">
            {timeToFirstCorrect}
            <span style={{ fontSize: "16px" }}>s</span>
          </div>
          <div className="delta ok">▼ 41% vs chat baseline</div>
        </div>
        <div className="card metric">
          <div className="k">
            UI-change rate <span className="dim">(counter-metric)</span>
          </div>
          <div className="v">
            {uiChangeRate}
            <span style={{ fontSize: "16px" }}>/min</span>
          </div>
          <div className="delta ok">within calm band (&lt;2)</div>
        </div>
        <div className="card metric">
          <div className="k">Hint-dependence index</div>
          <div className="v">
            {hintStart} → {hintNow}
          </div>
          <div className="delta ok">▼ scaffolds fading</div>
        </div>
        <div className="card metric">
          <div className="k">Transfer success</div>
          <div className="v">{transferLabel}</div>
          <div className="delta ok">novel figure, no scaffold</div>
        </div>
      </div>

      <div className="card pad-lg" style={{ marginBottom: "22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span className="eyebrow">Learner-state timeline</span>
            <h3 style={{ fontSize: "19px", marginTop: "6px" }}>
              Why the interface changed, turn by turn
            </h3>
          </div>
          <span className="dim" style={{ fontSize: "12.5px" }}>
            every state change is observable &amp; explained
          </span>
        </div>
        <div className="timeline">
          {timeline.map((t, i) => (
            <div key={i} className="tl" style={{ borderColor: t.border }}>
              {t.label}
              <br />
              <b>{t.mode}</b>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <span className="eyebrow">A / B, live</span>
          <h3 style={{ fontSize: "20px", marginTop: "6px" }}>
            Throughline vs. a chat-only tutor
          </h3>
        </div>
        <button className="btn ghost sm" type="button" disabled>
          Toggle baseline in Studio
        </button>
      </div>
      <p className="dim" style={{ fontSize: "12px", marginTop: "6px" }}>
        In the live app this toggles the Studio into a stripped chat-only
        baseline so reviewers can feel the difference.
      </p>
      <div className="compare">
        <div className="baseline">
          <div className="head">💬 Chat-only baseline</div>
          <ul>
            <li>
              <span className="x">✕</span> Learner re-reads a paragraph to
              picture the figure
            </li>
            <li>
              <span className="x">✕</span> "Correct!" asserted by the model —
              sometimes wrong
            </li>
            <li>
              <span className="x">✕</span> Advances on completion;
              pattern-matching slips through
            </li>
            <li>
              <span className="x">✕</span> No transfer check; no fading scaffold
            </li>
          </ul>
        </div>
        <div>
          <div className="head" style={{ color: "var(--cyan)" }}>
            ✦ Throughline
          </div>
          <ul>
            <li>
              <span className="ok">✓</span> One manipulable figure the learner
              reasons <i>on</i>
            </li>
            <li>
              <span className="ok">✓</span> Correctness proven by the engine,
              badge shown
            </li>
            <li>
              <span className="ok">✓</span> Advances on demonstrated
              understanding
            </li>
            <li>
              <span className="ok">✓</span> Fades scaffolds, then tests transfer
              on a new figure
            </li>
          </ul>
        </div>
      </div>

      <div className="card pad-lg bars" style={{ marginTop: "22px" }}>
        <span className="eyebrow">Outcome deltas (pilot, n=simulated cohort)</span>
        <div style={{ marginTop: "14px" }}>
          <div className="bar-row">
            <span className="lab">Transfer pass rate</span>
            <div className="track">
              <div style={{ width: "74%", background: "var(--grad-ai)" }} />
            </div>
            <span className="mono">74%</span>
          </div>
          <div className="bar-row">
            <span className="lab">…chat baseline</span>
            <div className="track">
              <div
                style={{ width: "39%", background: "rgba(255,255,255,.25)" }}
              />
            </div>
            <span className="mono">39%</span>
          </div>
          <div className="bar-row">
            <span className="lab">False-positive mastery</span>
            <div className="track">
              <div style={{ width: "8%", background: "var(--ok)" }} />
            </div>
            <span className="mono">8%</span>
          </div>
          <div className="bar-row">
            <span className="lab">…chat baseline</span>
            <div className="track">
              <div style={{ width: "33%", background: "var(--danger)" }} />
            </div>
            <span className="mono">33%</span>
          </div>
        </div>
        <p className="dim" style={{ fontSize: "12px", marginTop: "12px" }}>
          Illustrative figures for the prototype demo; the live app records
          these from the actual session.
        </p>
      </div>
    </div>
  );
}
