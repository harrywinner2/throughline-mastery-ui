/**
 * OpenAI surface wrappers. The key is read from the environment ONLY (set in
 * the untracked .env locally, or the Railway secret store in production) and is
 * never sent to the browser. Every function is bounded by the deterministic
 * engine: the tutor is given ground truth and post-checked; vision results are
 * re-verified by the caller; justification can only WITHHOLD a mastery signal.
 *
 * If no key is configured, `aiEnabled` is false and callers fall back to the
 * deterministic mock paths — the core flow never depends on the model.
 */
import OpenAI, { toFile } from 'openai';

const KEY = process.env.OPENAI_API_KEY;
export const aiEnabled = !!KEY && KEY.startsWith('sk-');

const client = aiEnabled ? new OpenAI({ apiKey: KEY }) : null;

const TUTOR_MODEL = process.env.OPENAI_TUTOR_MODEL || 'gpt-4o';
const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const STT_MODEL = process.env.OPENAI_STT_MODEL || 'whisper-1';

export interface TutorInput {
  relationship: string;
  hintLevel: number;
  groundTruthDeg: number | null;
  givenValue: number;
  learnerState: string;
}

/** A coaching hint, constrained to the engine's ground truth and post-checked. */
export async function tutorHint(inp: TutorInput): Promise<{ hintText: string; highlightRule: string }> {
  if (!client) throw new Error('ai-disabled');
  const sys = [
    'You are a patient geometry tutor coaching a student on angle relationships',
    '(parallel lines cut by a transversal). You are given the GROUND TRUTH answer',
    'from a deterministic engine. Rules:',
    '- Give ONE short nudge (max 2 sentences), escalating with the hint level.',
    '- NEVER state a numeric angle that contradicts the ground truth.',
    '- At low hint levels do NOT reveal the final number; guide the reasoning.',
    '- Name the relationship; connect it to "equal" or "supplementary".',
    '- Warm, concise, no preamble.',
  ].join(' ');
  const user = `Relationship: ${inp.relationship}. Given angle: ${inp.givenValue}°. ` +
    `Ground-truth answer (do not contradict): ${inp.groundTruthDeg ?? 'rule does not apply (lines not parallel)'}. ` +
    `Hint level: ${inp.hintLevel} (0=conceptual nudge, 2=basically the answer). ` +
    `Learner currently looks: ${inp.learnerState}.`;

  const res = await client.chat.completions.create({
    model: TUTOR_MODEL,
    temperature: 0.4,
    max_tokens: 120,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
  });
  let hint = res.choices[0]?.message?.content?.trim() || '';
  hint = postCheckHint(hint, inp);
  return { hintText: hint, highlightRule: inp.relationship };
}

/** Strip/repair any number in the hint that contradicts ground truth. */
function postCheckHint(hint: string, inp: TutorInput): string {
  if (inp.groundTruthDeg == null) return hint;
  const nums = (hint.match(/\d+(\.\d+)?/g) || []).map(Number);
  const allowed = new Set([inp.groundTruthDeg, inp.givenValue, 180, 360, inp.hintLevel]);
  const contradiction = nums.some((n) => n > 0 && n <= 360 && !allowed.has(n));
  if (contradiction) {
    // The model named a number the engine doesn't endorse — fall back to a safe nudge.
    return `Think about the ${inp.relationship.replace('-', ' ')} relationship: are these angles equal, or do they add to 180°?`;
  }
  return hint;
}

/** OCR a photo of handwritten work into a transcript + parsed angle. */
export async function readHandwriting(imageDataUrl: string): Promise<{ transcript: string; parsedAngleDeg: number | null }> {
  if (!client) throw new Error('ai-disabled');
  const res = await client.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    max_tokens: 80,
    messages: [
      {
        role: 'system',
        content: 'You read a student\'s handwritten geometry work. Reply with ONLY the math you see, e.g. "angle 6 = 122". If you see a single angle measure in degrees, include the number. Be literal; do not solve anything.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe this handwritten work.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ] as any,
      },
    ],
  });
  const transcript = res.choices[0]?.message?.content?.trim() || '';
  const m = transcript.match(/(\d+(\.\d+)?)\s*°?/);
  return { transcript, parsedAngleDeg: m ? Number(m[1]) : null };
}

/** Spoken feedback (returns mp3 bytes). */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  if (!client) throw new Error('ai-disabled');
  const res = await client.audio.speech.create({
    model: TTS_MODEL,
    voice: 'shimmer',
    input: text.slice(0, 600),
  });
  return Buffer.from(await res.arrayBuffer());
}

/** Whisper transcription fallback for the learner's spoken question/justification. */
export async function transcribeAudio(file: { buffer: Buffer; filename: string }): Promise<string> {
  if (!client) throw new Error('ai-disabled');
  const f = await toFile(file.buffer, file.filename || 'clip.webm', { type: 'audio/webm' });
  const res = await client.audio.transcriptions.create({ model: STT_MODEL, file: f });
  return res.text?.trim() || '';
}

/**
 * Grade a spoken/typed justification. BOUNDED: this can only confirm whether the
 * learner named the correct relationship. The caller uses it to WITHHOLD a
 * mastery signal when reasoning is absent — never to grant one.
 */
export async function gradeJustification(transcript: string, expectedRelationship: string): Promise<{ invokesCorrectRule: boolean; note: string }> {
  if (!client) throw new Error('ai-disabled');
  const res = await client.chat.completions.create({
    model: TUTOR_MODEL,
    temperature: 0,
    max_tokens: 60,
    messages: [
      {
        role: 'system',
        content: 'You judge ONLY whether a student\'s explanation correctly invokes a specific geometry relationship. Reply as JSON {"invokesCorrectRule": boolean, "note": string(<=12 words)}.',
      },
      { role: 'user', content: `Expected relationship: ${expectedRelationship}. Student said: "${transcript}".` },
    ],
    response_format: { type: 'json_object' },
  });
  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    return { invokesCorrectRule: !!parsed.invokesCorrectRule, note: String(parsed.note || '') };
  } catch {
    return { invokesCorrectRule: false, note: 'could not parse' };
  }
}
