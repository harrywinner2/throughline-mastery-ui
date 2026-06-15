export default function Rationale() {
  return (
    <div className="view">
      <span className="eyebrow">The defended submission</span>
      <h2 className="section-title">Design rationale</h2>
      <p className="lead">
        Every choice the brief asks us to defend — mastery, adaptation,
        modality, correctness — in one place.
      </p>

      <div className="r-grid" style={{ marginTop: "24px" }}>
        <div
          className="card r-card span2"
          style={{ borderColor: "rgba(23,226,234,.4)" }}
        >
          <h3>
            <span className="ico">🔒</span> Content correctness — proven outside
            the LLM
          </h3>
          <p className="muted" style={{ marginTop: "8px" }}>
            We chose <b>geometry angle relationships</b> precisely because the
            answer is <b>computable from coordinates</b>. A deterministic engine
            generates every figure, so it already knows each angle exactly. The
            model only <i>coaches</i>; it never decides right or wrong. Two
            independent implementations — TypeScript (in-app) and Python (proof
            service) — are property-tested to agree across thousands of random
            figures. Vision OCR of handwriting is re-verified by the engine, so
            a misread can't fake a “Correct!”.{" "}
            <b>This is the centerpiece of the architecture.</b>
          </p>
        </div>

        <div className="card r-card">
          <h3>
            <span className="ico">🎯</span> Mastery model
          </h3>
          <ul>
            <li>
              Mastery = apply the rule on a <b>novel</b> figure, scaffolds
              removed
            </li>
            <li>
              Requires the correct <i>relationship</i>, not just the number
            </li>
            <li>Gated on a no-hint streak + low hint-dependence</li>
            <li>
              Includes a non-parallel <b>trap</b>: knowing when the rule does{" "}
              <i>not</i> apply
            </li>
          </ul>
        </div>
        <div className="card r-card">
          <h3>
            <span className="ico">🛡️</span> Against false-positive mastery
          </h3>
          <ul>
            <li>Rotated figures &amp; varied unknowns defeat pattern-matching</li>
            <li>Free-response + rule selection defeats lucky guessing</li>
            <li>Readouts fade — at assessment the UI stops doing the reasoning</li>
            <li>Latency + justification defeat click-through</li>
          </ul>
        </div>

        <div className="card r-card">
          <h3>
            <span className="ico">⚖️</span> Responsiveness vs. stability
          </h3>
          <ul>
            <li>
              Guidance updates instantly; <b>structure</b> changes are debounced
              &amp; announced
            </li>
            <li>
              Mode escalation needs policy confidence <b>and</b> a
              learner-visible cue
            </li>
            <li>Counter-metric caps UI-change frequency (calm band &lt; 2/min)</li>
          </ul>
        </div>
        <div className="card r-card">
          <h3>
            <span className="ico">🚫</span> What the UI refuses to auto-change
          </h3>
          <ul>
            <li>The key diagram never rearranges mid-thought</li>
            <li>It never deletes the learner's own work</li>
            <li>It never jumps to assessment without consent</li>
          </ul>
        </div>

        <div className="card r-card">
          <h3>
            <span className="ico">🎛️</span> Modality &amp; sensor rationale
          </h3>
          <ul>
            <li>
              <b>Manipulation</b>: geometry is spatial — drag, don't describe
            </li>
            <li>
              <b>Voice</b>: speaking a justification reveals reasoning a click
              can't
            </li>
            <li>
              <b>Camera</b>: preserve real handwritten work, then verify it
            </li>
            <li>Each signal earns its place; none is decorative</li>
          </ul>
        </div>
        <div className="card r-card">
          <h3>
            <span className="ico">🗑️</span> What we rejected (on purpose)
          </h3>
          <ul>
            <li>
              <b>Facial-affect / attention detection</b> — gimmick, false
              confidence, ethics
            </li>
            <li>
              <b>Multi-device fusion</b> — couldn't beat single-device for this
              goal
            </li>
            <li>
              <b>LangChain</b> — no gain over constrained, verified OpenAI calls
            </li>
            <li>
              <b>Realtime voice</b> — robustness over flash for a live demo
            </li>
          </ul>
        </div>

        <div className="card r-card span2">
          <h3>
            <span className="ico">📋</span> Limitations memo
          </h3>
          <p className="muted" style={{ marginTop: "8px" }}>
            One goal, one figure family — depth over breadth, by design. Cohort
            outcome numbers on the Evidence tab are illustrative until a real
            pilot. Justification grading is model-assisted but <b>bounded</b>: it
            can only withhold a mastery signal, never grant one. Voice/camera
            require browser permissions and degrade to typed input. Research
            notes, decision log, and the full evaluation method ship in{" "}
            <span className="kbd">/docs</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
