# Throughline — Expanded PRD
*Nerdy Gauntlet Challenger: Hyperresponsive Mastery UI*
Working product name: **Throughline** — "the interface is the tutor." (Coherence is the PRD's central demand; a *transversal* is a line drawn through — our domain.)

---

## Original brief (source of truth: `tmp2.pdf`)
Build a **multimodal, hyperresponsive learning interface** that adapts in real time to move a learner toward **mastery of one tightly-scoped goal** — from confusion to a *defended* mastery signal. Not a chat box that swaps in a chart; not a content path with an adaptive wrapper. The interface itself must be *part of the tutoring*: it should guide, assess, remediate, and **know when the learner is genuinely ready** — while resisting false-positive mastery (pattern-matching, lucky guesses, hint-dependence, click-through, "the UI did the reasoning"). It must include a **transfer moment**, a **defended mastery model**, an explicit **adaptation policy** (responsiveness vs. stability), **content-correctness validation**, **counter-metrics**, and **evidence vs. a chat/static baseline**. We choose the subject, modalities, sensors, mastery model, and UI philosophy.

## Chosen goal & the decision that anchors everything
**Domain: geometry — angle relationships when a transversal crosses two parallel lines** (corresponding, alternate-interior, alternate-exterior, co-interior/same-side). **Transfer surface:** a triangle formed by transversals, requiring the learner to *chain* an angle relationship with the **triangle-angle-sum** rule, plus a **non-parallel "trap"** where the rules deliberately do **not** apply.

**Why this domain (the centerpiece decision):** correctness is **provable outside the LLM**. Every figure is generated from real coordinates, so every angle is exact arithmetic and a **deterministic geometry engine — never the model — is the authority on right/wrong.** This is the most direct possible answer to the PRD's "content correctness is non-negotiable" and its warning against "hiding uncertainty behind confident UI changes." The flashy surface (a live, draggable diagram) and ironclad correctness are *not* in tension here, which is exactly why we picked it over geometry *proofs*, essays, or reading analysis (where an LLM would have to be the grader and could be confidently wrong). **This decision is highlighted in the client presentation and surfaced in-product as a "✓ verified by the geometry engine, not the AI" badge.**

## Problem & users
- **User:** a middle/early-high-school student (Nerdy/Varsity Tutors' core) who can compute a single labeled angle but doesn't yet *own* the relationships — they pattern-match ("pick the other big angle") instead of reasoning, and they collapse on a rotated or non-parallel figure.
- **Job:** take that learner from partial/confused understanding to **demonstrated, transferable** command of angle relationships, in ~10 minutes, with an interface that adapts because the learner *showed* something — not to show off a component.
- **Single most important flow:** Explore → Guided practice → (scaffolds fade as competence is shown) → Assessment with justification → **Transfer** to a novel figure → **defended mastery signal** (or honest "not yet" + remediation).

## Scope
**In scope (demo):**
- One manipulable **SVG diagram** (two lines + transversal) that is the *stable hero*: drag the transversal/points, rotate the figure; angle arcs + (fadable) live readouts.
- **Adaptive learning surface** with named modes — `Explore`, `Guided`, `Faded`, `Assessment`, `Transfer`, `Remediation` — driven by a transparent **learner-state estimator**.
- **≥2 input modes:** direct manipulation (drag) + voice (ask a question / *justify your reasoning aloud*) + camera (snap handwritten work) + mouse/touch/keyboard. (We ship manipulation + voice + camera.)
- **≥2 output modes:** the visual manipulable diagram + spoken feedback (TTS) + an adaptive guidance rail (text hint ladder).
- **Deterministic engine** (authoritative): figure generation, angle computation, answer/rule checking, hint-ladder ground truth.
- **Mastery model** with false-positive guards + **one transfer moment** (and a non-parallel trap).
- **Evidence view**: live counter-metrics + a real **chat-only baseline** the user can toggle to and compare.
- **Rationale view**: mastery model, adaptation policy, modality rationale, content validation, "what we refuse to auto-change," "what we rejected," limitations.

**Explicitly out of scope (no phantom features — do not build):**
- Accounts/login, multi-user, databases, payments, real student data.
- A general content-generation engine for arbitrary subjects (we template-generate *within* this one goal, validated deterministically).
- Multi-device signal fusion (phone-cam + laptop simultaneously). *Considered; deferred* — single-device is the honest, simpler win the PRD says to defend. Noted in Rationale.
- Facial-affect / attention / posture detection. **Deliberately rejected** (gimmick + false-confidence + ethics) — documented in Rationale as "what we rejected."
- OpenAI Realtime voice-to-voice. We use Web Speech (STT) + Whisper fallback + TTS — robust, cheaper, lower-risk for a live demo.

## Screens / routes (demo inventory — Phase 3 & 4 build exactly these)
| Route | Screen | Purpose | Key components | Data shown |
|---|---|---|---|---|
| `/` | **Landing / POV** | The product point of view: why chat alone & static paths fail; what "hyperresponsive mastery" means here; start. | Hero (Nerdy gradient), 3 "why not chat / why not static / why this" cards, "Begin session" pill, live mini-diagram teaser | The thesis; the goal statement |
| `/learn` | **The Studio** (★ core) | The entire learning arc on one adaptive surface. The diagram stays; guidance/mode morph. | Stable SVG diagram (drag/rotate, angle arcs, fadable readouts); **Mode badge** + "why it changed" line; **Guidance rail** (hint ladder); **multimodal dock** (🎙 voice, 📷 camera, ✋ manipulate); justification input; "verified by engine" badge; progress/mastery meter | Current item, learner state, hints used, attempts, mode |
| `/evidence` | **Evidence & Metrics** | Defend the design with live data + baseline comparison. | Learner-state timeline; counter-metric cards (UI-change rate, hint-dependence index, time-to-correct, transfer success, false-positive guards fired); **chat-only baseline toggle + side-by-side** | Session metrics, comparison table |
| `/rationale` | **Design Rationale** | The defended-submission deliverables, client-facing. | Mastery model; adaptation/stability policy; modality & sensor rationale; **content validation ("proven outside the LLM")**; "what the UI refuses to auto-change"; "what we rejected"; limitations memo; research notes | Static, authored content |

Nav has exactly these four items; **every one is real and wired** (skill rule). No placeholder routes.

## Data model (in-memory + localStorage; no DB for the demo)
- **Skill** `{ id, title, objectives[], masteryRule }` — the single goal.
- **Figure** `{ id, type: 'parallel-transversal' | 'triangle-transversal' | 'non-parallel-trap', points{}, lines[], transversalAngleDeg, parallel: bool }` — geometry truth.
- **Item** `{ id, figureId, givenAngles{}, askAngle, relationship, groundTruthDeg, distractors[], requiresChaining: bool }` — generated deterministically from a Figure; the engine knows the answer before the learner does.
- **Attempt** `{ itemId, answerDeg, ruleChosen, correctNumber: bool, correctRule: bool, hintsUsed, latencyMs, mode, usedCamera, justifiedAloud }`.
- **LearnerState** `{ estimate: 'confused'|'practicing'|'guessing'|'pattern-matching'|'hint-dependent'|'ready-advance'|'ready-transfer', confidence, signals{...} }` — rolling, transparent.
- **Session** `{ attempts[], stateHistory[], uiChangeCount, masteryDecision: {granted, transferPassed, evidence[]} }`.

## AI surface (runtime — what the deployed OpenAI key powers)
The engine is the authority; the model is a **bounded pedagogy layer**. Five surfaces:
1. **Tutor hint** `POST /api/tutor` — in: item + learner work + **engine's ground-truth solution** + hint level. System intent: *"Coach toward the known answer; one nudge at a time; never state a number that contradicts the engine; escalate the hint ladder, don't give it away."* out: `{ hintText, highlightRule, highlightAngleIds }`. Renders in the guidance rail; optionally spoken. **Guard:** server post-checks the hint for any number conflicting with ground truth and regenerates/strips if found.
2. **Vision OCR** `POST /api/vision` — in: camera image of handwritten work. out: `{ transcript, parsedAngleDeg? }`. Then the **engine independently verifies** the parsed value against ground truth — a vision misread can *never* produce a false "Correct!".
3. **TTS** `POST /api/tts` — in: text. out: audio (spoken-feedback output mode; deliver a hint by voice while preserving the learner's work).
4. **STT** `POST /api/stt` — Whisper fallback when the browser Web Speech API is unavailable. in: audio → out: transcript.
5. **Justification grade** `POST /api/justify` — in: learner's spoken/typed reasoning + the correct relationship. out: `{ invokesCorrectRule: bool, note }`. **Bounded:** can only *withhold* a mastery signal ("right answer, no real reasoning"), never *grant* one — so a model error can't manufacture false mastery.

All five degrade gracefully: if the key/model is unavailable, the app runs in a deterministic **mock mode** (canned-but-correct hints, typed justification, no audio) so the core flow and correctness still demo.

## External integrations
- **OpenAI** (chat/vision `gpt-4o`, TTS `gpt-4o-mini-tts`, STT `whisper-1`) — the only third-party runtime dependency.
- **Browser APIs:** Web Speech (STT), MediaDevices/getUserMedia (camera), Web Audio (TTS playback), Pointer events (manipulation). All feature-detected with fallbacks.
- No analytics, no auth provider, no DB.

## Architecture (summary; full prose in README + Rationale)
- **Frontend:** React + TypeScript + Vite; SVG diagram; shared **TS geometry engine** for instant, authoritative client-side checking.
- **Backend:** Node + Express + TypeScript; serves the built SPA and proxies the 5 AI surfaces; holds the key server-side.
- **Proof engine:** an independent **Python + FastAPI** reimplementation of the angle math, plus **property-based tests (Hypothesis)** proving the TS and Python engines agree across thousands of random figures. This makes "provable outside the LLM" a *tested artifact*, not a claim. (Deployed as a second service if feasible; otherwise the in-process TS engine is authoritative and Python remains the tested proof harness.)
- **Deploy:** Railway, Dockerized. Key set as a Railway secret.

## Acceptance criteria (live-verify ticks these)
- [ ] `/` loads, states the POV (why-not-chat / why-not-static / why-this), and "Begin session" routes to `/learn`.
- [ ] In `/learn` the learner can **drag/rotate** the diagram and see angle arcs update live.
- [ ] The surface progresses through modes; each change shows a **"why it changed"** line; the **key diagram never auto-rearranges** mid-interaction.
- [ ] A wrong answer triggers a **hint** (engine-verified, optionally spoken); hints **fade/cost** as competence rises.
- [ ] **Voice**: learner can ask/justify by voice (or typed fallback) and it affects state.
- [ ] **Camera**: learner can capture handwritten work; it's transcribed, **engine-verified**, and preserved in the workspace.
- [ ] Correctness is **deterministic**: the "✓ verified by the engine" badge appears; a model outage doesn't break right/wrong.
- [ ] **Transfer** item (triangle-chaining or non-parallel trap) appears with scaffolds removed; mastery is only granted on transfer + low hint-dependence + correct *rule*, not just a number.
- [ ] `/evidence` shows live counter-metrics and a working **chat-only baseline** to compare against.
- [ ] `/rationale` presents mastery model, adaptation policy, modality rationale, content validation, refusals, rejections, limitations.
- [ ] Deployed at a public URL; core flow verified in a real browser.

## Open questions
None that block architecture. (Domain, deploy target, AI provider/key, and modality set are all settled.) Multi-device fusion and affect-detection are intentionally deferred/rejected, not open.
