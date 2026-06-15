# Decision Log

A tight record of the decisions that shaped Throughline, and the reasoning behind each. All entries dated **2026-06-15** (single design/build day for the prototype).

## Core decisions

| Date | Decision | Why |
|---|---|---|
| 2026-06-15 | **Domain = geometry angle relationships** (parallel lines + transversal; triangle-angle-sum as transfer; non-parallel trap) | Correctness is **provable outside the LLM**. Figures are generated from coordinates → every angle is exact arithmetic → a deterministic engine, never the model, is the authority on right/wrong. This is the most direct answer to the brief's "content correctness is non-negotiable." Chosen over geometry *proofs*, essays, or reading analysis, where an LLM would have to be the grader and could be confidently wrong. |
| 2026-06-15 | **Deploy on Railway**, Dockerized | Cleanest server shape for an OpenAI proxy with a server-held secret; clean secret store; minimal ops for a single-service-plus-proof-engine prototype. (User deferred the choice; Railway recommended.) |
| 2026-06-15 | **OpenAI only** for runtime AI | One third-party runtime dependency keeps the AI boundary small and auditable. Models: `gpt-4o` (tutor + vision), `gpt-4o-mini-tts` (speech out), `whisper-1` (speech-in fallback; Web Speech API primary). |
| 2026-06-15 | **Single-device**, multi-device fusion deferred | We considered phone-cam + laptop signal fusion and could not show it beats single-device for *this* goal. Single-device is the honest, simpler win the brief says to defend. Deferred, not rejected — noted in the rationale. |
| 2026-06-15 | **Mock-mode fallback** for all five AI surfaces | Every AI surface degrades to deterministic, canned-but-correct behavior. If the key/model is unavailable, the core loop (manipulate → check → estimate → advance → grade mastery) still runs and still tells the truth, because correctness never depended on the model. |
| 2026-06-15 | **Mastery gated on a transfer demonstration**, not score or completion | Mastery is granted only on a transfer item, with low hint-dependence, a correct *rule* (not just a correct number), and the non-parallel trap handled. Defeats pattern-matching, lucky guessing, click-through, hint-dependence, and "the UI did the reasoning." |
| 2026-06-15 | **Justification grading is bounded one-directional** | The `/api/justify` model output can only *withhold* a mastery signal, never *grant* one. A model error therefore cannot manufacture false mastery. |
| 2026-06-15 | **Dual engine: TS in-app + Python proof harness** | The TypeScript engine gives instant client-side verdicts; an independent Python + FastAPI reimplementation plus Hypothesis property tests proves the two agree across thousands of random figures. Turns "provable outside the LLM" into a tested artifact. |

## Deliberate rejections

| Date | Rejected | Why |
|---|---|---|
| 2026-06-15 | **Facial-affect / attention / posture detection** (e.g., TensorFlow.js) | Gimmick + false-confidence risk + ethically fraught. Inferring "confusion" from a webcam invites confident UI changes built on a weak signal — exactly the failure the brief punishes. The learner-state estimator uses *behavioral* signals (latency, hints, rule-vs-number, distractor patterns) we can actually defend. |
| 2026-06-15 | **Multi-device sensor fusion** | Considered; could not beat single-device for this goal. Added complexity without a demonstrable mastery gain. Deferred and documented rather than shipped as a phantom feature. |
| 2026-06-15 | **LangChain** | No gain over a small number of constrained, post-checked OpenAI calls. The bounded AI surfaces are simpler and more auditable hand-written. Judgment over tech-checkboxing. |
| 2026-06-15 | **OpenAI Realtime voice-to-voice** | Robustness over flash. Web Speech (STT) + Whisper fallback + TTS is cheaper, lower-risk, and more reliable for a live demo than a real-time voice pipeline. |
| 2026-06-15 | **Accounts / DB / payments / real student data** | Out of scope for the prototype. In-memory + localStorage is sufficient to demonstrate the mastery arc without standing up infrastructure the brief doesn't ask for. |
| 2026-06-15 | **General multi-subject content engine** | Out of scope. We template-generate *within* the one goal and validate deterministically, rather than gesture at a generality we cannot prove correct. |
