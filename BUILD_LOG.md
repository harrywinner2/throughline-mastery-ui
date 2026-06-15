# Build Log — Nerdy Hyperresponsive Mastery UI

One line per meaningful decision or phase transition. This is the running record the client/PM reads instead of being interrupted.

## Intake & setup
- 2026-06-15 — Preflight green: git, gh (harrywinner2), node v20, npm 11. PaaS: wrangler/railway/vercel all authenticated. ffmpeg present. No browser MCP → using Playwright (Chromium) via npm for capture/verify/record.
- 2026-06-15 — Extracted full PRD from tmp2.pdf (richer than pasted summary: mastery model, transfer assessment, false-positive guards, content-correctness validation, counter-metrics). PDF = source of truth.
- 2026-06-15 — **Domain decision: geometry angle relationships** (parallel lines + transversal; triangle-angle-sum as transfer). Chosen over flashier-but-riskier options because correctness is PROVABLE OUTSIDE THE LLM — coordinate ground-truth → exact arithmetic → deterministic engine is the authority, never the model. Directly satisfies "content correctness non-negotiable." To be highlighted in the presentation.
- 2026-06-15 — Deploy target: **Railway** (recommended; user deferred the choice). Cleanest server shape for an OpenAI proxy + streaming; clean secret store.
- 2026-06-15 — Runtime AI: **OpenAI only**. Models: gpt-4o (tutor + vision), gpt-4o-mini-tts (speech out), whisper-1 (speech in fallback; Web Speech API primary). Key written to untracked .env + will be set as Railway secret.
- 2026-06-15 — Phase 2 (style): captured nerdy.com via Playwright. Brand = deep indigo canvas (#0F0928/#202344), Poppins+Karla, signature multicolor gradient (orange→pink→purple→blue), cyan accent #17E2EA, pill buttons, floating rounded cards. Tokens in `design/style-guide.md`.
- 2026-06-15 — Phase 1 (expand): `docs/PRD-expanded.md` written. Product name **Throughline**. 4 routes: `/` (POV), `/learn` (the Studio — adaptive surface), `/evidence` (metrics + chat baseline), `/rationale` (deliverables). Modes: Explore/Guided/Faded/Assessment/Transfer/Remediation. 5 AI surfaces (tutor/vision/tts/stt/justify), all engine-bounded + mock-mode fallback.
- 2026-06-15 — Deliberate rejections (documented for the rubric's "what you rejected"): TensorFlow.js affect/attention detection (gimmick, false-confidence risk, ethically fraught) and LangChain (no gain over constrained OpenAI calls). Judgment over tech-checkboxing, which the PRD explicitly rewards.
- 2026-06-15 — Phase 3 (mockup): `ui/mockup.html` — single self-contained file, 4 wired views, real draggable SVG diagram with live exact-angle arithmetic. Verified via Playwright: 0 console errors, both diagrams render, all nav views captured (`design/mock-*.png`). On-brand dark-indigo + gradient. Nothing out of scope left in.
