#!/usr/bin/env node
/**
 * check-completeness — PostToolUse hook
 *
 * Fires after Write/Edit on a component file in components/**.
 * Warns (does NOT block) if a sibling .stories.tsx or .test.tsx is missing,
 * but ONLY if at least one other component in the same folder already has a story or test.
 *
 * This is a progressive adoption check — it doesn't demand stories/tests everywhere,
 * just keeps a folder consistent once the convention starts.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const stdin = readFileSync(0, "utf8");
let payload;
try { payload = JSON.parse(stdin); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path;
if (!filePath) process.exit(0);

const abs = path.resolve(filePath);

// Only check components/**/*.tsx (skip ui/ Shadcn primitives — they're third-party)
if (!abs.includes("/components/")) process.exit(0);
if (abs.includes("/components/ui/")) process.exit(0);
if (!abs.endsWith(".tsx")) process.exit(0);

// Skip stories and tests themselves
const base = path.basename(abs);
if (base.endsWith(".stories.tsx") || base.endsWith(".test.tsx") || base.endsWith(".spec.tsx")) {
  process.exit(0);
}

const dir = path.dirname(abs);
const stem = base.replace(/\.tsx$/, "");

// Check if THIS component already has a story / test
const hasOwnStory = existsSync(path.join(dir, `${stem}.stories.tsx`));
const hasOwnTest  = existsSync(path.join(dir, `${stem}.test.tsx`)) || existsSync(path.join(dir, `${stem}.spec.tsx`));

if (hasOwnStory && hasOwnTest) process.exit(0);

// Check if ANY component in this folder has a story or test (progressive adoption)
let folderHasStories = false;
let folderHasTests = false;
try {
  const entries = readdirSync(dir);
  folderHasStories = entries.some((f) => f.endsWith(".stories.tsx"));
  folderHasTests   = entries.some((f) => f.endsWith(".test.tsx") || f.endsWith(".spec.tsx"));
} catch {
  process.exit(0);
}

// Only warn if folder convention exists for the missing artifact
const missing = [];
if (folderHasStories && !hasOwnStory) missing.push(`${stem}.stories.tsx`);
if (folderHasTests   && !hasOwnTest)  missing.push(`${stem}.test.tsx`);

if (missing.length === 0) process.exit(0);

const rel = path.relative(process.cwd(), abs);
const summary = `[completeness] ${rel} is missing sibling artifact${missing.length > 1 ? "s" : ""} ` +
  `(other components in this folder have ${folderHasStories ? "stories" : ""}${folderHasStories && folderHasTests ? " + " : ""}${folderHasTests ? "tests" : ""}):\n` +
  missing.map((m) => `  - ${m}`).join("\n");

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: summary,
  },
}));
process.exit(0);
