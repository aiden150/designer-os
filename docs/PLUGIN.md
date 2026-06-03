# Plugin

> How Designer OS is wired into Claude Code.

---

## Plugin manifest

`plugin.json` is the entry point. It declares:

- **Skills** — invocable with `/skill <name>`
- **Agents** — invocable with `/agents <name>`
- **Hooks** — fire automatically on tool events
- **Permissions** — allow/deny rules for Bash and file operations

Claude Code reads this manifest at startup and registers all declared capabilities.

---

## Installation

```bash
# Clone into the Claude Code plugins directory
git clone https://github.com/aiden150/designer-os ~/.claude/plugins/designer-os

# Add to Claude Code settings
# ~/.claude/settings.json
{
  "plugins": ["designer-os"]
}
```

After restart, these become available:

```
/skill design-from-brand
/skill feature-build
/agents design-agent
/agents qa-orchestrator
/agents code-scanner
/agents token-auditor
/agents visual-diff
/agents a11y-checker
```

---

## Skill execution model

When you run `/skill design-from-brand my-brand.yml`, Claude Code:

1. Finds `skills/design-from-brand.md` in the plugin
2. Loads it as a system prompt addition for the current session
3. The skill's step-by-step instructions guide the agent's behavior

Skills are **methodology documents** — they describe a workflow, not imperative code. The agent reads them and follows the steps. This means skills are readable, editable, and debuggable without knowing any particular programming language.

---

## Agent execution model

When you run `/agents design-agent`, Claude Code:

1. Finds `agents/design-agent.md` in the plugin
2. Spawns a sub-agent with that file as its system prompt
3. The sub-agent has access to the same tools as the main session
4. The sub-agent runs until it produces a handoff report

Agents are **role definitions** — they describe who the agent is, what rules it follows, and what output format it produces.

---

## Hook execution model

Hooks fire on specific Claude Code tool events. The four hooks in this plugin:

| Hook | Event | Type |
|---|---|---|
| `check-design-tokens` | PostToolUse (Write, Edit) | Warning (non-blocking) |
| `check-spacing` | PostToolUse (Write, Edit) | Warning (non-blocking) |
| `check-completeness` | PostToolUse (Write) | Advisory (non-blocking) |
| `protect-files` | PreToolUse (Write, Edit, Delete) | Block (hard stop) |

**PostToolUse hooks** fire after the tool completes. They can add `additionalContext` to the agent's next turn — a warning message the agent sees and can act on.

**PreToolUse hooks** fire before the tool executes. They can `block` the action by returning `{ "decision": "block", "reason": "…" }`. The tool never runs.

Hooks are Node.js `.mjs` files that read tool input from stdin and write JSON to stdout.

---

## Permissions

The plugin declares permissions in `plugin.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(npx vercel *)"
    ],
    "deny": [
      "Read(.env*)",
      "Write(.env*)",
      "Write(package-lock.json)",
      "Write(*_generated.css)"
    ]
  }
}
```

These permissions are merged with the project's `.claude/settings.json` and the user's global settings. The most restrictive rule wins for deny rules.

---

## Per-project harness vs. plugin

The plugin lives in `~/.claude/plugins/designer-os/` — it's installed once, globally.

After `design-from-brand` runs, it installs a **per-project** copy of the QA harness into `.claude/` inside the scaffolded project. This means:

- The global plugin provides skills and agents for scaffolding.
- The project's `.claude/` provides agents and hooks for ongoing development.
- The project's harness can be customized (different token rules, additional hooks) without affecting the global plugin.

This separation lets you have multiple projects with different rule sets while sharing the same underlying framework.

---

## Updating the plugin

```bash
cd ~/.claude/plugins/designer-os
git pull
```

Existing projects are not automatically updated — their `.claude/` directory was installed at scaffold time. To update a project's harness, re-run the relevant phases of `design-from-brand` or manually copy updated files.

---

## File map

```
designer-os/
├── plugin.json              ← Claude Code manifest
├── README.md                ← Top-level pitch + quick start
│
├── schema/
│   ├── brand-book.schema.yml  ← JSON Schema (YAML format)
│   ├── brand-book.template.yml
│   └── brand-book.example.yml
│
├── skills/
│   ├── design-from-brand.md   ← Primary scaffold workflow
│   └── feature-build.md       ← Per-feature iteration workflow
│
├── agents/
│   ├── design-agent.md        ← Builds features
│   ├── qa-orchestrator.md     ← Coordinates QA
│   ├── code-scanner.md        ← Static token analysis
│   ├── token-auditor.md       ← Token consistency
│   ├── visual-diff.md         ← Screenshot regression
│   └── a11y-checker.md        ← Accessibility audit
│
├── hooks/
│   ├── check-design-tokens.mjs ← Warn on hardcoded colors
│   ├── check-spacing.mjs       ← Warn on raw px values
│   ├── check-completeness.mjs  ← Warn on missing tests/stories
│   └── protect-files.mjs       ← Block writes to sensitive files
│
├── templates/
│   └── docs/                  ← Handlebars templates for generated docs
│
└── docs/
    ├── GETTING-STARTED.md
    ├── WORKFLOW.md
    ├── ARCHITECTURE.md
    ├── PRINCIPLES.md
    ├── BRAND-INTAKE.md
    └── PLUGIN.md              ← you are here
```
