# Throughline

*The interface is the tutor.*

Throughline is a hyperresponsive, multimodal learning surface built for the Nerdy / Varsity Tutors gauntlet challenge. It teaches one tightly-scoped thing — the angle relationships formed when a transversal crosses two parallel lines — and it does so by reshaping itself around what the learner actually demonstrates, rather than dumping text into a chat box or marching them down a fixed lesson path.

A learner drags a real diagram, answers in degrees, names the *relationship* (not just the number), can ask for a spoken hint, can photograph their handwritten work, and can justify their reasoning out loud. The surface fades its scaffolding as competence rises, then tests whether the skill survives on a brand-new figure. Only then does it call anything "mastery."

## The one idea worth remembering

**Correctness is proven outside the LLM.** Every figure is generated from coordinates, so a small deterministic engine already knows every angle exactly. That engine — not the language model — decides what is right. The model only coaches: it phrases hints, reads handwriting, and listens to justifications, and it is structurally prevented from ever overriding the engine. We even re-implemented the engine a second time in Python and property-tested the two against 192 generated cases to make the point unarguable. This is why we chose geometry over flashier domains like proof-writing or essay feedback, where a model would have to be the grader and could be confidently wrong.

If the AI key is missing or a call fails, the app drops into a deterministic "mock mode" and the core learning flow still works end to end. The model is an enhancement, never a dependency.

## What's here

```
docs/            the expanded PRD, architecture, mastery model, research notes, decision log, evaluation method
design/          captured Nerdy style + the style guide the UI is built from
ui/mockup.html   the single-file design mockup the app was grown from
web/             the deployable app — React client + Express server (TypeScript)
  src/engine/    the deterministic geometry engine (the authority) + tests
  src/state/     the learner-state estimator and adaptation policy + tests
  src/views/     Landing · Studio · Evidence · Rationale
  server/        the OpenAI proxy (hints, vision OCR, TTS, Whisper, justification grading)
proof-engine/    an independent Python/FastAPI re-implementation + Hypothesis proof of agreement
```

## Running it locally

You need Node 20+. The app calls OpenAI at runtime, so it wants a key — but it will run without one (mock mode).

```bash
cd web
npm install

# put your key where the server can read it (this file is gitignored)
echo "OPENAI_API_KEY=sk-..." >> ../.env

npm run dev      # client on :5173 (proxying /api to the server on :8080)
# or, to run the production build the way it deploys:
npm run build && npm start   # everything on :8080
```

Open the Studio, click "I'm ready to practice," and work the flow from guided practice through the transfer task. The Evidence tab shows the live session metrics and counter-metrics; Rationale lays out the design decisions.

The independent proof engine runs on its own:

```bash
cd proof-engine
pip install -r requirements.txt
pytest -q                       # invariants + the 192-case cross-language agreement proof
uvicorn app:app --port 8000     # optional: the verifier as a service
```

## Architecture in brief

The browser never sees the OpenAI key. Every model call goes to the Express server, which holds the key (from an untracked `.env` locally, or the platform secret store in production) and proxies five narrow surfaces: tutor hints, handwriting OCR, text-to-speech, speech-to-text, and justification grading.

A single learner action flows like this: the learner acts → the **deterministic engine** checks it and produces ground truth → the **learner-state estimator** updates a transparent read of where they are (confused, guessing, pattern-matching, hint-dependent, ready to advance, ready to transfer) → the **adaptation policy** decides whether to hold, advance, propose an escalation, or remediate, and always says *why* → the UI changes guidance accordingly while keeping the diagram itself stable. The AI is consulted only after the engine has already decided correctness. There's a fuller write-up in `docs/architecture.md`.

The client is React + TypeScript (Vite), with the diagram drawn in SVG and the geometry engine shared verbatim between client, server, and tests. The server is Express on `tsx`. It's containerized and deployed on Railway.

## A note on the key

The runtime key is a secret. It lives only in the untracked `.env` and in the deploy platform's secret store — never in git, never in the client bundle, never in the mockup. If you were handed a key to demo this, please rotate it once you're done.
