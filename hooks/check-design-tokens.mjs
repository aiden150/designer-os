#!/usr/bin/env node
/**
 * check-design-tokens — PostToolUse hook
 *
 * Fires after Write/Edit on .tsx/.ts/.css files.
 * Scans the saved file for:
 *   - Raw hex colors (#abc, #aabbcc, #aabbccdd)
 *   - rgb()/rgba()/hsl()/hsla() literals
 *   - Tailwind arbitrary color values (bg-[#…], text-[#…])
 *   - Tailwind default color utilities (bg-blue-500, text-red-600, …) outside our scales
 *
 * Honors the exceptions list in /AGENTS.md.
 *
 * Input  (stdin JSON): { tool_input: { file_path: "..." }, ... }
 * Output (stdout JSON): { additionalContext?: "..." }  on warning, empty on pass
 */

import { readFileSync } from "node:fs";
import path from "node:path";

// ──────────────── Read stdin ────────────────
const stdin = readFileSync(0, "utf8");
let payload;
try { payload = JSON.parse(stdin); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path;
if (!filePath) process.exit(0);

const abs = path.resolve(filePath);

// ──────────────── Scope check ────────────────
const EXEMPT_DIRS = ["node_modules", ".next", "screenshots", "public", "scripts", "docs", ".claude", ".github"];
const EXEMPT_FILES = [
  "globals.css",
  "tailwind.config.ts",
  "tailwind.config.js",
];

if (EXEMPT_DIRS.some((d) => abs.includes(`/${d}/`))) process.exit(0);
if (EXEMPT_FILES.some((f) => abs.endsWith(`/${f}`))) process.exit(0);

const ext = path.extname(abs).toLowerCase();
if (![".tsx", ".ts", ".jsx", ".js", ".css"].includes(ext)) process.exit(0);

// ──────────────── Read file ────────────────
let src;
try { src = readFileSync(abs, "utf8"); } catch { process.exit(0); }

const lines = src.split("\n");
const findings = [];

// ──────────────── Patterns ────────────────
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RGB = /\b(rgba?|hsla?)\s*\(/g;
const TW_ARB_COLOR = /(?:bg|text|border|fill|stroke|ring|shadow|from|via|to|outline|accent|caret|decoration|divide|placeholder)-\[#[0-9a-fA-F]{3,8}(?:\/[0-9.]+)?\]/g;
// Tailwind default palettes we never use directly:
const TW_DEFAULT = /\b(?:bg|text|border|fill|stroke|ring|from|via|to|outline|accent|divide|placeholder)-(?:slate|zinc|neutral|stone|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;
// Note: the project may have its own primitive scales (--primary-*, --gray-*, etc.).
// We flag Tailwind's default palette utilities — use var(--color-*) semantic tokens instead.

// ──────────────── Line filters ────────────────
function isInComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}
function isInStringContent(line, idx) {
  // crude: if the match is inside a quoted URL or content string, skip
  const slice = line.slice(0, idx);
  const quoteCount = (slice.match(/(?<!\\)["'`]/g) || []).length;
  return quoteCount % 2 === 1 && /https?:\/\/|data:image|^[^"']*alt=/.test(line);
}

// ──────────────── Scan ────────────────
lines.forEach((line, i) => {
  if (isInComment(line)) return;

  // Hex
  let m;
  HEX.lastIndex = 0;
  while ((m = HEX.exec(line)) !== null) {
    if (isInStringContent(line, m.index)) continue;
    findings.push({
      line: i + 1,
      rule: "no-hardcoded-color",
      matched: m[0],
      suggest: "Use var(--color-*) (semantic) or var(--primary-*|deep-*|gray-*) primitive token",
    });
  }

  // rgb/hsl
  RGB.lastIndex = 0;
  while ((m = RGB.exec(line)) !== null) {
    if (isInStringContent(line, m.index)) continue;
    findings.push({
      line: i + 1,
      rule: "no-hardcoded-color",
      matched: line.slice(m.index, Math.min(line.length, m.index + 40)),
      suggest: "Replace with a CSS variable (semantic or primitive token)",
    });
  }

  // Arbitrary Tailwind color
  TW_ARB_COLOR.lastIndex = 0;
  while ((m = TW_ARB_COLOR.exec(line)) !== null) {
    findings.push({
      line: i + 1,
      rule: "no-arbitrary-tailwind-color",
      matched: m[0],
      suggest: "Use bg-[var(--color-bg-*)] or a semantic utility class",
    });
  }

  // Tailwind default palettes (non-Mentix)
  TW_DEFAULT.lastIndex = 0;
  while ((m = TW_DEFAULT.exec(line)) !== null) {
    findings.push({
      line: i + 1,
      rule: "no-tailwind-default-color",
      matched: m[0],
      suggest: "This project uses custom primitive scales. Use var(--color-*) semantic tokens instead.",
    });
  }
});

// ──────────────── Output ────────────────
if (findings.length === 0) process.exit(0);

const rel = path.relative(process.cwd(), abs);
const summary = `[design-tokens] ${findings.length} potential violation${findings.length > 1 ? "s" : ""} in ${rel}:\n` +
  findings.slice(0, 5).map((f) => `  L${f.line}  ${f.rule}: \`${f.matched}\` → ${f.suggest}`).join("\n") +
  (findings.length > 5 ? `\n  …and ${findings.length - 5} more` : "");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: summary,
  },
}));
process.exit(0);
