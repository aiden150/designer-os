#!/usr/bin/env node
/**
 * _a11y-runner.mjs — helper for a11y-checker agent (NOT a hook)
 *
 * Runs axe-core via Playwright against a list of routes.
 * Outputs raw axe results as JSON to stdout.
 *
 * Usage:
 *   BASE=http://localhost:3000 node .claude/hooks/_a11y-runner.mjs
 *   BASE=https://mentix-design.vercel.app node .claude/hooks/_a11y-runner.mjs
 */

const BASE = process.env.BASE || "http://localhost:3000";

const ROUTES = [
  "/marketing",
  "/login", "/signup", "/mfa",
  "/onboarding?role=trainee",
  "/onboarding/profile?role=trainee",
  "/portal/trainee", "/portal/trainee/sessions", "/portal/trainee/credits", "/portal/trainee/settings",
  "/portal/mentor", "/portal/mentor/requests/req-001",
  "/portal/sponsor", "/portal/sponsor/billing",
  "/admin/onboarding", "/admin/incidents", "/admin/analytics", "/admin/settings",
  "/portal/tv", "/portal/tv/tv-001",
  "/this-route-does-not-exist",
  "/tokens/primitive", "/tokens/semantic", "/tokens/mobile",
  "/components", "/sitemap-page",
];

let chromium, AxeBuilder;
try {
  ({ chromium } = await import("playwright"));
} catch (err) {
  console.error(JSON.stringify({ error: "playwright not installed", detail: err.message }));
  process.exit(1);
}
try {
  AxeBuilder = (await import("@axe-core/playwright")).default;
} catch (err) {
  console.error(JSON.stringify({ error: "@axe-core/playwright not installed", detail: err.message, hint: "Run: npm i -D @axe-core/playwright" }));
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const results = [];
const startedAt = Date.now();

for (const route of ROUTES) {
  const url = `${BASE}${route}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(800);
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    results.push({
      route,
      url,
      ok: true,
      violations: axeResults.violations,
      incomplete: axeResults.incomplete,
      passes: axeResults.passes.length,
    });
  } catch (err) {
    results.push({ route, url, ok: false, error: err.message });
  }
}

await browser.close();

process.stdout.write(JSON.stringify({
  base: BASE,
  routes: ROUTES.length,
  duration_ms: Date.now() - startedAt,
  results,
}, null, 2));
