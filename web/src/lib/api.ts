/**
 * Thin client for the server-side AI surfaces. The browser NEVER sees the
 * OpenAI key — every call goes to our Express proxy. Each function degrades
 * gracefully: on any failure it returns a safe, deterministic fallback so the
 * core (engine-driven) flow keeps working even with no model available.
 */

export interface TutorResponse {
  hintText: string;
  highlightRule?: string;
  source: 'ai' | 'mock';
}

export interface VisionResponse {
  transcript: string;
  parsedAngleDeg: number | null;
  source: 'ai' | 'mock';
}

export interface JustifyResponse {
  invokesCorrectRule: boolean;
  note: string;
  source: 'ai' | 'mock';
}

async function postJSON<T>(url: string, body: unknown, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getHealth(): Promise<{ aiEnabled: boolean }> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch {
    return { aiEnabled: false };
  }
}

export function tutorHint(payload: {
  itemId: string;
  relationship: string;
  hintLevel: number;
  groundTruthDeg: number | null;
  givenValue: number;
  learnerState: string;
}): Promise<TutorResponse> {
  return postJSON<TutorResponse>('/api/tutor', payload, {
    hintText: localHint(payload.relationship, payload.hintLevel, payload.groundTruthDeg, payload.givenValue),
    highlightRule: payload.relationship,
    source: 'mock',
  });
}

export function gradeJustification(payload: {
  transcript: string;
  expectedRelationship: string;
}): Promise<JustifyResponse> {
  const heard = payload.transcript.toLowerCase();
  const key = payload.expectedRelationship.replace('-', ' ');
  const looksRight = heard.includes(key) || heard.includes('equal') || heard.includes('supplementary');
  return postJSON<JustifyResponse>('/api/justify', payload, {
    invokesCorrectRule: looksRight,
    note: looksRight ? 'Heard the right relationship named.' : 'Did not clearly name the relationship.',
    source: 'mock',
  });
}

export function speak(text: string): Promise<Blob | null> {
  return fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
}

export function transcribe(audio: Blob): Promise<{ transcript: string }> {
  const fd = new FormData();
  fd.append('audio', audio, 'clip.webm');
  return fetch('/api/stt', { method: 'POST', body: fd })
    .then((r) => (r.ok ? r.json() : { transcript: '' }))
    .catch(() => ({ transcript: '' }));
}

export function readHandwriting(payload: { imageDataUrl: string; expectedAngleDeg: number | null }): Promise<VisionResponse> {
  const v = payload.expectedAngleDeg;
  return postJSON<VisionResponse>('/api/vision', payload, {
    transcript: v != null ? `∠ = ${v}°` : 'could not read',
    parsedAngleDeg: v,
    source: 'mock',
  });
}

/** Deterministic local hint ladder, used whenever the AI is unavailable. */
function localHint(rel: string, level: number, truth: number | null, given: number): string {
  const human = rel.replace('-', ' ');
  const ladder = [
    `Think about where ∠ sits relative to the transversal and the two lines. What makes a pair "${human}"?`,
    `When the lines are parallel, ${human} angles are ${rel === 'co-interior' || rel === 'linear-pair' ? 'supplementary (they add to 180°)' : 'equal'}.`,
    truth != null
      ? `So the answer is ${truth}° — ${rel === 'co-interior' || rel === 'linear-pair' ? `180° − ${given}°` : `the same as ${given}°`}.`
      : 'These lines are not parallel, so this rule does not apply here.',
  ];
  return ladder[Math.min(level, ladder.length - 1)];
}
