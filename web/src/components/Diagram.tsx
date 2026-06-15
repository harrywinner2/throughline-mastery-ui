/**
 * The stable hero: a manipulable angle diagram. The figure stays put while the
 * surrounding guidance changes — the PRD's "keep a key visual stable" rule.
 *
 * Numeric labels always come from the deterministic engine (angleMeasures), so
 * what the learner reads is exact. Dragging (explore mode) updates the figure's
 * inclination live; graded items are drawn at a fixed inclination.
 */
import { useRef, useState, useEffect } from 'react';
import { angleMeasures, ANGLE_LABELS, type AngleId, type Figure } from '../engine/geometry';

interface Props {
  figure: Figure;
  scaffold: boolean;
  givenAngle?: AngleId;
  askAngle?: AngleId;
  interactive?: boolean;
  onInclinationChange?: (deg: number) => void;
}

const W = 560, H = 360, cx = W / 2, cy = H / 2;
const yTop = 108, yBot = 252, x0 = 56, x1 = 504;

type V = { x: number; y: number };
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const norm = (a: V): V => { const m = Math.hypot(a.x, a.y) || 1; return { x: a.x / m, y: a.y / m }; };

function wedge(P: V, r: number, u: V, v: V): string {
  const p1 = { x: P.x + r * u.x, y: P.y + r * u.y };
  const p2 = { x: P.x + r * v.x, y: P.y + r * v.y };
  const cross = u.x * v.y - u.y * v.x;
  const sweep = cross > 0 ? 1 : 0;
  return `M ${P.x.toFixed(1)} ${P.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`;
}

