/**
 * The Studio — the whole learning arc on one adaptive surface. The diagram is
 * the stable hero; the mode badge, guidance rail, and hint ladder adapt around
 * it based on what the learner demonstrates.
 */
import { useEffect, useRef, useState } from 'react';
import Diagram from '../components/Diagram';
import type { SessionApi } from '../state/useSession';
import { angleLabel, humanRelationship, type Item, type Relationship } from '../engine/geometry';
import { speak, readHandwriting } from '../lib/api';

export default function Studio({ session }: { session: SessionApi }) {
  const s = session;
  const v = s.view;
  const aiEnabled = v.aiEnabled;
  const item = v.stage.item;

  const [answer, setAnswer] = useState('');
  const [rule, setRule] = useState<Relationship | null>(null);
  const [justText, setJustText] = useState('');
  const [dock, setDock] = useState<'manip' | 'voice' | 'camera'>('manip');
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camOpen, setCamOpen] = useState(false);

  // reset inputs when the item changes
  useEffect(() => { setAnswer(''); setRule(null); setJustText(''); setVoiceMsg(null); setCamOpen(false); }, [v.stageIndex]);

  // speak hints aloud (spoken-feedback output mode); harmless if TTS is off
  useEffect(() => {
    if (v.hint && aiEnabled) { speak(v.hint.text).then((b) => b && new Audio(URL.createObjectURL(b)).play().catch(() => {})); }
  }, [v.hint, aiEnabled]);

  const isExplore = v.mode === 'explore';
  const isTrap = item?.figure.type === 'non-parallel-trap';
  const isAssess = v.mode === 'assessment' || v.mode === 'transfer';
  const showRel = item && !isAssess; // hide the relationship name during assessment

  function onCheck() {
    if (!item) return;
    s.submitAnswer(parseFloat(answer), rule);
  }

  async function startVoice() {
    setDock('voice');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
        rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setJustText(t); s.justify(t); };
        rec.onerror = () => setVoiceMsg('Mic unavailable — type your reasoning below instead.');
        rec.start();
        setVoiceMsg('Listening… say why the angles relate the way they do.');
        return;
      } catch { /* fall through */ }
    }
    setVoiceMsg('Voice needs a microphone — type your reasoning below instead.');
  }

  async function openCamera() {
    setDock('camera'); setCamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch {
      setVoiceMsg('Camera needs permission — the preserved-work demo runs once you allow it.');
    }
  }

  async function snap() {
    const vid = videoRef.current;
    let dataUrl = '';
    if (vid && vid.videoWidth) {
      const c = document.createElement('canvas'); c.width = vid.videoWidth; c.height = vid.videoHeight;
      c.getContext('2d')!.drawImage(vid, 0, 0); dataUrl = c.toDataURL('image/jpeg', 0.8);
      (vid.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    }
    const truth = item ? Math.round(item.given.value) : null; // mock fallback uses given
    const res = await readHandwriting({ imageDataUrl: dataUrl, expectedAngleDeg: truth });
    if (res.parsedAngleDeg != null) setAnswer(String(res.parsedAngleDeg));
    s.recordPreservedWork(`${res.transcript}  →  engine re-checks this number independently`);
    setCamOpen(false);
  }

  const est = v.estimate;
  const stateColor = est.label === 'mastered' ? 'var(--ok)' : est.label.startsWith('ready') ? 'var(--cyan)'
    : est.label === 'guessing' || est.label === 'confused' || est.label === 'pattern-matching' ? 'var(--danger)' : 'var(--warn)';

  return (
    <div className="view">
      <div className="studio">
        {/* ---------- stage ---------- */}
        <div className="card stage">
          <div className="stage-top">
            <span className="mode-badge"><span className="pulse" />{v.mode}</span>
            <span className="verified-chip"><span className="tick">✓</span> answer checked by engine{v.aiEnabled ? '' : ' · AI in mock mode'}</span>
          </div>
          <div className="why-line">↳ <b>{v.whyText}</b></div>
          <div className="diagram-wrap">
            {item ? (
              <Diagram figure={item.figure} scaffold={v.scaffold} givenAngle={item.given.angle} askAngle={item.ask} />
            ) : (
              <Diagram figure={{ type: 'parallel-transversal', inclination: 58, parallel: true }} scaffold interactive />
            )}
          </div>
          <div className="stage-controls">
            <div className="dock">
              <button className={dock === 'manip' ? 'live' : ''} onClick={() => setDock('manip')}>✋ <span>Manipulate</span></button>
              <button className={dock === 'voice' ? 'live' : ''} disabled={!isAssess} onClick={startVoice}>🎙 <span>Justify aloud</span></button>
              <button className={dock === 'camera' ? 'live' : ''} disabled={isExplore} onClick={openCamera}>📷 <span>Snap my work</span></button>
            </div>
            <span className="dim" style={{ marginLeft: 'auto', fontSize: 12.5 }}>
              Live readouts: {v.scaffold ? 'ON (scaffold)' : 'OFF — your reasoning'}
            </span>
          </div>
          {camOpen && (
            <div style={{ padding: 16, borderTop: '1px solid var(--line-soft)' }}>
              <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: 220 }} />
              <button className="btn sm" style={{ marginTop: 10 }} onClick={snap}>Capture &amp; verify</button>
            </div>
          )}
        </div>

        {/* ---------- rail ---------- */}
        <div className="rail">
          <div className="card task">
            {isExplore ? (
              <>
                <span className="eyebrow">Explore</span>
                <div className="q">Get a feel for it first.</div>
                <p className="muted" style={{ fontSize: 13.5 }}>{v.stage.blurb} Drag the pink handle and notice which angles move together and which stay opposite.</p>
                <button className="btn" style={{ marginTop: 16 }} onClick={s.nextItem}>I'm ready to practice →</button>
              </>
            ) : item ? (
              <>
                <span className="eyebrow">{v.mode} · item {v.stageIndex} / {v.totalStages - 1}</span>
                <div className="q">{questionText(item, isTrap)}</div>
                {showRel && (
                  <p className="muted" style={{ fontSize: 13.5 }}>
                    ∠{angleLabel(item.given.angle)} and ∠{angleLabel(item.ask)} are <span style={{ color: 'var(--cyan)' }}>{humanRelationship(item.relationship)}</span> angles.
                  </p>
                )}
                {!isTrap && (
                  <div className="answer-row">
                    <input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" placeholder="degrees…"
                      onKeyDown={(e) => e.key === 'Enter' && onCheck()} />
                    <button className="btn sm" onClick={onCheck} disabled={!answer}>Check</button>
                  </div>
                )}
                {isTrap && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button className="btn sm" onClick={s.declineRule}>The rule doesn't apply</button>
                    <input className="" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="…or a number"
                      style={{ flex: 1, minWidth: 110, background: 'rgba(0,0,0,.28)', border: '1px solid var(--line)', borderRadius: 12, color: '#fff', padding: '10px 12px' }} />
                    <button className="btn ghost sm" onClick={onCheck} disabled={!answer}>Check number</button>
                  </div>
                )}

                <div className="rule-chips">
                  {item.ruleChoices.map((r) => (
                    <div key={r} className={`rule-chip ${rule === r ? 'sel' : ''}`} onClick={() => setRule(r)}>{humanRelationship(r)}</div>
                  ))}
                </div>

                {isAssess && (
                  <div style={{ marginTop: 14 }}>
                    <div className="answer-row">
                      <input value={justText} onChange={(e) => setJustText(e.target.value)} placeholder="explain WHY (or use 🎙 Justify aloud)…" />
                      <button className="btn ghost sm" onClick={() => justText && s.justify(justText)} disabled={!justText}>Submit reason</button>
                    </div>
                    {voiceMsg && <p className="dim" style={{ fontSize: 12.5, marginTop: 8 }}>{voiceMsg}</p>}
                  </div>
                )}

                {v.hint && (
                  <div className="hint">
                    <div className="lbl">💡 Hint · level {v.hint.level} {v.hint.source === 'ai' ? '· spoken' : '· offline'}</div>
                    {v.hint.text}
                  </div>
                )}
                {v.feedback && <div className={`feedback ${v.feedback.kind === 'good' ? 'good' : 'bad'}`}>{v.feedback.text}</div>}
                {v.preservedWork && (
                  <div className="camera-prev">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>📷 Captured work · transcribed by vision, <b style={{ color: 'var(--cyan)' }}>re-verified by the engine</b></div>
                    <div className="mono" style={{ fontSize: 14 }}>{v.preservedWork}</div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <button className="btn ghost sm" onClick={s.requestHint} disabled={!v.stage.hintsAllowed}>
                    {v.stage.hintsAllowed ? 'Ask for a hint' : 'No hints (assessment)'}
                  </button>
                  <button className="btn ghost sm" onClick={s.nextItem}>Skip →</button>
                </div>
              </>
            ) : null}
          </div>

          {/* mastery */}
          <div className="card mastery">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow">Mastery signal</span>
              <span className="tag" style={{ borderColor: stateColor, color: stateColor, textTransform: 'capitalize' }}>{est.label}</span>
            </div>
            <div className="meter"><div style={{ width: `${v.progress}%` }} /></div>
            <p className="dim" style={{ fontSize: 12.5 }}>Granted only on a <b>transfer</b> item, with low hint-dependence and the correct <i>rule</i> — never on a single number.</p>
            <div className="signals">
              <div className="s"><span className="muted">Hint-dependence</span><span className="mono">{est.signals.hintDependence.toFixed(2)}</span></div>
              <div className="s"><span className="muted">No-hint streak</span><span className="mono">{est.signals.noHintStreak}</span></div>
              <div className="s"><span className="muted">Rule accuracy</span><span className="mono">{Math.round(est.signals.ruleAccuracy * 100)}%</span></div>
              <div className="s"><span className="muted">Transfer</span><span className="mono">{v.transferPassed == null ? 'pending' : v.transferPassed ? 'pass' : 'retry'}</span></div>
            </div>

            {v.proposal && (
              <div className="propose">
                <div style={{ fontSize: 14 }}><b>{v.proposal.reason}</b></div>
                <div className="row">
                  <button className="btn sm" onClick={s.acceptProposal}>Yes, let's go</button>
                  <button className="btn ghost sm" onClick={s.declineProposal}>Not yet</button>
                </div>
              </div>
            )}
            {v.masteryGranted && (
              <div className="propose" style={{ borderColor: 'var(--ok)', background: 'rgba(61,220,151,.1)' }}>
                <div style={{ fontSize: 15 }}>🎉 <b>Mastery demonstrated.</b> You applied the rule on a new figure, named it correctly, and barely used a hint. That's transferable understanding — not pattern-matching.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function questionText(item: Item, isTrap: boolean): string {
  const g = angleLabel(item.given.angle), a = angleLabel(item.ask), val = Math.round(item.given.value);
  if (item.requiresChaining) return 'Find the missing apex angle (?). One base angle comes from an alternate-interior relationship with the parallel line; a triangle\'s angles sum to 180°.';
  if (isTrap) return `These lines are NOT parallel. If ∠${g} = ${val}°, what is ∠${a}?`;
  return `Lines m ∥ n. If ∠${g} = ${val}°, what is ∠${a}?`;
}
