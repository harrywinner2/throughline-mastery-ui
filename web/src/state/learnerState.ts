/**
 * Learner-state estimator + adaptation policy.
 *
 * Deliberately transparent and rule-based rather than a black-box model: the
 * PRD demands the learner always understands WHY the interface changed, and
 * that we treat signals "cautiously". Every transition this module proposes
 * carries a human-readable reason, and the key structural escalations
 * (assessment, transfer) are PROPOSED, never forced — the learner consents.
 */
import type { Relationship } from '../engine/geometry';
import type { Mode } from '../engine/curriculum';

export type StateLabel =
  | 'confused'
  | 'guessing'
  | 'pattern-matching'
  | 'practicing'
  | 'hint-dependent'
  | 'ready-advance'
  | 'ready-transfer'
  | 'mastered';

export interface Attempt {
  itemId: string;
  mode: Mode;
  answerDeg: number;
  ruleChosen: Relationship | null;
  correctNumber: boolean;
  correctRule: boolean;
  hintsUsed: number;
  latencyMs: number;
  usedCamera?: boolean;
  justifiedAloud?: boolean;
  isTransfer?: boolean;
}

export interface Signals {
  attempts: number;
  hintDependence: number; // 0..1, EWMA of "needed a hint"
  noHintStreak: number; // consecutive correct answers with zero hints
  ruleAccuracy: number; // share of attempts with the correct relationship
  numberAccuracy: number;
  avgLatencyMs: number;
  fastWrongRate: number; // proxy for guessing
  patternMatchRate: number; // right number, wrong rule
}

export interface Estimate {
  label: StateLabel;
  confidence: number; // 0..1
  signals: Signals;
}

const FAST_MS = 2600; // below this, an answer is "snap" fast
const HINT_ALPHA = 0.45; // EWMA weight for hint-dependence

export function computeSignals(attempts: Attempt[]): Signals {
  const n = attempts.length;
  if (n === 0) {
    return {
      attempts: 0, hintDependence: 0, noHintStreak: 0, ruleAccuracy: 0,
      numberAccuracy: 0, avgLatencyMs: 0, fastWrongRate: 0, patternMatchRate: 0,
    };
  }
  let hintDep = 0;
  for (const a of attempts) {
    hintDep = HINT_ALPHA * (a.hintsUsed > 0 ? 1 : 0) + (1 - HINT_ALPHA) * hintDep;
  }
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (a.correctNumber && a.correctRule && a.hintsUsed === 0) streak++;
    else break;
  }
  const ruleAcc = attempts.filter((a) => a.correctRule).length / n;
  const numAcc = attempts.filter((a) => a.correctNumber).length / n;
  const avgLat = attempts.reduce((s, a) => s + a.latencyMs, 0) / n;
  const fastWrong = attempts.filter((a) => a.latencyMs < FAST_MS && !a.correctNumber).length / n;
  const patternMatch = attempts.filter((a) => a.correctNumber && !a.correctRule).length / n;

  return {
    attempts: n,
    hintDependence: round2(hintDep),
    noHintStreak: streak,
    ruleAccuracy: round2(ruleAcc),
    numberAccuracy: round2(numAcc),
    avgLatencyMs: Math.round(avgLat),
    fastWrongRate: round2(fastWrong),
    patternMatchRate: round2(patternMatch),
  };
}

export function estimate(attempts: Attempt[]): Estimate {
  const s = computeSignals(attempts);
  if (s.attempts === 0) {
    return { label: 'confused', confidence: 0.3, signals: s };
  }
  const recent = attempts.slice(-3);
  const lastTransferPass = attempts.some(
    (a) => a.isTransfer && a.correctNumber && a.correctRule && a.hintsUsed === 0,
  );

  let label: StateLabel = 'practicing';
  let confidence = 0.5;

  if (lastTransferPass && s.hintDependence < 0.3) {
    label = 'mastered';
    confidence = 0.9;
  } else if (s.patternMatchRate >= 0.5) {
    label = 'pattern-matching'; // right numbers, wrong reasons
    confidence = 0.7;
  } else if (s.fastWrongRate >= 0.5) {
    label = 'guessing';
    confidence = 0.7;
  } else if (s.hintDependence >= 0.55) {
    label = 'hint-dependent';
    confidence = 0.65;
  } else if (recent.length >= 2 && recent.slice(-2).every((a) => a.correctNumber && a.correctRule && a.hintsUsed === 0)) {
    label = s.numberAccuracy > 0.7 ? 'ready-advance' : 'practicing';
    confidence = 0.75;
    if (s.noHintStreak >= 3 && s.hintDependence < 0.3) label = 'ready-transfer';
  } else if (recent.every((a) => !a.correctNumber)) {
    label = 'confused';
    confidence = 0.6;
  }
  return { label, confidence, signals: s };
}

// ---- Adaptation policy --------------------------------------------------

export type PolicyAction = 'hold' | 'advance' | 'propose-advance' | 'remediate';

export interface PolicyDecision {
  action: PolicyAction;
  reason: string; // shown to the learner as the "why it changed" line
}

const STRUCTURAL_MIN_GAP_MS = 6000; // debounce: no structural change more often than this

/**
 * Decide what the surface should do next, given the current mode, the latest
 * estimate, and when the last structural change happened. Escalations into
 * assessment/transfer are PROPOSED so the learner keeps agency.
 */
export function decide(
  currentMode: Mode,
  est: Estimate,
  nextMode: Mode | null,
  msSinceLastStructuralChange: number,
): PolicyDecision {
  const { label, signals } = est;

  // Stability guard: never restructure mid-thought / too frequently.
  if (msSinceLastStructuralChange < STRUCTURAL_MIN_GAP_MS) {
    return { action: 'hold', reason: 'Holding the layout steady — guidance updates, structure stays put so you don\'t have to reorient.' };
  }

  if (label === 'guessing' || label === 'confused') {
    return {
      action: 'remediate',
      reason: label === 'guessing'
        ? 'Fast wrong answers look like guessing — bringing back a smaller hint and keeping your work in place.'
        : 'This one\'s not landing yet — simplifying the workspace and offering a gentler hint, without losing your progress.',
    };
  }
  if (label === 'pattern-matching') {
    return {
      action: 'hold',
      reason: 'Right numbers but the wrong reason — staying here and asking you to name the relationship, not just the value.',
    };
  }
  if (label === 'hint-dependent') {
    return {
      action: 'hold',
      reason: 'You\'re leaning on hints — holding this level so the next win is genuinely yours.',
    };
  }

  const escalating = nextMode === 'assessment' || nextMode === 'transfer';
  if ((label === 'ready-advance' || label === 'ready-transfer') && nextMode) {
    if (escalating) {
      return {
        action: 'propose-advance',
        reason: nextMode === 'transfer'
          ? 'You\'ve shown this without scaffolds — ready to try it on a brand-new kind of figure?'
          : 'Strong, unscaffolded streak — ready to be assessed? You decide when.',
      };
    }
    return {
      action: 'advance',
      reason: signals.noHintStreak >= 2
        ? 'Two clean, hint-free solves — fading the scaffolds so you do the reasoning.'
        : 'You\'ve got this rule — moving on while keeping the diagram stable.',
    };
  }

  return { action: 'hold', reason: 'Keep practicing — the surface stays calm until you\'ve clearly shown the idea.' };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
