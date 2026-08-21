import { chromium } from 'playwright';
const B = 'http://localhost:3003';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 430, height: 1500 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(B, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.setItem('app-mode', 'iman'));
await p.goto(B, { waitUntil: 'networkidle' });
try { const pw = p.getByText('ПАРОЛЬ', { exact: false }).first(); if (await pw.isVisible({ timeout: 2500 })) await pw.click(); } catch {}
try { const i = p.locator('input[type=password], input[type=text]').first(); await i.fill('raketa2026', { timeout: 4000 }); await p.keyboard.press('Enter'); } catch {}
await p.waitForTimeout(4200);
await p.getByText('Суфлёр намаза', { exact: false }).first().click({ timeout: 8000 });
await p.waitForTimeout(2000);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Иша/.test(x.textContent) && /рак\./.test(x.textContent));
  b?.click();
});
await p.waitForTimeout(1500);
await p.evaluate(() => window.scrollTo(0, 620));
await p.waitForTimeout(800);
await p.screenshot({ path: '/tmp/pr2-isha.png' });
// выбрать витр и запустить
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /^\s*4?\s*Витр/.test(x.textContent) || /Витр/.test(x.textContent));
  b?.click();
});
await p.waitForTimeout(900);
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Начать намаз/.test(x.textContent));
  b?.click();
});
await p.waitForTimeout(3500);
await p.screenshot({ path: '/tmp/pr3-witr.png' });
await br.close();
console.log('done');