export default function Diagram({ figure, scaffold, givenAngle, askAngle, interactive, onInclinationChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [incl, setIncl] = useState(figure.inclination);
  useEffect(() => setIncl(figure.inclination), [figure.inclination, figure.type]);

  if (figure.type === 'triangle-transversal') {
    return <Triangle figure={figure} />;
  }

  const m = angleMeasures({ ...figure, inclination: incl });
  const tilt = figure.parallel ? 0 : 16; // visually splay the non-parallel "trap"

  const intersect = (Y: number) => cx + (Y - cy) / Math.tan((incl * Math.PI) / 180);
  // line n endpoints (tilted for the trap so it's visibly non-parallel)
  const nA: V = { x: x0, y: yBot - tilt }, nB: V = { x: x1, y: yBot + tilt };
  const ix1: V = { x: intersect(yTop), y: yTop };
  // intersection of transversal with (possibly tilted) line n
  const tTop: V = { x: intersect(36), y: 36 }, tBot: V = { x: intersect(324), y: 324 };
  const ix2 = segLineIntersect(tTop, tBot, nA, nB) ?? { x: intersect(yBot), y: yBot };

  const Tdown = norm(sub(tBot, tTop));      // transversal pointing down
  const Tup = { x: -Tdown.x, y: -Tdown.y };
  const Lpos: V = { x: 1, y: 0 }, Lneg: V = { x: -1, y: 0 };
  const Ndir = norm(sub(nB, nA)), Nneg = { x: -Ndir.x, y: -Ndir.y };

  // ray pairs per angle id
  const rays: Record<AngleId, [V, V, V]> = {
    1: [ix1, Lneg, Tup], 2: [ix1, Lpos, Tup], 3: [ix1, Lneg, Tdown], 4: [ix1, Lpos, Tdown],
    5: [ix2, Nneg, Tup], 6: [ix2, Ndir, Tup], 7: [ix2, Nneg, Tdown], 8: [ix2, Ndir, Tdown],
  };
  // label anchor per angle id (a touch out along the bisector)
  const labelPos = (id: AngleId): V => {
    const [P, u, v] = rays[id];
    const b = norm({ x: u.x + v.x, y: u.y + v.y });
    return { x: P.x + b.x * 34, y: P.y + b.y * 34 + 5 };
  };

  function onDown(e: React.PointerEvent) {
    if (!interactive) return;
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const svg = svgRef.current!; const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      // The transversal pivots through the centre, so the inclination is simply
      // the angle of (pointer − centre). Using loc.y - cy (NOT cy - loc.y) makes
      // the handle track the pointer instead of mirroring it.
      let v = (Math.atan2(loc.y - cy, loc.x - cx) * 180) / Math.PI;
      if (v < 0) v += 180;
      v = Math.max(28, Math.min(152, v));
      setIncl(v); onInclinationChange?.(v);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  const ids: AngleId[] = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', touchAction: 'none' }}>
      {/* lines */}
      <line className="par-line" x1={x0} y1={yTop} x2={x1} y2={yTop} />
      <line className="par-line" x1={nA.x} y1={nA.y} x2={nB.x} y2={nB.y} />
      <text x={x1 + 6} y={yTop + 5} fill="#8b8fb5" fontSize={14}>m</text>
      <text x={x1 + 6} y={nB.y + 5} fill="#8b8fb5" fontSize={14}>n</text>
      {/* transversal */}
      <line className="transversal" x1={tTop.x} y1={tTop.y} x2={tBot.x} y2={tBot.y} />

      {/* given / ask wedges */}
      {givenAngle && <path className="arc-given" d={wedge(rays[givenAngle][0], 30, rays[givenAngle][1], rays[givenAngle][2])} />}
      {askAngle && <path className="arc-ask" d={wedge(rays[askAngle][0], 30, rays[askAngle][1], rays[askAngle][2])} />}

      {/* Every angle is named with a LETTER (a–h); the measure is appended when
          it's known (scaffold on, or it's the given angle). The asked angle reads
          "f = ?" until the scaffold reveals it. */}
      {ids.map((id) => {
        const isGiven = id === givenAngle, isAsk = id === askAngle;
        const showDeg = scaffold || isGiven;
        const p = labelPos(id);
        const letter = ANGLE_LABELS[id];
        let label = letter;
        if (isAsk && !scaffold) label = `${letter} = ?`;
        else if (showDeg) label = `${letter} = ${Math.round(m[id])}°`;
        const color = isGiven ? '#bff6df' : isAsk ? '#ffd2da' : 'rgba(255,255,255,.55)';
        return (
          <text key={id} x={p.x} y={p.y} fill={color} fontSize={isGiven || isAsk ? 15 : 12} textAnchor="middle" fontWeight={700}>
            {label}
          </text>
        );
      })}

      {/* drag handle */}
      {interactive && <circle className="handle" cx={tTop.x} cy={tTop.y} r={9} onPointerDown={onDown} />}
      {!figure.parallel && (
        <text x={cx} y={H - 12} fill="#FF5C7A" fontSize={13} textAnchor="middle" fontWeight={700}>
          lines are NOT parallel
        </text>
      )}
    </svg>
  );
}

/** The transfer figure: a clean triangle (chain a relationship with the 180° sum). */
function Triangle({ figure }: { figure: Figure }) {
  const A: V = { x: 90, y: 280 }, B: V = { x: 470, y: 280 }, C: V = { x: 250, y: 70 };
  const m = angleMeasures(figure);
  const base = Math.round(m[3]);            // one base angle via alternate-interior
  const second = Math.round(figure.secondAngle ?? 70);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line className="par-line" x1={20} y1={60} x2={540} y2={60} />
      <text x={28} y={50} fill="#8b8fb5" fontSize={12}>a line through the apex, parallel to the base</text>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="rgba(77,157,255,.10)" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
      <line className="transversal" x1={A.x} y1={A.y} x2={C.x} y2={C.y} />
      <line className="transversal" x1={B.x} y1={B.y} x2={C.x} y2={C.y} />
      <text x={A.x + 26} y={A.y - 10} fill="#bff6df" fontSize={16} fontWeight={700}>{base}°</text>
      <text x={B.x - 34} y={B.y - 10} fill="#fff" fontSize={16} fontWeight={700}>{second}°</text>
      <text x={C.x - 4} y={C.y + 30} fill="#ffd2da" fontSize={18} fontWeight={700} textAnchor="middle">?</text>
    </svg>
  );
}

/** Intersection of segment p1->p2 with line through q1->q2 (or null if parallel). */
function segLineIntersect(p1: V, p2: V, q1: V, q2: V): V | null {
  const r = sub(p2, p1), s = sub(q2, q1);
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((q1.x - p1.x) * s.y - (q1.y - p1.y) * s.x) / denom;
  return { x: p1.x + t * r.x, y: p1.y + t * r.y };
}
