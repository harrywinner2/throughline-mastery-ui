/**
 * Throughline — deterministic geometry engine.
 *
 * This module is the SOLE authority on what is correct. It contains no AI and
 * no randomness in its checking path: every angle is exact arithmetic derived
 * from a figure's parameters. The language model that coaches the learner is
 * given this engine's ground truth and is never permitted to contradict it.
 *
 * It is intentionally framework-free (no DOM, no Node APIs) so the identical
 * logic runs in the browser, on the server, and in the test suite. An
 * independent Python re-implementation (../../proof-engine) is property-tested
 * to agree with it — correctness here is over-determined, not asserted.
 *
 * Geometry model: two lines cut by a transversal. Eight angles, labelled 1..8.
 *
 *        1 \ 2            (top intersection, line m)
 *        3 \ 4
 *           \
 *        5 \ 6            (bottom intersection, line n)
 *        7 \ 8
 *
 * With the transversal at acute inclination `a` to the lines, the measures are
 * top:    {1:180-a, 2:a, 3:a, 4:180-a}
 * bottom: {5:180-a, 6:a, 7:a, 8:180-a}   (bottom mirrors top WHEN m ∥ n)
 *
 * This single assignment satisfies every classical relationship simultaneously
 * (vertical equal, linear pairs supplementary, corresponding/alternate equal,
 * co-interior supplementary), which is exactly why we can prove correctness.
 */

export type AngleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Relationship =
  | 'corresponding'
  | 'alternate-interior'
  | 'alternate-exterior'
  | 'co-interior'
  | 'vertical'
  | 'linear-pair';

export type FigureType =
  | 'parallel-transversal'
  | 'triangle-transversal'
  | 'non-parallel-trap';

export interface Figure {
  type: FigureType;
  /** Acute inclination of the transversal to the (first) line, in degrees. */
  inclination: number;
  /** Whether the two cut lines are parallel. The trap figure sets this false. */
  parallel: boolean;
  /** For triangle-transversal: the second known interior angle of the triangle. */
  secondAngle?: number;
}

export interface Item {
  id: string;
  figure: Figure;
  /** The angle the learner is told. */
  given: { angle: AngleId; value: number };
  /** The angle the learner must find. */
  ask: AngleId;
  /** The relationship that connects given→ask (the rule the learner should name). */
  relationship: Relationship;
  /** Whether solving requires chaining two rules (transfer difficulty). */
  requiresChaining: boolean;
  /** Plausible wrong rules, for the rule-selection UI. */
  ruleChoices: Relationship[];
}

export interface CheckResult {
  groundTruthDeg: number | null; // null = the rule does not apply (trap)
  correctNumber: boolean;
  correctRule: boolean;
  /** True only when the rule genuinely connects the two angles in this figure. */
  ruleApplies: boolean;
  expectedRelationship: Relationship | 'none';
  explanation: string;
}

const EQUAL = 'equal' as const;
const SUPPLEMENTARY = 'supplementary' as const;
type RelKind = typeof EQUAL | typeof SUPPLEMENTARY;

/** The classical angle-pair table. Each relationship lists its angle pairs. */
const RELATIONSHIP_PAIRS: Record<Relationship, { pairs: [AngleId, AngleId][]; kind: RelKind }> = {
  corresponding: { pairs: [[1, 5], [2, 6], [3, 7], [4, 8]], kind: EQUAL },
  'alternate-interior': { pairs: [[3, 6], [4, 5]], kind: EQUAL },
  'alternate-exterior': { pairs: [[1, 8], [2, 7]], kind: EQUAL },
  'co-interior': { pairs: [[3, 5], [4, 6]], kind: SUPPLEMENTARY },
  vertical: { pairs: [[1, 4], [2, 3], [5, 8], [6, 7]], kind: EQUAL },
  'linear-pair': { pairs: [[1, 2], [3, 4], [1, 3], [2, 4], [5, 6], [7, 8], [5, 7], [6, 8]], kind: SUPPLEMENTARY },
};

const TOL = 1e-6;

/** Exact measure of each of the 8 angles for a given figure. */
export function angleMeasures(fig: Figure): Record<AngleId, number> {
  const a = fig.inclination;
  const top: Record<number, number> = { 1: 180 - a, 2: a, 3: a, 4: 180 - a };
  // When the lines are NOT parallel, the bottom intersection has a different
  // inclination, so the cross-intersection relationships break. We model the
  // trap with a deliberately different bottom inclination `b`.
  const b = fig.parallel ? a : a + trapSkew(a);
  const bottom: Record<number, number> = { 5: 180 - b, 6: b, 7: b, 8: 180 - b };
  return { ...top, ...bottom } as Record<AngleId, number>;
}

/** A fixed, deterministic skew that makes trap lines visibly non-parallel. */
function trapSkew(a: number): number {
  // keep angles sane (10..170) and clearly different from the parallel case
  const skew = a > 90 ? -22 : 22;
  return skew;
}

