import { describe, it, expect } from 'vitest';
import {
  angleMeasures, relationshipBetween, relationshipHolds, solve, check,
  type Figure, type Item, type Relationship,
} from './geometry';

const parallel = (inclination: number): Figure => ({ type: 'parallel-transversal', inclination, parallel: true });

describe('angleMeasures', () => {
  it('produces internally consistent angles for any inclination', () => {
    for (let a = 15; a <= 165; a += 7) {
      const m = angleMeasures(parallel(a));
      // vertical angles equal
      expect(m[1]).toBeCloseTo(m[4]);
      expect(m[2]).toBeCloseTo(m[3]);
      // linear pairs supplementary
      expect(m[1] + m[2]).toBeCloseTo(180);
      expect(m[3] + m[4]).toBeCloseTo(180);
    }
  });

  it('makes corresponding & alternate angles equal only when parallel', () => {
    const m = angleMeasures(parallel(58));
    expect(m[1]).toBeCloseTo(m[5]); // corresponding
    expect(m[3]).toBeCloseTo(m[6]); // alternate interior
    const trap = angleMeasures({ type: 'non-parallel-trap', inclination: 58, parallel: false });
    expect(Math.abs(trap[3] - trap[6])).toBeGreaterThan(1); // NOT equal when non-parallel
  });

  it('makes co-interior angles supplementary when parallel', () => {
    const m = angleMeasures(parallel(63));
    expect(m[3] + m[5]).toBeCloseTo(180);
    expect(m[4] + m[6]).toBeCloseTo(180);
  });
});

describe('relationshipBetween', () => {
  it('classifies the classical pairs', () => {
    expect(relationshipBetween(1, 5)).toBe('corresponding');
    expect(relationshipBetween(3, 6)).toBe('alternate-interior');
    expect(relationshipBetween(1, 8)).toBe('alternate-exterior');
    expect(relationshipBetween(3, 5)).toBe('co-interior');
    expect(relationshipBetween(1, 4)).toBe('vertical');
    expect(relationshipBetween(1, 2)).toBe('linear-pair');
  });
  it('is symmetric', () => {
    expect(relationshipHolds('alternate-interior', 6, 3)).toBe(true);
  });
});

function item(rel: Relationship, inclination = 58): Item {
  const m = angleMeasures(parallel(inclination));
  const pairs: Record<string, [number, number]> = {
    corresponding: [1, 5], 'alternate-interior': [3, 6], 'co-interior': [3, 5], vertical: [1, 4],
  };
  const [g, a] = pairs[rel] ?? [3, 6];
  return {
    id: 't', figure: parallel(inclination),
    given: { angle: g as any, value: m[g as 1] }, ask: a as any,
    relationship: rel, requiresChaining: false, ruleChoices: [rel],
  };
}

describe('solve & check', () => {
  it('solves equal relationships', () => {
    const it1 = item('alternate-interior', 58);
    expect(solve(it1)).toBeCloseTo(it1.given.value);
  });
  it('solves supplementary relationships', () => {
    const it1 = item('co-interior', 63);
    expect(solve(it1)).toBeCloseTo(180 - it1.given.value);
  });
  it('accepts a right number with the right rule', () => {
    const it1 = item('alternate-interior');
    const r = check(it1, it1.given.value, 'alternate-interior');
    expect(r.correctNumber).toBe(true);
    expect(r.correctRule).toBe(true);
  });
  it('rejects a right number with the WRONG rule (anti pattern-matching)', () => {
    const it1 = item('alternate-interior');
    const r = check(it1, it1.given.value, 'corresponding');
    expect(r.correctNumber).toBe(true);
    expect(r.correctRule).toBe(false);
  });
  it('treats a non-parallel trap as "rule does not apply"', () => {
    const trap: Item = {
      id: 'trap', figure: { type: 'non-parallel-trap', inclination: 60, parallel: false },
      given: { angle: 3, value: 60 }, ask: 6, relationship: 'alternate-interior',
      requiresChaining: false, ruleChoices: ['alternate-interior'],
    };
    const r = check(trap, NaN, null);
    expect(r.groundTruthDeg).toBeNull();
    expect(r.ruleApplies).toBe(false);
    expect(r.correctRule).toBe(true); // correctly declined to apply the rule
  });
});
