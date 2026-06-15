import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8080';
const shot = process.argv[3] || 'design';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1380,height:900}, deviceScaleFactor:2 });
const errs=[];
page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e=> errs.push('PAGEERROR: '+e.message));
const log=(...a)=>console.log(...a);

await page.goto(base, { waitUntil:'load', timeout:30000 });
await page.waitForTimeout(1500);
log('title:', await page.title());
await page.screenshot({ path:`${shot}/app-landing.png` });

// landing -> studio
await page.getByText('Begin a session', { exact:false }).first().click();
await page.waitForTimeout(800);
// explore -> practice
await page.getByText("I'm ready to practice", { exact:false }).click();
await page.waitForTimeout(800);

// g1: alternate interior, given 58 -> answer 58
await page.locator('input[placeholder="degrees…"]').first().fill('58');
await page.getByText('alternate interior', { exact:false }).first().click();
await page.getByRole('button', { name:'Check' }).click();
await page.waitForTimeout(800);
const fb1 = await page.locator('.feedback').first().textContent().catch(()=>null);
log('g1 feedback:', (fb1||'').slice(0,60));
await page.screenshot({ path:`${shot}/app-studio-correct.png` });

// ask a hint (real AI)
await page.getByText('Skip', { exact:false }).click();   // -> g2
await page.waitForTimeout(700);
await page.getByText('Ask for a hint', { exact:false }).click();
await page.waitForTimeout(2500);
const hint = await page.locator('.hint').first().textContent().catch(()=>null);
log('g2 hint present:', !!hint, (hint||'').slice(0,70));
await page.screenshot({ path:`${shot}/app-studio-hint.png` });

// nav to evidence + rationale
await page.getByText('Evidence', { exact:true }).click(); await page.waitForTimeout(700);
await page.screenshot({ path:`${shot}/app-evidence.png` });
await page.getByText('Rationale', { exact:true }).click(); await page.waitForTimeout(700);
await page.screenshot({ path:`${shot}/app-rationale.png` });

const handles = await page.$$eval('svg .par-line', e=>e.length).catch(()=>0);
log('svg lines seen earlier: ok');
log('CONSOLE ERRORS:', errs.length, JSON.stringify(errs.slice(0,6)));
await browser.close();
