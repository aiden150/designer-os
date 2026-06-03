#!/usr/bin/env node
/**
 * Designer OS — Hook: protect-files
 *
 * Fires on PreToolUse (Write, Edit, Delete).
 * HARD BLOCKS writes to sensitive or generated files.
 *
 * Output format for blocking:
 *   { "decision": "block", "reason": "<message>" }
 *
 * Output for allowing:
 *   (no output / exit 0)
 */

let input = ""
process.stdin.on("data", (chunk) => (input += chunk))
process.stdin.on("end", () => {
  try {
    main(JSON.parse(input))
  } catch {
    // Parse failure — don't block
    process.exit(0)
  }
})

const BLOCKED_PATTERNS = [
  {
    pattern: /\.env(\.[a-z]+)?$/,
    reason:
      "[protect-files] Writes to .env files are blocked. Environment secrets must be managed via the Vercel dashboard or your secrets manager — never committed to the repo.",
  },
  {
    pattern: /package-lock\.json$/,
    reason:
      "[protect-files] Writes to package-lock.json are blocked. This file is managed by npm automatically. Run 'npm install' to update it.",
  },
  {
    pattern: /_generated\.css$/,
    reason:
      "[protect-files] Writes to generated CSS files are blocked. These are build artifacts — edit the source tokens in globals.css instead.",
  },
  {
    pattern: /node_modules\//,
    reason:
      "[protect-files] Writes inside node_modules/ are blocked. Install packages via npm instead.",
  },
  {
    pattern: /\.next\//,
    reason:
      "[protect-files] Writes inside .next/ are blocked. This is a build output directory — it is regenerated on every build.",
  },
]

function main(toolInput) {
  const toolName = toolInput?.tool_name || ""
  if (!["Write", "Edit", "Delete"].includes(toolName)) return

  const filePath =
    toolInput?.tool_input?.file_path ||
    toolInput?.tool_input?.path ||
    ""

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(filePath)) {
      console.log(JSON.stringify({ decision: "block", reason }))
      process.exit(0)
    }
  }

  // Allow
  process.exit(0)
}
