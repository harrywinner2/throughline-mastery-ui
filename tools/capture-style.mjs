import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.argv[2] || 'https://nerdy.com/';
const OUT = 'design';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function grab(url, name) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    const tokens = await page.evaluate(() => {
      const seen = {};
      const colorCount = {};
      const fonts = new Set();
      const radii = new Set();
      const shadows = new Set();
      const els = Array.from(document.querySelectorAll('body *')).slice(0, 4000);
      for (const el of els) {
        const cs = getComputedStyle(el);
        fonts.add(cs.fontFamily);
        [cs.color, cs.backgroundColor, cs.borderColor].forEach(c => {
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') colorCount[c] = (colorCount[c]||0)+1;
        });
        if (cs.borderRadius && cs.borderRadius !== '0px') radii.add(cs.borderRadius);
        if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
      }
      const topColors = Object.entries(colorCount).sort((a,b)=>b[1]-a[1]).slice(0,18);
      // sample headings & buttons
      const sample = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const cs = getComputedStyle(e);
        return { font: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, color: cs.color, bg: cs.backgroundColor, radius: cs.borderRadius, padding: cs.padding };
      };
      return {
        title: document.title,
        h1: sample('h1'), h2: sample('h2'),
        button: sample('button') || sample('a[class*=btn]') || sample('[class*=button]'),
        body: sample('body'),
        topColors, fonts: Array.from(fonts).slice(0,12), radii: Array.from(radii).slice(0,12), shadows: Array.from(shadows).slice(0,8)
      };
    });
    return tokens;
  } catch (e) {
    return { error: String(e) };
  }
}

const home = await grab(URL, 'home');
fs.writeFileSync(`${OUT}/tokens.json`, JSON.stringify({ url: URL, home }, null, 2));
console.log('CAPTURED', JSON.stringify(home).slice(0, 400));
await browser.close();
