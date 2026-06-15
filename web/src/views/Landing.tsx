/** The product point of view: why chat and static paths fall short, and what
 *  "hyperresponsive mastery" means here. */
import Diagram from '../components/Diagram';

export default function Landing({ onBegin, onRationale }: { onBegin: () => void; onRationale: () => void }) {
  return (
    <div className="view">
      <div className="hero">
        <span className="eyebrow">Nerdy · Hyperresponsive Mastery UI</span>
        <h1 style={{ marginTop: 14 }}>The interface <span className="grad-text">is the tutor</span>.</h1>
        <p className="sub">
          Throughline is a multimodal learning surface that reshapes itself the moment a learner shows what they
          understand — guiding them from confusion to <i>demonstrated, transferable</i> mastery of one tightly-scoped
          goal: <b>angle relationships</b>.
        </p>
        <div className="hero-cta">
          <button className="btn" onClick={onBegin}>Begin a session →</button>
          <button className="btn ghost" onClick={onRationale}>Read the design rationale</button>
        </div>
      </div>

      <div className="why-grid">
        <div className="card">
          <div className="icn x">✕</div>
          <h3>Why chat alone fails</h3>
          <p className="muted">You cannot drag a sentence. Geometry lives in a figure — a chat box flattens a spatial idea into a wall of text the learner re-parses every turn.</p>
        </div>
        <div className="card">
          <div className="icn x">✕</div>
          <h3>Why static paths fail</h3>
          <p className="muted">A fixed lesson with a progress bar advances on <i>completion</i>, not understanding — rewarding pattern-matchers and stranding the genuinely stuck.</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(23,226,234,.4)' }}>
          <div className="icn ok">✓</div>
          <h3>Why a responsive surface</h3>
          <p className="muted">One stable, manipulable diagram; guidance that fades as competence rises; a mastery signal that only fires on <b>transfer</b> — proven by a deterministic engine, not the AI.</p>
        </div>
      </div>

      <div className="teaser">
        <div className="card pad-lg">
          <span className="eyebrow">What you'll see</span>
          <h2 style={{ fontSize: 28, margin: '12px 0' }}>A complete arc, in ten minutes</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Explore → Guided practice → scaffolds fade → assessment with spoken justification → a <b>transfer</b> task on
            a brand-new figure → a defended “ready” signal — or an honest “not yet,” with remediation that preserves the
            learner's work.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="tag">🎙 Voice</span><span className="tag">📷 Camera</span><span className="tag">✋ Direct manipulation</span>
            <span className="tag" style={{ borderColor: 'rgba(23,226,234,.4)', color: 'var(--cyan)' }}>🔒 Deterministic correctness</span>
          </div>
        </div>
        <div className="card stage">
          <div className="stage-top"><span className="mode-badge"><span className="pulse" /> Live preview</span><span className="dim" style={{ fontSize: 12 }}>drag the pink handle →</span></div>
          <div className="diagram-wrap">
            <Diagram figure={{ type: 'parallel-transversal', inclination: 58, parallel: true }} scaffold interactive />
          </div>
        </div>
      </div>
    </div>
  );
}
