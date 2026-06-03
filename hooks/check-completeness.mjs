#!/usr/bin/env node
/**
 * Designer OS — Hook: check-completeness
 *
 * Fires on PostToolUse (Write) when a new component file is created.
 * Warns when a component in components/ is created without a sibling
 * story (.stories.tsx) or test (.test.tsx / .spec.tsx) file.
 *
 * This is advisory — it does not block saves.
 */

import { existsSync } from "fs"
import { resolve, dirname, basename, extname } from "path"

let input = ""
process.stdin.on("data", (chunk) => (input += chunk))
process.stdin.on("end", () => {
  try {
    main(JSON.parse(input))
  } catch {}
})

function main(toolInput) {
  // Only care about Write (new file creation), not Edit
  const toolName = toolInput?.tool_name || ""
  if (toolName !== "Write") return

  const filePath = toolInput?.tool_input?.file_path || ""

  // Only check files in components/ (not components/ui/ — those are Shadcn primitives)
  if (!filePath.includes("/components/")) return
  if (filePath.includes("/components/ui/")) return
  if (!filePath.match(/\.(tsx|ts)$/)) return

  const dir = dirname(filePath)
  const name = basename(filePath, extname(filePath))

  const storyPath = resolve(dir, `${name}.stories.tsx`)
  const testPath1 = resolve(dir, `${name}.test.tsx`)
  const testPath2 = resolve(dir, `${name}.spec.tsx`)
  const testPath3 = resolve(dir, `__tests__/${name}.test.tsx`)

  const hasStory = existsSync(storyPath)
  const hasTest = existsSync(testPath1) || existsSync(testPath2) || existsSync(testPath3)

  if (hasStory && hasTest) return

  const missing = []
  if (!hasStory) missing.push(`${name}.stories.tsx`)
  if (!hasTest) missing.push(`${name}.test.tsx`)

  const msg = [
    `💡 [completeness] New component ${basename(filePath)} has no ${missing.join(" or ")}.`,
    `  Consider adding tests or stories to make this component verifiable by the QA harness.`,
    `  (This is advisory — not blocking.)`,
  ].join("\n")

  console.log(JSON.stringify({ additionalContext: msg }))
}
