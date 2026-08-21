import { chromium } from 'playwright';
const B = 'http://localhost:3003';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2, permissions: [] });
const p = await ctx.newPage();
await p.goto(B, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.setItem('app-mode', 'tasks'));
await p.goto(B, { waitUntil: 'networkidle' });
try { const pw = p.getByText('ПАРОЛЬ', { exact: false }).first(); if (await pw.isVisible({ timeout: 2500 })) await pw.click(); } catch {}
try { const i = p.locator('input[type=password], input[type=text]').first(); await i.fill('raketa2026', { timeout: 4000 }); await p.keyboard.press('Enter'); } catch {}
await p.waitForTimeout(4200);
console.log('logged in, looking for steps page');
await br.close();
