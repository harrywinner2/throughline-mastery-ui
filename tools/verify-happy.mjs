import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1380,height:900}, deviceScaleFactor:2 });
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto(base,{waitUntil:'load'}); await page.waitForTimeout(1200);
await page.getByText('Begin a session',{exact:false}).first().click(); await page.waitForTimeout(600);
await page.getByText("I'm ready to practice",{exact:false}).click(); await page.waitForTimeout(600);
// g1 alternate-interior, given 58
await page.locator('input[placeholder="degrees…"]').first().fill('58');
await page.locator('.rule-chip', { hasText:'alternate interior' }).click();
await page.getByRole('button',{name:'Check'}).click();
await page.waitForTimeout(800);
const fb = await page.locator('.feedback').first().textContent();
console.log('HAPPY feedback:', (fb||'').slice(0,80));
console.log('class:', await page.locator('.feedback').first().getAttribute('class'));
await page.screenshot({ path:'design/app-studio-happy.png' });
console.log('ERRORS', errs.length);
await browser.close();
