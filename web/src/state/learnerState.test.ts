import { describe, it, expect } from 'vitest';
import { computeSignals, estimate, decide, type Attempt } from './learnerState';

function mk(p: Partial<Attempt>): Attempt {
  return {
    itemId: 'x', mode: 'guided', answerDeg: 58, ruleChosen: 'alternate-interior',
    correctNumber: true, correctRule: true, hintsUsed: 0, latencyMs: 5000, ...p,
  };
}

describe('computeSignals', () => {
  it('tracks a no-hint streak', () => {
    const s = computeSignals([mk({}), mk({}), mk({})]);
    expect(s.noHintStreak).toBe(3);
  });
  it('breaks the streak on a hinted answer', () => {
    const s = computeSignals([mk({}), mk({ hintsUsed: 2 }), mk({})]);
    expect(s.noHintStreak).toBe(1);
  });
  it('measures pattern-matching (right number, wrong rule)', () => {
    const s = computeSignals([mk({ correctRule: false }), mk({ correctRule: false })]);
    expect(s.patternMatchRate).toBe(1);
  });
});

describe('estimate', () => {
  it('flags pattern-matching', () => {
    const e = estimate([mk({ correctRule: false }), mk({ correctRule: false })]);
    expect(e.label).toBe('pattern-matching');
  });
  it('flags guessing from fast wrong answers', () => {
    const e = estimate([mk({ correctNumber: false, latencyMs: 1200 }), mk({ correctNumber: false, latencyMs: 900 })]);
    expect(e.label).toBe('guessing');
  });
  it('reaches ready-advance after clean hint-free solves', () => {
    const e = estimate([mk({}), mk({}), mk({})]);
    expect(['ready-advance', 'ready-transfer']).toContain(e.label);
  });
  it('only declares mastery on a passed transfer item', () => {
    const e = estimate([mk({}), mk({}), mk({ isTransfer: true })]);
    expect(e.label).toBe('mastered');
  });
});

describe('decide (policy)', () => {
  it('debounces structural change to keep the layout stable', () => {
    const e = estimate([mk({}), mk({})]);
    const d = decide('guided', e, 'faded', 1000);
    expect(d.action).toBe('hold');
  });
  it('proposes (does not force) escalation into transfer', () => {
    const e = estimate([mk({}), mk({}), mk({})]);
    const d = decide('assessment', e, 'transfer', 99999);
    expect(d.action).toBe('propose-advance');
  });
  it('remediates a guessing learner without losing work', () => {
    const e = estimate([mk({ correctNumber: false, latencyMs: 1000 }), mk({ correctNumber: false, latencyMs: 800 })]);
    const d = decide('guided', e, 'guided', 99999);
    expect(d.action).toBe('remediate');
  });
});
