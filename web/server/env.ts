/**
 * Loads the local .env into process.env as a SIDE EFFECT at import time.
 * Imported before ./ai.ts so the OpenAI key is present when that module reads
 * it. In production the platform (Railway) injects the secret directly, and
 * these files simply won't exist — which is fine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadEnvFile(p: string) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(here, '../.env')); // web/.env
loadEnvFile(path.resolve(here, '../../.env')); // project-root .env (local dev)
