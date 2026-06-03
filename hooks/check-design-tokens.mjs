#!/usr/bin/env node
/**
 * Designer OS — Hook: check-design-tokens
 *
 * Fires on PostToolUse (Write, Edit) for .tsx and .ts files.
 * Warns when hardcoded hex colors or raw rgb/hsl values are written
 * to component files outside of globals.css.
 *
 * Output format expected by Claude Code:
 *   { "additionalContext": "<message>" }  — warning (non-blocking)
 *   (no output) — all clear
 */

import { readFileSync } from "fs"
import { resolve, relative } from "path"

// ─── Read the tool input from stdin ───────────────────────────────────────────
let input = ""
process.stdin.on("data", (chunk) => (input += chunk))
process.stdin.on("end", () => {
  try {
    main(JSON.parse(input))
  } catch {
    // If we can't parse, do nothing — don't block the tool
  }
})

// ─── Exceptions ───────────────────────────────────────────────────────────────
const ALLOWED_FILES = [
  "globals.css",
  "tailwind.config.ts",
  "tailwind.config.js",
]

const ALLOWED_PATTERNS = [
  // Motion timing
  /\b0\.\d+s\b/,
  // Pure comments
  /^\s*\/\//,
  /^\s*\*/,
]

// ─── Detection patterns ───────────────────────────────────────────────────────
const CHECKS = [
  {
    pattern: /#[0-9a-fA-F]{3,6}\b/g,
    rule: "hardcoded-color",
    severity: "error",
    message: (match, file, line) =>
      `[design-tokens] Hardcoded color ${match} at ${file}:${line}. Use var(--color-*) or a semantic token instead.`,
  },
  {
    pattern: /\brgb\s*\(/g,
    rule: "raw-rgb",
    severity: "error",
    message: (match, file, line) =>
      `[design-tokens] Raw rgb() at ${file}:${line}. Use var(--color-*) instead.`,
  },
  {
    pattern: /\bhsl\s*\(/g,
    rule: "raw-hsl",
    severity: "error",
    message: (match, file, line) =>
      `[design-tokens] Raw hsl() at ${file}:${line}. Use var(--color-*) instead.`,
  },
  {
    pattern:
      /\b(text|bg|border|ring|fill|stroke)-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|violet|fuchsia|rose|sky|emerald|lime|amber)-\d{2,3}\b/g,
    rule: "tailwind-default-color",
    severity: "warning",
    message: (match, file, line) =>
      `[design-tokens] Default Tailwind color class "${match}" at ${file}:${line}. Use the project's mapped color tokens instead.`,
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
function main(toolInput) {
  // Only care about Write and Edit tools on .tsx/.ts files
  const toolName = toolInput?.tool_name || ""
  if (!["Write", "Edit"].includes(toolName)) return

  const filePath = toolInput?.tool_input?.file_path || ""
  if (!filePath.match(/\.(tsx?|jsx?)$/)) return

  // Skip allowed files
  const fileName = filePath.split("/").pop()
  if (ALLOWED_FILES.some((f) => fileName === f)) return

  // Skip docs and scripts
  if (filePath.includes("/docs/") || filePath.includes("/scripts/")) return

  // Read the file
  let content
  try {
    content = readFileSync(resolve(filePath), "utf8")
  } catch {
    return // Can't read — don't block
  }

  const lines = content.split("\n")
  const findings = []

  for (const check of CHECKS) {
    lines.forEach((line, idx) => {
      // Skip lines that are in allowed patterns (comments, etc.)
      if (ALLOWED_PATTERNS.some((p) => p.test(line))) return

      let match
      const regex = new RegExp(check.pattern.source, check.pattern.flags)
      while ((match = regex.exec(line)) !== null) {
        findings.push({
          rule: check.rule,
          severity: check.severity,
          text: check.message(match[0], relative(process.cwd(), filePath), idx + 1),
        })
      }
    })
  }

  if (findings.length === 0) return

  const errors = findings.filter((f) => f.severity === "error")
  const warnings = findings.filter((f) => f.severity === "warning")

  const lines_out = []
  if (errors.length > 0) {
    lines_out.push(`⚠️  Design token violations found (${errors.length} error${errors.length > 1 ? "s" : ""}, ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}):`)
  } else {
    lines_out.push(`💡 Design token suggestions (${warnings.length} warning${warnings.length !== 1 ? "s" : ""}):`)
  }

  for (const f of [...errors, ...warnings].slice(0, 10)) {
    lines_out.push(`  • ${f.text}`)
  }

  if (findings.length > 10) {
    lines_out.push(`  … and ${findings.length - 10} more. Run /agents code-scanner for the full list.`)
  }

  console.log(JSON.stringify({ additionalContext: lines_out.join("\n") }))
}