/** Does `rel` actually connect angles i and j in this figure? */
export function relationshipHolds(rel: Relationship, i: AngleId, j: AngleId): boolean {
  const entry = RELATIONSHIP_PAIRS[rel];
  return entry.pairs.some(([p, q]) => (p === i && q === j) || (p === j && q === i));
}

/** Find the relationship (if any) that classically connects i and j. */
export function relationshipBetween(i: AngleId, j: AngleId): Relationship | 'none' {
  // Interior cross-line pairs first (most pedagogically relevant), then others.
  const order: Relationship[] = [
    'corresponding', 'alternate-interior', 'alternate-exterior',
    'co-interior', 'vertical', 'linear-pair',
  ];
  for (const rel of order) {
    if (relationshipHolds(rel, i, j)) return rel;
  }
  return 'none';
}

/** Is a pair a cross-intersection relationship that REQUIRES parallel lines? */
function requiresParallel(rel: Relationship): boolean {
  return rel === 'corresponding' || rel === 'alternate-interior'
    || rel === 'alternate-exterior' || rel === 'co-interior';
}

/**
 * The ground-truth measure of the asked angle, derived from the given angle.
 * Returns null when the connecting rule does not apply (non-parallel trap),
 * which is itself a teachable correct answer ("cannot be determined this way").
 */
export function solve(item: Item): number | null {
  const { figure, given, ask, relationship } = item;

  // Reconstruct the figure's inclination from the GIVEN angle so the engine
  // and the learner are looking at the same instance.
  const measures = angleMeasures(figure);

  // Trap: a cross-intersection rule that needs parallel lines, but lines aren't.
  if (!figure.parallel && requiresParallel(relationship)) {
    return null;
  }

  if (figure.type === 'triangle-transversal' && item.requiresChaining) {
    // Transfer: chain an angle relationship with the triangle-sum rule.
    // Two interior angles of the triangle are known (one via the relationship,
    // one given directly as figure.secondAngle); the asked angle closes 180°.
    const firstInterior = measures[given.angle];
    const second = figure.secondAngle ?? 60;
    return round(180 - firstInterior - second);
  }

  // Standard single-rule case.
  if (relationshipHolds(relationship, given.angle, ask)) {
    const kind = RELATIONSHIP_PAIRS[relationship].kind;
    return kind === EQUAL ? round(given.value) : round(180 - given.value);
  }

  // Fallback: compute directly from the figure (always exact).
  return round(measures[ask]);
}

/**
 * Check a learner's answer. Numeric correctness is fully deterministic; rule
 * correctness checks the learner named the relationship that actually connects
 * the two angles. Both must hold for the attempt to count toward mastery.
 */
export function check(item: Item, answerDeg: number, ruleChosen: Relationship | null): CheckResult {
  const truth = solve(item);
  const applies = !(!item.figure.parallel && requiresParallel(item.relationship))
    && !(item.figure.type === 'non-parallel-trap');

  // Trap items: the correct response is to recognise the rule does NOT apply.
  if (item.figure.type === 'non-parallel-trap') {
    return {
      groundTruthDeg: null,
      correctNumber: Number.isNaN(answerDeg), // expecting "no answer / can't apply"
      correctRule: ruleChosen === null,
      ruleApplies: false,
      expectedRelationship: 'none',
      explanation:
        'The lines are not parallel, so corresponding/alternate rules do not apply — the angle cannot be found this way.',
    };
  }

  const correctNumber = truth !== null && Math.abs(answerDeg - truth) <= TOL;
  const expected = item.relationship;
  const correctRule = ruleChosen === expected && relationshipHolds(expected, item.given.angle, item.ask);

  return {
    groundTruthDeg: truth,
    correctNumber,
    correctRule,
    ruleApplies: applies,
    expectedRelationship: expected,
    explanation: explain(item, truth),
  };
}

function explain(item: Item, truth: number | null): string {
  const kind = RELATIONSHIP_PAIRS[item.relationship].kind;
  const rel = humanRelationship(item.relationship);
  if (truth === null) return 'This rule does not apply to this figure.';
  if (item.requiresChaining) {
    return `Use the ${rel} relationship to find one interior angle, then the triangle's angles sum to 180°.`;
  }
  return kind === EQUAL
    ? `∠${item.given.angle} and ∠${item.ask} are ${rel}, so they are equal: ${truth}°.`
    : `∠${item.given.angle} and ∠${item.ask} are ${rel}, so they are supplementary: ${truth}°.`;
}

export function humanRelationship(rel: Relationship): string {
  return rel.replace('-', ' ');
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export const ENGINE = {
  RELATIONSHIP_PAIRS,
  angleMeasures,
  relationshipBetween,
  relationshipHolds,
  solve,
  check,
};
