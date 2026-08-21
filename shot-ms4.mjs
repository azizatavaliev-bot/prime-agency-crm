import { chromium } from 'playwright';
const B = 'http://localhost:3003';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 430, height: 1600 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(B, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.setItem('app-mode', 'tasks'));
await p.goto(B, { waitUntil: 'networkidle' });
try { const pw = p.getByText('ПАРОЛЬ', { exact: false }).first(); if (await pw.isVisible({ timeout: 2500 })) await pw.click(); } catch {}
try { const i = p.locator('input[type=password], input[type=text]').first(); await i.fill('raketa2026', { timeout: 4000 }); await p.keyboard.press('Enter'); } catch {}
await p.waitForTimeout(4200);
await p.locator('nav.bottom-nav button:has-text("Шаги")').first().click({ timeout: 8000 });
await p.waitForTimeout(2000);
await p.getByText('📊 Аналитика', { exact: false }).first().click({ timeout: 8000 });
await p.waitForTimeout(2000);
await p.getByText('По шагам', { exact: false }).first().click({ timeout: 6000 });
await p.waitForTimeout(1500);
await p.locator('text=Изучать религию').first().click({ timeout: 6000 });
await p.waitForTimeout(900);
await p.screenshot({ path: '/tmp/ms5-expanded.png' });
await br.close();
console.log('done');
