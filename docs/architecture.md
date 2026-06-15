# Architecture

## The one idea this system is organized around

Throughline is built so that **correctness lives outside the language model**. Every figure the learner sees is generated from real coordinates, so every angle in it is a known quantity — exact arithmetic, computed before the learner ever touches the screen. That single fact lets us draw a hard line through the whole system: a deterministic geometry engine is the sole authority on whether an answer is right, and the AI is a layer of coaching that sits *on top* of that authority and is never allowed to override it.

This is not a stylistic preference. The brief insists that content correctness is non-negotiable and warns specifically against "hiding uncertainty behind confident UI changes." An LLM grading geometry would be exactly that failure mode: a model that is fluent, persuasive, and occasionally, confidently wrong. By choosing a domain where truth is arithmetic, we get to make the flashy surface (a live, draggable diagram) and ironclad correctness coexist instead of compete. The engine is the spine; everything else hangs off it.

## Components

- **Client** — React + TypeScript + Vite. Renders the manipulable SVG diagram, the guidance rail, the multimodal dock (voice / camera / manipulate), and the mode badge. It embeds a **TypeScript geometry engine** so that checking an answer is instant and local — no network round trip to know whether 110° is correct.
- **Server** — Node + Express + TypeScript. Serves the built SPA and proxies the five AI surfaces, holding the OpenAI key server-side. It is a thin, auditable boundary: every AI response passes back through it, and the tutor surface is post-checked here before it ever reaches the learner.
- **Proof engine** — Python + FastAPI. An *independent* reimplementation of the same angle math, paired with property-based tests (Hypothesis) that prove the TypeScript and Python engines agree across thousands of randomly generated figures. This is what turns "provable outside the LLM" from a claim into a tested artifact.
- **OpenAI** — the only third-party runtime dependency: `gpt-4o` (tutor + vision), `gpt-4o-mini-tts` (speech out), `whisper-1` (speech-in fallback).

## A single learner interaction, end to end

```
  learner acts                 ┌─────────────────────────┐
  (drag / type / speak / snap) │  GEOMETRY ENGINE (TS)   │  ← the authority
        │                      │  ground truth from      │
        ▼                      │  coordinates; exact      │
  ┌───────────┐  answer/work   │  angle + rule check     │
  │  CLIENT   │ ─────────────► │  correctNumber?         │
  │  SVG +    │ ◄───────────── │  correctRule?           │
  │  dock     │   verdict      └───────────┬─────────────┘
  └─────┬─────┘                            │ verified signals
        │                                  ▼
        │                      ┌─────────────────────────┐
        │                      │ LEARNER-STATE ESTIMATOR │  confused / guessing /
        │                      │ (transparent, rolling)  │  practicing / pattern-
        │                      └───────────┬─────────────┘  matching / hint-dep /
        │                                  ▼                 ready-advance / -transfer
        │                      ┌─────────────────────────┐
        │                      │   ADAPTATION POLICY     │  picks mode; obeys the
        │                      │   Explore→…→Transfer    │  "calm band" (no churn)
        │                      └───────────┬─────────────┘
        │                                  ▼
        │   mode + UI changes   ┌─────────────────────────┐
        └◄──────────────────────│  RENDER / OPTIONAL AI   │
                                │  hint · TTS · vision    │──► server ──► OpenAI
                                │  (bounded, post-checked)│◄── (or MOCK MODE)
                                └─────────────────────────┘
```

The order matters. The engine runs **first** and produces verified facts: was the number right, was the chosen rule right. Those facts — never the model's opinion — feed the learner-state estimator, which reads signals like latency, hint use, distractor patterns, and rule-vs-number mismatches to estimate where the learner is. The policy reads that state and selects the mode and any UI change. Only *then*, if a hint is warranted, do we call the AI — and even the AI hint is handed the engine's ground-truth solution and told to coach toward it.

## The five AI surfaces, all bounded

1. **Tutor hint** — given the item, the learner's work, the engine's ground truth, and a hint level, it produces one nudge at a time. The server **post-checks** the hint for any number that contradicts ground truth and strips/regenerates if found. The model escalates the ladder; it never decides the answer.
2. **Vision OCR** — transcribes a photo of handwritten work into a parsed angle. The engine then **independently verifies** that value. A misread can never produce a false "Correct!".
3. **TTS** — speaks a hint, so feedback can arrive by voice while the learner's written work stays intact.
4. **STT** — Whisper as fallback when the browser's Web Speech API is unavailable.
5. **Justification grade** — reads the learner's reasoning and reports whether it invokes the correct rule. **Deliberately one-directional:** it can only *withhold* a mastery signal, never *grant* one. A model error cannot manufacture mastery.

## Dual-engine correctness proof

The TypeScript engine gives the client instant verdicts; the Python engine exists to keep it honest. Property-based tests generate thousands of random parallel-transversal, triangle, and non-parallel figures, run both engines, and assert they agree. If they ever diverge, the test fails. This is how the "✓ verified by the engine, not the AI" badge earns the right to appear in-product.

## Graceful degradation and deploy

Every AI surface degrades to a deterministic **mock mode**: canned-but-correct hints, typed justification, no audio. If the OpenAI key or model is unavailable, the *core* loop — manipulate, check, estimate, advance, grade mastery — still runs and still tells the truth, because none of that depended on the model in the first place. The whole system is Dockerized and deployed on **Railway**, with the OpenAI key set as a Railway secret. The Python proof engine deploys as a second service where feasible; otherwise the in-process TS engine is authoritative and Python remains the tested proof harness.
