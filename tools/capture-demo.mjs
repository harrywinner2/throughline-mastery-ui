/**
 * Records one screen clip per narration beat against the LIVE site, each clip
 * padded to its narration duration (demo/audio/manifest.json) so audio and
 * video line up in assemble_video.sh. Each beat runs in its own recorded
 * context and is defensive — any failure still yields a usable clip. A fake
 * media device is enabled so the camera/handwriting beat shows a real feed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'https://throughline-production-a5d9.up.railway.app';
const ROOT = path.resolve('demo');
const CLIPS = path.join(ROOT, 'clips');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/manifest.json'), 'utf8'));
fs.mkdirSync(CLIPS, { recursive: true });

const W = 1600, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});

async function beat(id, secs, fn) {
  const dur = Math.max(secs, 4) * 1000 + 700;
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, recordVideo: { dir: CLIPS, size: { width: W, height: H } },
    permissions: ['camera', 'microphone'],
  });
  const page = await ctx.newPage();
  const start = Date.now();
  try {
    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(700);
    await fn(page);
  } catch (e) { console.log(`beat ${id}: ${String(e).slice(0, 90)}`); }
  const remain = dur - (Date.now() - start);
  if (remain > 0) await sleep(remain);
  await ctx.close();
  const vid = await page.video()?.path().catch(() => null);
  if (vid && fs.existsSync(vid)) {
    const dest = path.join(CLIPS, `clip_${String(id).padStart(3, '0')}.webm`);
    fs.renameSync(vid, dest);
    console.log(`beat ${id}: ok (${secs}s)`);
  } else console.log(`beat ${id}: NO VIDEO`);
}

// ---- navigation helpers ----
const begin = async (p) => { await p.getByText('Begin a session', { exact: false }).first().click(); await p.waitForTimeout(600); };
const practice = async (p) => { await begin(p); await p.getByText("I'm ready to practice", { exact: false }).click(); await p.waitForTimeout(600); };
const skipN = async (p, n) => { for (let i = 0; i < n; i++) { await p.getByRole('button', { name: /Skip/ }).click().catch(() => {}); await p.waitForTimeout(700); } };
const answerG1 = async (p) => {
  await p.locator('input[placeholder="degrees…"]').first().fill('58');
  await p.locator('.rule-chip', { hasText: 'alternate interior' }).click();
  await p.getByRole('button', { name: 'Check' }).click();
};
const scroll = async (p, y, steps = 4) => { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, y / steps); await p.waitForTimeout(500); } };

const drag = async (p) => {
  const h = p.locator('svg .handle').first();
  const b = await h.boundingBox().catch(() => null);
  if (!b) return;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down();
  await p.mouse.move(cx + 90, cy + 130, { steps: 22 }); await p.waitForTimeout(600);
  await p.mouse.move(cx - 50, cy + 70, { steps: 22 }); await p.waitForTimeout(500);
  await p.mouse.move(cx + 30, cy + 30, { steps: 16 }); await p.mouse.up();
};

const actions = {
  1: async (p) => { await p.waitForTimeout(1500); },
  2: async (p) => { await scroll(p, 520, 5); },
  3: async (p) => { await begin(p); await drag(p); await drag(p); },
  4: async (p) => { await practice(p); await answerG1(p); await p.waitForTimeout(2000); },
  5: async (p) => { await practice(p);
        await p.locator('input[placeholder="degrees…"]').first().fill('58');
        await p.locator('.rule-chip', { hasText: 'corresponding' }).first().click();
        await p.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(2000); },
  6: async (p) => { await practice(p); await p.getByText('Ask for a hint', { exact: false }).click(); await p.waitForTimeout(3500); },
  7: async (p) => { await practice(p); await answerG1(p); await p.waitForTimeout(1500); await scroll(p, 200, 2); },
  8: async (p) => { await practice(p); await skipN(p, 2); await p.waitForTimeout(2000); },          // faded
  9: async (p) => { await practice(p); await answerG1(p); await p.waitForTimeout(1200); await skipN(p, 1); await p.waitForTimeout(2000); },
  10: async (p) => { await practice(p); await skipN(p, 4);                                            // assessment + justify
        await p.locator('input[placeholder*="explain WHY"]').fill('These are corresponding angles, so they are equal.');
        await p.getByRole('button', { name: 'Submit reason' }).click(); await p.waitForTimeout(2500); },
  11: async (p) => { await practice(p); await p.getByText('Snap my work', { exact: false }).click(); await p.waitForTimeout(2000);
        await p.getByRole('button', { name: /Capture/ }).click().catch(() => {}); await p.waitForTimeout(3000); },
  12: async (p) => { await practice(p); await skipN(p, 5); await p.waitForTimeout(2500); },           // transfer triangle
  13: async (p) => { await practice(p); await skipN(p, 6); await p.waitForTimeout(2500); },           // trap
  14: async (p) => { await practice(p); await skipN(p, 6);                                            // mastery
        await p.getByText("rule doesn't apply", { exact: false }).click().catch(() => {}); await p.waitForTimeout(3000); },
  15: async (p) => { await p.getByText('Evidence', { exact: true }).click(); await p.waitForTimeout(1200); await scroll(p, 360, 4); },
  16: async (p) => { await p.getByText('Evidence', { exact: true }).click(); await p.waitForTimeout(1000); await scroll(p, 760, 6); },
  17: async (p) => { await p.getByText('Rationale', { exact: true }).click(); await p.waitForTimeout(1500); await scroll(p, 150, 2); },
  18: async (p) => { await p.getByText('Rationale', { exact: true }).click(); await p.waitForTimeout(1000); await scroll(p, 900, 7); },
};

for (const m of manifest) {
  await beat(m.id, m.seconds, actions[m.id] || (async (p) => { await p.waitForTimeout(1200); }));
}
await browser.close();
console.log('capture done');
