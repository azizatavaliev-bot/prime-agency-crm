import { chromium } from 'playwright';
const B = 'http://localhost:3003';
const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 430, height: 1400 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(B, { waitUntil: 'domcontentloaded' });
await p.evaluate(() => localStorage.setItem('app-mode', 'tasks'));
await p.goto(B, { waitUntil: 'networkidle' });
try { const pw = p.getByText('ПАРОЛЬ', { exact: false }).first(); if (await pw.isVisible({ timeout: 2500 })) await pw.click(); } catch {}
try { const i = p.locator('input[type=password], input[type=text]').first(); await i.fill('raketa2026', { timeout: 4000 }); await p.keyboard.press('Enter'); } catch {}
await p.waitForTimeout(4200);
// найти вкладку "Шаги" в навбаре
const btns = p.locator('nav.bottom-nav button, nav button');
const n = await btns.count();
for (let i=0;i<n;i++){ const t = await btns.nth(i).innerText().catch(()=> ''); if (/шаг/i.test(t)) { await btns.nth(i).click(); break; } }
await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/ms0-page.png' });
// перейти на аналитику
const tabs = p.locator('button, [role=tab]');
const cnt = await tabs.count();
for (let i=0;i<cnt;i++){ const t = await tabs.nth(i).innerText().catch(()=> ''); if (/аналитик/i.test(t)) { await tabs.nth(i).click(); break; } }
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/ms1-analytics.png' });
// открыть вкладку "По шагам" и раскрыть первый шаг
await p.getByText('По шагам', { exact: false }).first().click({ timeout: 6000 }).catch(()=>{});
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/ms2-steps.png' });
await br.close();
console.log('done');
