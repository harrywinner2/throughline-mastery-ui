import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{width:1380,height:900}, deviceScaleFactor:2 });
const errs=[];
page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
page.on('pageerror', e=> errs.push('PAGEERROR: '+e.message));
await page.goto('file://'+process.cwd()+'/ui/mockup.html', { waitUntil:'load' });
await page.waitForTimeout(1200);
const views=['landing','learn','evidence','rationale'];
for(const v of views){
  await page.click(`.nav-link[data-view="${v}"]`);
  await page.waitForTimeout(700);
  await page.screenshot({ path:`design/mock-${v}.png` });
}
// check SVG handles exist
const handles = await page.$$eval('svg .handle', els=>els.length);
console.log('SVG handles rendered:', handles);
console.log('CONSOLE ERRORS:', errs.length, JSON.stringify(errs.slice(0,8)));
await browser.close();
