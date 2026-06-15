/**
 * The session orchestrator. Holds the curriculum, runs every learner action
 * through the deterministic engine FIRST, then updates the learner-state
 * estimate and asks the policy what the surface should do next. The AI is only
 * consulted for hints/justification and never decides correctness.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { buildCurriculum, type Mode, type Stage } from '../engine/curriculum';
import { check, type Relationship } from '../engine/geometry';
import {
  computeSignals, estimate, decide, type Attempt, type Estimate, type PolicyDecision,
} from './learnerState';
import { tutorHint, gradeJustification } from '../lib/api';

export interface Feedback { kind: 'good' | 'bad' | 'info'; text: string }

export interface SessionView {
  stage: Stage;
  stageIndex: number;
  totalStages: number;
  mode: Mode;
  scaffold: boolean;
  whyText: string;
  feedback: Feedback | null;
  hint: { text: string; level: number; source: 'ai' | 'mock' } | null;
  estimate: Estimate;
  proposal: PolicyDecision | null;
  masteryGranted: boolean;
  progress: number; // 0..100
  timeline: { label: string; mode: Mode }[];
  uiChangeRatePerMin: number;
  hintDependenceStart: number;
  hintDependenceNow: number;
  firstCorrectS: number | null;
  transferPassed: boolean | null;
  preservedWork: string | null;
  aiEnabled: boolean;
}

export function useSession(aiEnabled: boolean) {
  const curriculum = useMemo(() => buildCurriculum(), []);
  const [stageIndex, setStageIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hint, setHint] = useState<SessionView['hint']>(null);
  const [whyText, setWhyText] = useState('Full scaffolding to start: live readouts and a hint ladder. The diagram stays put as the guidance adapts.');
  const [proposal, setProposal] = useState<PolicyDecision | null>(null);
  const [remediating, setRemediating] = useState(false);
  const [preservedWork, setPreservedWork] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<{ label: string; mode: Mode }[]>([]);
  const [uiChangeCount, setUiChangeCount] = useState(0);

  const hintsThisItem = useRef(0);
  const itemShownAt = useRef<number>(Date.now());
  const lastStructuralChange = useRef<number>(Date.now());
  const sessionStart = useRef<number>(Date.now());
  const firstCorrectAt = useRef<number | null>(null);
  const hintDepStart = useRef<number | null>(null);

  const stage = curriculum[stageIndex];
  const est = estimate(attempts);
  const masteryGranted = est.label === 'mastered';
  const transferPassed = attempts.some((a) => a.isTransfer)
    ? attempts.some((a) => a.isTransfer && a.correctNumber && a.correctRule)
    : null;

  const advanceStage = useCallback((reason: string) => {
    setStageIndex((i) => {
      const next = Math.min(i + 1, curriculum.length - 1);
      const nextStage = curriculum[next];
      setTimeline((t) => [...t, { label: estimate(attempts).label, mode: nextStage.mode }]);
      return next;
    });
    setUiChangeCount((c) => c + 1);
    lastStructuralChange.current = Date.now();
    itemShownAt.current = Date.now();
    hintsThisItem.current = 0;
    setRemediating(false);
    setHint(null);
    setFeedback(null);
    setProposal(null);
    setWhyText(reason);
    setPreservedWork(null);
  }, [attempts, curriculum]);

  const runPolicy = useCallback((nextEst: Estimate) => {
    const nextStage = curriculum[stageIndex + 1] ?? null;
    const dt = Date.now() - lastStructuralChange.current;
    const d = decide(stage.mode, nextEst, nextStage?.mode ?? null, dt);
    if (d.action === 'advance') {
      advanceStage(d.reason);
    } else if (d.action === 'propose-advance') {
      setProposal(d);
      setWhyText(d.reason);
    } else if (d.action === 'remediate') {
      setRemediating(true);
      setWhyText(d.reason);
      setUiChangeCount((c) => c + 1);
      lastStructuralChange.current = Date.now();
    } else {
      setWhyText(d.reason);
    }
  }, [advanceStage, curriculum, stage.mode, stageIndex]);

  /** Submit a numeric answer + chosen rule. Engine decides; estimator follows. */
  const submitAnswer = useCallback(async (answerDeg: number, ruleChosen: Relationship | null) => {
    if (!stage.item) return;
    const result = check(stage.item, answerDeg, ruleChosen);
    const attempt: Attempt = {
      itemId: stage.item.id, mode: stage.mode, answerDeg, ruleChosen,
      correctNumber: result.correctNumber, correctRule: result.correctRule,
      hintsUsed: hintsThisItem.current, latencyMs: Date.now() - itemShownAt.current,
      isTransfer: stage.mode === 'transfer',
    };
    const next = [...attempts, attempt];
    setAttempts(next);
    if (hintDepStart.current === null) hintDepStart.current = computeSignals(next).hintDependence;
    if (result.correctNumber && result.correctRule && firstCorrectAt.current === null) {
      firstCorrectAt.current = Date.now();
    }

    if (result.correctNumber && result.correctRule) {
      setFeedback({ kind: 'good', text: engineConfirm(result.groundTruthDeg, stage.mode) });
    } else if (result.correctNumber && !result.correctRule) {
      setFeedback({ kind: 'bad', text: 'The number is right, but the relationship you named isn\'t. A right answer with the wrong reason isn\'t mastery — which rule connects these two angles?' });
    } else {
      setFeedback({ kind: 'bad', text: 'Not yet. Watch how the two highlighted angles relate through the transversal, then try again.' });
    }
    runPolicy(estimate(next));
  }, [attempts, runPolicy, stage]);

  /** The trap answer: correctly declining to apply the rule. */
  const declineRule = useCallback(() => {
    if (!stage.item) return;
    const result = check(stage.item, NaN, null);
    const attempt: Attempt = {
      itemId: stage.item.id, mode: stage.mode, answerDeg: NaN, ruleChosen: null,
      correctNumber: result.correctNumber, correctRule: result.correctRule,
      hintsUsed: hintsThisItem.current, latencyMs: Date.now() - itemShownAt.current,
      isTransfer: true,
    };
    const next = [...attempts, attempt];
    setAttempts(next);
    setFeedback(
      result.correctRule
        ? { kind: 'good', text: 'Exactly — the lines aren\'t parallel, so the rule doesn\'t apply. Spotting where a rule breaks is real understanding.' }
        : { kind: 'bad', text: 'Look again: are the two lines actually parallel? If not, the equal-angle rule can\'t be used.' },
    );
    runPolicy(estimate(next));
  }, [attempts, runPolicy, stage]);

  /** Ask for the next hint up the ladder (engine-grounded, AI-phrased). */
  const requestHint = useCallback(async () => {
    if (!stage.item || !stage.hintsAllowed) return;
    hintsThisItem.current += 1;
    const level = hintsThisItem.current - 1;
    const truth = check(stage.item, NaN, null).groundTruthDeg;
    const res = await tutorHint({
      itemId: stage.item.id, relationship: stage.item.relationship, hintLevel: level,
      groundTruthDeg: truth, givenValue: stage.item.given.value, learnerState: est.label,
    });
    setHint({ text: res.hintText, level: level + 1, source: res.source });
  }, [est.label, stage]);

  /** Grade a justification. Can only WITHHOLD a mastery signal, never grant. */
  const justify = useCallback(async (transcript: string): Promise<boolean> => {
    if (!stage.item) return false;
    const res = await gradeJustification({ transcript, expectedRelationship: stage.item.relationship });
    setFeedback(
      res.invokesCorrectRule
        ? { kind: 'good', text: `“${transcript}” — reasoning recognized. That counts for more than the number alone.` }
        : { kind: 'info', text: `Heard: “${transcript}”. Try naming the actual relationship (e.g. “alternate interior, so equal”).` },
    );
    return res.invokesCorrectRule;
  }, [stage]);

  const acceptProposal = useCallback(() => advanceStage('You chose to move on — new challenge, scaffolds removed.'), [advanceStage]);
  const declineProposal = useCallback(() => { setProposal(null); setWhyText('Staying here — you set the pace. Move on whenever you\'re ready.'); }, []);
  const nextItem = useCallback(() => advanceStage(curriculum[Math.min(stageIndex + 1, curriculum.length - 1)].blurb), [advanceStage, curriculum, stageIndex]);
  const recordPreservedWork = useCallback((text: string) => setPreservedWork(text), []);

  const signals = computeSignals(attempts);
  const elapsedMin = Math.max((Date.now() - sessionStart.current) / 60000, 0.1);

  const view: SessionView = {
    stage, stageIndex, totalStages: curriculum.length,
    mode: remediating ? 'remediation' : stage.mode,
    scaffold: remediating ? true : stage.scaffold,
    whyText, feedback, hint, estimate: est, proposal, masteryGranted,
    progress: masteryGranted ? 100 : Math.round((stageIndex / (curriculum.length - 1)) * 92),
    timeline,
    uiChangeRatePerMin: Math.round((uiChangeCount / elapsedMin) * 10) / 10,
    hintDependenceStart: hintDepStart.current ?? 0,
    hintDependenceNow: signals.hintDependence,
    firstCorrectS: firstCorrectAt.current ? Math.round((firstCorrectAt.current - sessionStart.current) / 1000) : null,
    transferPassed,
    preservedWork,
    aiEnabled,
  };

  return {
    view, signals,
    submitAnswer, declineRule, requestHint, justify,
    acceptProposal, declineProposal, nextItem, recordPreservedWork,
  };
}

export type SessionApi = ReturnType<typeof useSession>;

function engineConfirm(truth: number | null, mode: Mode): string {
  const base = truth != null ? `✓ ${truth}° — and the right relationship. Engine-verified.` : '✓ Correct, and engine-verified.';
  if (mode === 'guided') return base + ' One or two more clean solves and the scaffolds start to fade.';
  if (mode === 'faded') return base + ' No readouts needed — that was your reasoning.';
  if (mode === 'transfer') return base + ' On a brand-new figure, with nothing holding your hand. That\'s mastery.';
  return base;
}
