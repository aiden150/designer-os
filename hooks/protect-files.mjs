#!/usr/bin/env node
/**
 * protect-files — PreToolUse hook
 *
 * Blocks Write/Edit on protected files:
 *   - .env, .env.*  (secrets)
 *   - package-lock.json, yarn.lock, pnpm-lock.yaml  (lockfiles — managed by package manager)
 *   - *_generated.css  (build output)
 *   - .vercel/**, node_modules/**, .next/**  (tool-managed)
 *
 * Outputs `permissionDecision: "deny"` to block, with explanation.
 * Read access is NOT blocked (handled by settings.json deny list separately).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const stdin = readFileSync(0, "utf8");
let payload;
try { payload = JSON.parse(stdin); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path;
if (!filePath) process.exit(0);

const abs = path.resolve(filePath);
const base = path.basename(abs);
const rel = path.relative(process.cwd(), abs);

// ──────────────── Patterns ────────────────
const BLOCKED = [
  { match: /(^|\/)\.env(\..*)?$/, reason: "Environment file — contains secrets. Edit via your password manager or .env.local (untracked)." },
  { match: /(^|\/)package-lock\.json$/, reason: "Lockfile — managed by npm. Run `npm install` instead of editing directly." },
  { match: /(^|\/)yarn\.lock$/, reason: "Lockfile — managed by yarn. Run `yarn install` instead of editing directly." },
  { match: /(^|\/)pnpm-lock\.yaml$/, reason: "Lockfile — managed by pnpm. Run `pnpm install` instead of editing directly." },
  { match: /_generated\.css$/, reason: "Generated CSS — produced by the build. Edit the source it's generated from instead." },
  { match: /(^|\/)\.vercel\//, reason: ".vercel/ is managed by Vercel CLI." },
  { match: /(^|\/)node_modules\//, reason: "node_modules/ is managed by your package manager." },
  { match: /(^|\/)\.next\//, reason: ".next/ is Next.js build output." },
];

const hit = BLOCKED.find(({ match }) => match.test(abs) || match.test(rel) || match.test(base));

if (!hit) process.exit(0);

// Block with explanation
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: `[protect-files] ${rel} is a protected file. ${hit.reason}`,
  },
}));
process.exit(0);
