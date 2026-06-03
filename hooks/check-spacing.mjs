#!/usr/bin/env node
/**
 * Designer OS — Hook: check-spacing
 *
 * Fires on PostToolUse (Write, Edit) for .tsx and .ts files.
 * Warns when raw pixel values are written outside globals.css.
 */

import { readFileSync } from "fs"
import { resolve, relative } from "path"

let input = ""
process.stdin.on("data", (chunk) => (input += chunk))
process.stdin.on("end", () => {
  try {
    main(JSON.parse(input))
  } catch {}
})

const ALLOWED_FILES = [
  "globals.css",
  "tailwind.config.ts",
  "tailwind.config.js",
]

// Raw px is allowed in these contexts
const PX_EXCEPTIONS = [
  // Zero pixel
  /\b0px\b/,
  // Comments
  /^\s*\/\//,
  /^\s*\*/,
  // SVG attributes (strokeWidth, width, height as numbers are fine)
  /strokeWidth=/,
  // Playwright / test files
  /\.spec\./,
  /\.test\./,
]

function main(toolInput) {
  const toolName = toolInput?.tool_name || ""
  if (!["Write", "Edit"].includes(toolName)) return

  const filePath = toolInput?.tool_input?.file_path || ""
  if (!filePath.match(/\.(tsx?|jsx?)$/)) return

  const fileName = filePath.split("/").pop()
  if (ALLOWED_FILES.some((f) => fileName === f)) return
  if (filePath.includes("/docs/") || filePath.includes("/scripts/")) return

  let content
  try {
    content = readFileSync(resolve(filePath), "utf8")
  } catch {
    return
  }

  const lines = content.split("\n")
  const findings = []

  // Pattern: raw pixel value in inline styles or string literals
  // e.g. padding: "17px", gap: "24px", style={{ height: "200px" }}
  const PX_PATTERN = /:\s*["']?\d+px["']?/g

  lines.forEach((line, idx) => {
    if (PX_EXCEPTIONS.some((p) => p.test(line))) return

    let match
    const regex = new RegExp(PX_PATTERN.source, PX_PATTERN.flags)
    while ((match = regex.exec(line)) !== null) {
      // Skip "0px"
      if (match[0].includes("0px")) continue

      findings.push({
        line: idx + 1,
        text: match[0].trim(),
      })
    }
  })

  if (findings.length === 0) return

  const relPath = relative(process.cwd(), filePath)
  const lines_out = [
    `💡 [spacing] Raw pixel values found in ${relPath}. Use Tailwind spacing utilities instead:`,
  ]

  for (const f of findings.slice(0, 8)) {
    lines_out.push(
      `  • Line ${f.line}: ${f.text}  →  use p-4 / gap-6 / h-48 (Tailwind) or a CSS variable`
    )
  }

  if (findings.length > 8) {
    lines_out.push(`  … and ${findings.length - 8} more.`)
  }

  console.log(JSON.stringify({ additionalContext: lines_out.join("\n") }))
}
