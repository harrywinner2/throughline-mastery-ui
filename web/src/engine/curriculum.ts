/**
 * Deterministic curriculum. Generates the ordered learning items for a session.
 *
 * Variety is intentional and anti-pattern-matching: inclination, which angle is
 * given vs. asked, and the relationship all change between items, so a learner
 * who memorised "pick the other big number" is caught. The final two items are
 * the transfer surface (triangle chaining) and a non-parallel trap.
 */
import type { AngleId, Figure, Item, Relationship } from './geometry';
import { ENGINE, angleMeasures } from './geometry';

export type Mode = 'explore' | 'guided' | 'faded' | 'assessment' | 'transfer' | 'remediation';

const ALL_RULES: Relationship[] = [
  'corresponding', 'alternate-interior', 'alternate-exterior', 'co-interior', 'vertical', 'linear-pair',
];

function ruleChoices(correct: Relationship): Relationship[] {
  const distractors = ALL_RULES.filter((r) => r !== correct);
  // stable, deterministic pick of 3 plausible distractors
  const picks = distractors.slice(0, 3);
  const out = [...picks, correct];
  // deterministic shuffle by relationship name length so it isn't always last
  return out.sort((a, b) => (a.length - b.length) || a.localeCompare(b));
}

function makeItem(
  id: string,
  opts: {
    inclination: number;
    relationship: Relationship;
    parallel?: boolean;
    type?: Figure['type'];
    requiresChaining?: boolean;
    secondAngle?: number;
  },
): Item {
  const figure: Figure = {
    type: opts.type ?? 'parallel-transversal',
    inclination: opts.inclination,
    parallel: opts.parallel ?? true,
    secondAngle: opts.secondAngle,
  };
  const pair = ENGINE.RELATIONSHIP_PAIRS[opts.relationship].pairs[0];
  const [givenId, askId] = pair as [AngleId, AngleId];
  const measures = angleMeasures(figure);
  return {
    id,
    figure,
    given: { angle: givenId, value: measures[givenId] },
    ask: askId,
    relationship: opts.relationship,
    requiresChaining: opts.requiresChaining ?? false,
    ruleChoices: ruleChoices(opts.relationship),
  };
}

export interface Stage {
  mode: Mode;
  item: Item | null; // explore has no graded item
  scaffold: boolean; // live readouts visible?
  hintsAllowed: boolean;
  requireJustification: boolean;
  blurb: string;
}

/** The full ordered session. The estimator/policy decides WHEN to advance. */
export function buildCurriculum(): Stage[] {
  return [
    {
      mode: 'explore',
      item: null,
      scaffold: true,
      hintsAllowed: true,
      requireJustification: false,
      blurb: 'Drag the transversal. Watch which angles move together and which stay opposite.',
    },
    {
      mode: 'guided',
      item: makeItem('g1', { inclination: 58, relationship: 'alternate-interior' }),
      scaffold: true,
      hintsAllowed: true,
      requireJustification: false,
      blurb: 'Alternate interior angles. Full scaffolding: live readouts and a hint ladder.',
    },
    {
      mode: 'guided',
      item: makeItem('g2', { inclination: 47, relationship: 'corresponding' }),
      scaffold: true,
      hintsAllowed: true,
      requireJustification: false,
      blurb: 'Corresponding angles, a new inclination so the numbers are different.',
    },
    {
      mode: 'faded',
      item: makeItem('f1', { inclination: 63, relationship: 'co-interior' }),
      scaffold: false,
      hintsAllowed: true,
      requireJustification: false,
      blurb: 'Scaffolds fading: the live readouts are hidden. Co-interior angles are supplementary.',
    },
    {
      mode: 'faded',
      item: makeItem('f2', { inclination: 71, relationship: 'alternate-exterior' }),
      scaffold: false,
      hintsAllowed: true,
      requireJustification: false,
      blurb: 'Alternate exterior angles, still without readouts.',
    },
    {
      mode: 'assessment',
      item: makeItem('a1', { inclination: 39, relationship: 'corresponding' }),
      scaffold: false,
      hintsAllowed: false,
      requireJustification: true,
      blurb: 'Assessment: no readouts, no hints. Name the rule and justify it.',
    },
    {
      mode: 'transfer',
      item: makeItem('t1', {
        inclination: 55,
        relationship: 'alternate-interior',
        type: 'triangle-transversal',
        requiresChaining: true,
        secondAngle: 70,
      }),
      scaffold: false,
      hintsAllowed: false,
      requireJustification: true,
      blurb: 'Transfer: a triangle. Chain an angle relationship with "angles sum to 180°". No scaffolds.',
    },
    {
      mode: 'transfer',
      item: makeItem('t2', {
        inclination: 60,
        relationship: 'alternate-interior',
        type: 'non-parallel-trap',
        parallel: false,
      }),
      scaffold: false,
      hintsAllowed: false,
      requireJustification: true,
      blurb: 'Transfer trap: the lines are NOT parallel. Does the rule still apply?',
    },
  ];
}
