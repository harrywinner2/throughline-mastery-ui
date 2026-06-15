/**
 * Resilient narration generator. Uses OpenAI's premium gpt-4o-mini-tts (cloud,
 * natural/expressive — NOT on-device), with a per-clip timeout, retries, and a
 * fallback to tts-1-hd (also natural) only if a clip repeatedly fails. Skips
 * clips already generated, so it resumes rather than restarting. Writes
 * demo/audio/clip_00N.mp3 + manifest.json (durations via ffprobe).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve('.');
const OUT = path.join(ROOT, 'demo/audio');
fs.mkdirSync(OUT, { recursive: true });
const VOICE = process.argv[2] || 'alloy';

// key from env or ../.env (root) or .env
let KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  for (const p of ['.env', '../.env']) {
    const f = path.join(ROOT, p);
    if (fs.existsSync(f)) { const m = fs.readFileSync(f, 'utf8').match(/^OPENAI_API_KEY=(.+)$/m); if (m) { KEY = m[1].trim(); break; } }
  }
}
if (!KEY) { console.error('no OPENAI_API_KEY'); process.exit(1); }

// split script.md into beats exactly like tts.py
let raw = fs.readFileSync(path.join(ROOT, 'demo/script.md'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const beats = raw.split(/\n\s*\n/).map((blk) =>
  blk.split('\n').filter((l) => !l.trimStart().startsWith('#')).join(' ').replace(/\s+/g, ' ').trim()
).filter(Boolean).map((text, i) => ({ id: i + 1, text }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synth(text, model) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, voice: VOICE, input: text, response_format: 'mp3' }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally { clearTimeout(t); }
}

async function generate(beat) {
  const clip = path.join(OUT, `clip_${String(beat.id).padStart(3, '0')}.mp3`);
  if (fs.existsSync(clip) && fs.statSync(clip).size > 5000) { console.log(`clip ${beat.id}: kept (${fs.statSync(clip).size}b)`); return clip; }
  for (const model of ['gpt-4o-mini-tts', 'gpt-4o-mini-tts', 'tts-1-hd']) {
    try {
      const buf = await synth(beat.text, model);
      fs.writeFileSync(clip, buf);
      fs.writeFileSync(clip.replace(/\.mp3$/, '.txt'), beat.text);
      console.log(`clip ${beat.id}: ${model} ${buf.length}b`);
      return clip;
    } catch (e) { console.log(`clip ${beat.id}: ${model} failed (${String(e).slice(0, 50)}) — retrying`); await sleep(1500); }
  }
  console.log(`clip ${beat.id}: ALL ATTEMPTS FAILED`);
  return null;
}

function dur(p) {
  try { return Math.round(parseFloat(execSync(`ffprobe -v quiet -of json -show_format "${p}"`).toString().match(/"duration":\s*"([\d.]+)"/)[1]) * 100) / 100; }
  catch { return 0; }
}

const manifest = [];
for (const b of beats) {
  const clip = await generate(b);
  manifest.push({ id: b.id, file: `clip_${String(b.id).padStart(3, '0')}.mp3`, seconds: clip ? dur(clip) : 0, text: b.text });
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
const ok = manifest.filter((m) => m.seconds > 0).length;
console.log(`DONE: ${ok}/${beats.length} clips, total ${Math.round(manifest.reduce((s, m) => s + m.seconds, 0))}s`);
