import { useEffect, useState } from 'react';
import Landing from './views/Landing';
import Studio from './views/Studio';
import Evidence, { type EvidenceLive } from './views/Evidence';
import Rationale from './views/Rationale';
import { useSession } from './state/useSession';
import { getHealth } from './lib/api';

type View = 'landing' | 'learn' | 'evidence' | 'rationale';
const NAV: { id: View; label: string }[] = [
  { id: 'landing', label: 'Overview' },
  { id: 'learn', label: 'The Studio' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'rationale', label: 'Rationale' },
];

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [aiEnabled, setAiEnabled] = useState(false);
  // One session, owned here, so the Studio drives it and Evidence reads it live.
  const session = useSession(aiEnabled);

  useEffect(() => { getHealth().then((h) => setAiEnabled(!!h.aiEnabled)); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [view]);

  const v = session.view;
  const live: EvidenceLive = {
    timeToFirstCorrectS: v.firstCorrectS,
    uiChangeRatePerMin: v.uiChangeRatePerMin,
    hintDependenceStart: v.hintDependenceStart,
    hintDependenceNow: v.hintDependenceNow,
    transferPassed: v.transferPassed,
    stateTimeline: v.timeline.length ? v.timeline.map((t) => ({ label: t.label, mode: t.mode })) : undefined,
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand"><span className="dot" />throughline</div>
          <div className="nav-links">
            {NAV.map((n) => (
              <div key={n.id} className={`nav-link ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>{n.label}</div>
            ))}
          </div>
          <span className="verified-chip"><span className="tick">✓</span> verified by the geometry engine</span>
        </div>
      </nav>

      <div className="wrap">
        {view === 'landing' && <Landing onBegin={() => setView('learn')} onRationale={() => setView('rationale')} />}
        {view === 'learn' && <Studio session={session} />}
        {view === 'evidence' && <Evidence live={live} />}
        {view === 'rationale' && <Rationale />}
        <div className="foot">Throughline · a Nerdy Gauntlet prototype · the interface is the tutor{aiEnabled ? '' : ' · AI: mock mode'}</div>
      </div>
    </>
  );
}
