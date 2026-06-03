#!/usr/bin/env node
/**
 * check-spacing — PostToolUse hook
 *
 * Fires after Write/Edit on .tsx/.ts files.
 * Scans for:
 *   - Tailwind arbitrary spacing (p-[17px], m-[23px], gap-[10px], w-[123px], top-[7px], etc.)
 *   - Inline style with raw px values (padding: "17px", margin: "23px")
 *
 * Skips legitimate cases (aspect ratios, z-index, etc.).
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const stdin = readFileSync(0, "utf8");
let payload;
try { payload = JSON.parse(stdin); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path;
if (!filePath) process.exit(0);

const abs = path.resolve(filePath);

const EXEMPT_DIRS = ["node_modules", ".next", "screenshots", "public", "scripts", "docs", ".claude", ".github"];
const EXEMPT_FILES = ["globals.css"];

if (EXEMPT_DIRS.some((d) => abs.includes(`/${d}/`))) process.exit(0);
if (EXEMPT_FILES.some((f) => abs.endsWith(`/${f}`))) process.exit(0);

const ext = path.extname(abs).toLowerCase();
if (![".tsx", ".ts", ".jsx", ".js"].includes(ext)) process.exit(0);

let src;
try { src = readFileSync(abs, "utf8"); } catch { process.exit(0); }

const lines = src.split("\n");
const findings = [];

// Tailwind arbitrary spacing utilities
const TW_ARB_SPACE = /\b(p|pt|pr|pb|pl|px|py|m|mt|mr|mb|ml|mx|my|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h|top|right|bottom|left|inset|space-x|space-y|translate-x|translate-y)-\[(\d+(?:\.\d+)?)(px|rem|em)\]/g;

// Inline style with raw px (padding, margin, width, height, gap, top, …)
const INLINE_PX = /(padding|margin|width|height|gap|top|right|bottom|left|borderRadius|fontSize|lineHeight|columnGap|rowGap)\s*:\s*["']?(\d+(?:\.\d+)?)px["']?/g;

function isInComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

lines.forEach((line, i) => {
  if (isInComment(line)) return;

  let m;
  TW_ARB_SPACE.lastIndex = 0;
  while ((m = TW_ARB_SPACE.exec(line)) !== null) {
    findings.push({
      line: i + 1,
      rule: "no-arbitrary-tailwind-spacing",
      matched: m[0],
      suggest: `Use the Tailwind scale (${m[1]}-1 through ${m[1]}-32) instead of arbitrary ${m[2]}${m[3]}`,
    });
  }

  INLINE_PX.lastIndex = 0;
  while ((m = INLINE_PX.exec(line)) !== null) {
    // Skip 0px (always fine) and 1px (commonly intentional for borders/dividers)
    if (m[2] === "0" || m[2] === "1") continue;
    findings.push({
      line: i + 1,
      rule: "no-inline-px-spacing",
      matched: `${m[1]}: ${m[2]}px`,
      suggest: `Use a Tailwind class (e.g., p-4, gap-3) instead of inline ${m[2]}px`,
    });
  }
});

if (findings.length === 0) process.exit(0);

const rel = path.relative(process.cwd(), abs);
const summary = `[spacing] ${findings.length} hardcoded spacing value${findings.length > 1 ? "s" : ""} in ${rel}:\n` +
  findings.slice(0, 5).map((f) => `  L${f.line}  ${f.rule}: \`${f.matched}\` → ${f.suggest}`).join("\n") +
  (findings.length > 5 ? `\n  …and ${findings.length - 5} more` : "");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: summary,
  },
}));
process.exit(0);
