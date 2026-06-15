# Research Notes

These are the ideas I actually leaned on while designing Throughline — what I read, what changed my mind, and what I rejected. I've kept to concepts and people I can name accurately rather than dressing the document up with invented citations.

## Mastery learning — the goal, and its honest problem

The north star is Benjamin Bloom's work on **mastery learning** and his **"2 sigma problem"** (1984): students tutored one-to-one with mastery-based correction performed about two standard deviations above conventionally taught students — a startling effect that no scalable classroom method has matched. The whole premise of an adaptive tutoring interface is to chase some of that gap with software. But Bloom's mastery learning also carries a discipline that's easy to drop: a learner advances *only* after demonstrating competence on the current unit. That discipline is exactly what most "adaptive" products quietly abandon when they let a percentage or a completed path stand in for demonstrated understanding. It's the reason our mastery model gates on a transfer demonstration rather than on coverage.

## Cognitive load theory — why scaffolds must fade

John Sweller's **cognitive load theory** distinguishes *intrinsic* load (the inherent difficulty of the material), *extraneous* load (load imposed by how it's presented), and *germane* load (effort that actually builds schemas). The design implication is direct: strip extraneous load, protect germane effort. The live angle readouts, the manipulable diagram, and the single-nudge hint ladder are all attempts to keep the learner's working memory spent on the *relationship* rather than on arithmetic or on parsing a cluttered interface.

The sharpest lesson came from the **expertise-reversal effect** (Kalyuga, Sweller, and colleagues) and the related **scaffolding-fading** literature: support that helps a novice actively *harms* a more competent learner. Worked examples and live readouts that accelerate a beginner become crutches — even noise — for someone who's ready to reason unaided. This is the single idea that most shaped the modes. Scaffolds in Throughline are not decorative; they fade *because the learner showed competence*, and the live readouts disappear in faded/assessment/transfer modes specifically so that a strong learner isn't handed the answer they should be deriving. The **worked-example effect** (also Sweller, Cooper, Sweller & Cooper) sits on the front of that curve: examples first, then faded practice, then independent problems.

## Transfer of learning — the thing we're actually testing

I took the **near vs. far transfer** distinction seriously (Barnett & Ceci's taxonomy is a useful frame). Near transfer is solving a problem that resembles the trained ones; far transfer is applying a principle in a genuinely new context. Most edtech demonstrates near transfer and calls it mastery. Our transfer surface is deliberately built to push past near transfer: the triangle-chaining item requires *combining* an angle relationship with triangle-angle-sum (a principle the learner must carry across, not a procedure they can repeat), and the non-parallel trap requires recognizing that the trained principle *does not apply at all* — about the hardest form of transfer there is.

## Multimodal interaction — and its traps

Richard Mayer's multimedia research gave me both encouragement and caution. The **modality effect** supports our visual-diagram-plus-spoken-hint pairing: narration alongside a visual can beat on-screen text by spreading load across channels. But the **redundancy effect** warns against the opposite — duplicating the same information across modes (e.g., identical text and identical narration at once) increases extraneous load rather than reducing it. So voice carries *hints and justification*, the diagram carries *spatial truth*, and we avoid simply reading the screen aloud.

## Desirable difficulties — why we make it harder on purpose

Robert and Elizabeth Bjork's **desirable difficulties** reframed how I think about the transfer item and the trap. Conditions that *feel* harder during learning — spacing, interleaving, varied contexts, generation rather than recognition — often produce more durable and transferable learning. The rotated figures, the interleaving of relationship types, and especially the non-parallel trap are desirable difficulties: they make the session feel less smooth and the learner more honest about what they actually understand.

## Generative / adaptive UI patterns

The interface is meant to *be* part of the tutoring, not a chat box that swaps in a chart. The useful pattern here is an interface driven by an explicit, inspectable learner-state estimate rather than by an opaque model — adaptation that the learner (and a skeptical educator) can see the reason for. That's why every mode change surfaces a "why it changed" line. The counter-discipline, also from the load literature, is the **calm band**: a UI that re-arranges constantly imposes its own extraneous load and erodes trust, so the diagram stays stable while only the guidance morphs.

## Misconceptions in angle relationships

Finally, the domain itself. The common misconceptions are well documented in geometry-education research and shaped every distractor and the trap figure:

- Students assume any two angles that **look equal** are equal — judging by appearance rather than by a relationship.
- Students **over-apply parallel-line rules** when the lines are *not* parallel, because the figures look similar. This misconception is the entire reason the non-parallel trap exists.
- Students **confuse alternate-interior with co-interior (same-side interior)** angles — treating angles that sum to 180° as if they were equal.
- Students treat the *number* as the goal and never form the *rule*, which is why our mastery model insists on `correctRule`, not just `correctNumber`.
