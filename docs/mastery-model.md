# The Mastery Model

## What "mastery" means here

A learner has mastered angle relationships when, shown a figure they have **never seen** — rotated, recombined, or deliberately adversarial — they can name the relationship that applies, justify *why* it applies, and produce the correct angle, with little or no help. The standard is not "can compute a labeled angle." Most of our target learners can already do that. The standard is **ownership of the relationship**: knowing that two angles are equal *because they are alternate-interior on parallel lines*, not because they "look the same size" or because picking the other big angle has worked before.

Concretely, a mastered learner can do something they could not do at the start of the session: take a novel figure, recognize when a parallel-line rule applies and when it does not, *chain* an angle relationship with the triangle-angle-sum rule to reach an answer that no single rule gives, and — critically — refuse to apply the rule when the lines are not parallel. That last ability is the one that separates understanding from imitation.

## Why the easy definitions are rejected

**"Scored 80%"** is rejected because a percentage on familiar items measures fluency with familiar items. A learner who has memorized "corresponding angles are equal" and pattern-matched their way through ten near-identical figures will score high and transfer nothing. The brief explicitly names this failure: pattern-matching that masquerades as mastery.

**"Completed the flow"** is rejected because completion is a measure of *our* sequencing, not the learner's understanding. Click-through is a real and common false positive: a learner advances by pressing forward, not by demonstrating anything. A model of mastery that any persistent clicker can satisfy is not a model of mastery.

Both are exactly the "confident UI changes hiding uncertainty" the brief warns against. So mastery is never inferred from coverage or aggregate score.

## The gates

Mastery is granted only when **all** of the following hold on the transfer surface:

1. **Transfer pass.** The learner answers a *transfer* item correctly — a triangle-chaining figure or the non-parallel trap — not a familiar practice item.
2. **Low hint-dependence.** The transfer item is solved with hint-dependence below threshold. A correct answer reached by climbing the entire hint ladder is the engine's reasoning, not the learner's.
3. **Correct rule, not just a correct number.** The learner's chosen relationship (`ruleChosen`) must match the engine's `relationship`, and the justification must invoke that rule. A right number with the wrong or absent rule does not pass.
4. **Trap handled.** The non-parallel figure must be answered correctly — meaning the learner *declines* to apply the parallel rules and recognizes the figure does not support them.

Each gate is checked against verified engine facts (`correctNumber`, `correctRule`, `hintsUsed`) recorded in the `Attempt` model. The justification grader can only **withhold** a pass; it can never substitute for these gates.

## How each false positive is specifically defeated

- **Pattern-matching** ("pick the other big angle") is defeated by the transfer surface. Pattern-matchers thrive on figures that look like the ones they trained on. The transfer item is rotated and recombined precisely so that surface cues mislead, and the trap figure punishes the learned heuristic outright. You cannot pattern-match the trap — the pattern is *wrong* there.
- **Lucky guessing** is defeated by requiring the correct *rule* and a justification that invokes it. Guessing a multiple-choice number is plausible; guessing the number *and* selecting the matching relationship *and* articulating why, on a novel figure, is not. Latency and the learner-state estimator's `guessing` signal also flag fast, unreasoned answers.
- **Click-through** is defeated by gating on a *demonstrated act* — a correct transfer answer with a correct rule — rather than on progression. Pressing forward produces no `Attempt` with `correctRule: true` on a transfer item, so it produces no mastery.
- **Hint-dependence** is defeated by the hint-dependence gate and by hints that fade and cost as competence rises. A learner who needs the ladder to reach every answer accumulates a hint-dependence signal that blocks the mastery decision even when the final number is right.
- **"The UI did the reasoning"** is defeated by the bounded justification grade and by withholding live readouts in faded/assessment/transfer modes. If the live angle readout or the hint stated the answer, the learner did not reason — and the justification grader, which can only withhold, will catch a correct number with empty reasoning and deny the signal.

## The transfer moment, defined precisely

The transfer moment is the **first item drawn from a figure the learner has not practiced on**, presented with scaffolds removed (no live readouts, no pre-emptive hints), where reaching the answer requires either chaining an angle relationship with triangle-angle-sum, or correctly *not* applying the parallel rules on the non-parallel trap. Mastery is decided at and only at this moment: transfer correct, hint-dependence low, rule correct and justified, trap handled. If any gate fails, the honest output is "not yet" plus targeted remediation — never a softened or partial mastery badge.
