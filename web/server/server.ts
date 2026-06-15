/**
 * Throughline server. Serves the built React client and proxies the AI
 * surfaces so the OpenAI key stays on the server. Every AI route falls back to
 * a deterministic mock response on error, so the product demos with or without
 * a key configured.
 */
import './env.ts'; // MUST be first: populates process.env before ai.ts reads the key
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aiEnabled, tutorHint, readHandwriting, synthesizeSpeech, transcribeAudio, gradeJustification,
} from './ai.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '8mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const PORT = Number(process.env.PORT) || 8080;

app.get('/api/health', (_req, res) => {
  res.json({ aiEnabled, service: 'throughline', ts: Date.now() });
});

app.post('/api/tutor', async (req, res) => {
  const { relationship, hintLevel = 0, groundTruthDeg = null, givenValue = 0, learnerState = 'practicing' } = req.body || {};
  try {
    const out = await tutorHint({ relationship, hintLevel, groundTruthDeg, givenValue, learnerState });
    res.json({ ...out, source: 'ai' });
  } catch {
    res.json({ hintText: mockHint(relationship, hintLevel, groundTruthDeg, givenValue), highlightRule: relationship, source: 'mock' });
  }
});

app.post('/api/vision', async (req, res) => {
  const { imageDataUrl, expectedAngleDeg = null } = req.body || {};
  try {
    const out = await readHandwriting(imageDataUrl);
    res.json({ ...out, source: 'ai' });
  } catch {
    res.json({ transcript: expectedAngleDeg != null ? `angle = ${expectedAngleDeg}` : 'could not read', parsedAngleDeg: expectedAngleDeg, source: 'mock' });
  }
});

app.post('/api/tts', async (req, res) => {
  const { text = '' } = req.body || {};
  try {
    const audio = await synthesizeSpeech(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch {
    res.status(204).end(); // no audio available; client uses on-screen text
  }
});

app.post('/api/stt', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) throw new Error('no-audio');
    const transcript = await transcribeAudio({ buffer: req.file.buffer, filename: req.file.originalname });
    res.json({ transcript, source: 'ai' });
  } catch {
    res.json({ transcript: '', source: 'mock' });
  }
});

app.post('/api/justify', async (req, res) => {
  const { transcript = '', expectedRelationship = '' } = req.body || {};
  try {
    const out = await gradeJustification(transcript, expectedRelationship);
    res.json({ ...out, source: 'ai' });
  } catch {
    const heard = String(transcript).toLowerCase();
    const key = String(expectedRelationship).replace('-', ' ');
    const ok = heard.includes(key) || heard.includes('equal') || heard.includes('supplementary');
    res.json({ invokesCorrectRule: ok, note: ok ? 'named the relationship' : 'relationship not named', source: 'mock' });
  }
});

// --- static client (production) ---
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[throughline] listening on :${PORT} — AI ${aiEnabled ? 'enabled' : 'disabled (mock mode)'}`);
});

function mockHint(rel: string, level: number, truth: number | null, given: number): string {
  const human = String(rel).replace('-', ' ');
  const supp = rel === 'co-interior' || rel === 'linear-pair';
  const ladder = [
    `Where does this angle sit relative to the transversal? That tells you the "${human}" pairing.`,
    `With parallel lines, ${human} angles are ${supp ? 'supplementary (add to 180°)' : 'equal'}.`,
    truth != null ? `So it's ${truth}° — ${supp ? `180° − ${given}°` : `equal to ${given}°`}.` : 'These lines are not parallel, so the rule does not apply.',
  ];
  return ladder[Math.min(level, ladder.length - 1)];
}
