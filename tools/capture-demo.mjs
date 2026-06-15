/**
 * Records one screen clip per narration beat against the LIVE site, each clip
 * padded to its narration duration (from demo/audio/manifest.json) so audio and
 * video line up in assemble_video.sh. Each beat runs in its own recorded
 * context and is defensive — any failure still yields a usable clip.
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

const browser = await chromium.launch();

async function beat(id, secs, fn) {
  const dur = Math.max(secs, 3) * 1000 + 600; // pad a touch
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: CLIPS, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  const start = Date.now();
  try {
    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(600);
    await fn(page);
  } catch (e) { console.log(`beat ${id}: ${String(e).slice(0, 80)}`); }
  const remain = dur - (Date.now() - start);
  if (remain > 0) await sleep(remain);
  await ctx.close();
  // rename the auto-named webm to clip_00N.webm
  const vid = await page.video()?.path().catch(() => null);
  if (vid && fs.existsSync(vid)) {
    const dest = path.join(CLIPS, `clip_${String(id).padStart(3, '0')}.webm`);
    fs.renameSync(vid, dest);
    console.log(`beat ${id}: ${dest} (${secs}s)`);
  } else {
    console.log(`beat ${id}: NO VIDEO`);
  }
}

const begin = async (page) => { await page.getByText('Begin a session', { exact: false }).first().click(); await page.waitForTimeout(500); };
const practice = async (page) => { await begin(page); await page.getByText("I'm ready to practice", { exact: false }).click(); await page.waitForTimeout(500); };
const answerG1 = async (page) => {
  await page.locator('input[placeholder="degrees…"]').first().fill('58');
  await page.locator('.rule-chip', { hasText: 'alternate interior' }).click();
  await page.getByRole('button', { name: 'Check' }).click();
};

// beat-id → action. Missing ids just hold on the loaded page.
const actions = {
  1: async (p) => { await p.waitForTimeout(1500); },                                  // landing hero
  2: async (p) => { await p.mouse.wheel(0, 360); await p.waitForTimeout(1200); },     // why-grid
  3: async (p) => { await begin(p);                                                  // explore mode: drag the handle
        const h = p.locator('svg .handle').first();
        const b = await h.boundingBox().catch(() => null);
        if (b) { const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
          await p.mouse.move(cx, cy); await p.mouse.down();
          await p.mouse.move(cx + 90, cy + 130, { steps: 22 }); await p.waitForTimeout(500);
          await p.mouse.move(cx - 50, cy + 70, { steps: 22 }); await p.waitForTimeout(400);
          await p.mouse.move(cx + 30, cy + 30, { steps: 16 }); await p.mouse.up(); } },
  4: async (p) => { await practice(p); await answerG1(p); await p.waitForTimeout(1500); }, // engine-verified
  5: async (p) => { await practice(p);                                                // wrong rule
        await p.locator('input[placeholder="degrees…"]').first().fill('58');
        await p.locator('.rule-chip', { hasText: 'corresponding' }).first().click();
        await p.getByRole('button', { name: 'Check' }).click(); await p.waitForTimeout(1500); },
  6: async (p) => { await practice(p); await p.getByText('Ask for a hint', { exact: false }).click(); await p.waitForTimeout(3000); }, // AI hint
  7: async (p) => { await practice(p); await answerG1(p); await p.getByText('Skip', { exact: false }).click(); await p.waitForTimeout(1500); }, // progression/why-line
  8: async (p) => { await practice(p); await p.waitForTimeout(1500); },               // narrate transfer over studio
  9: async (p) => { await p.getByText('Evidence', { exact: true }).click(); await p.waitForTimeout(1500); await p.mouse.wheel(0, 400); await p.waitForTimeout(1200); },
  10: async (p) => { await p.getByText('Rationale', { exact: true }).click(); await p.waitForTimeout(2000); },
  11: async (p) => { await p.waitForTimeout(1500); },                                  // wrap on landing
};

for (const m of manifest) {
  await beat(m.id, m.seconds, actions[m.id] || (async (p) => { await p.waitForTimeout(1000); }));
}
await browser.close();
console.log('capture done');
