# Workflow

> The exact order in which Designer OS executes, from brand book input to live URL.

---

## Overview

```
Brand book YAML
      │
      ▼
┌─────────────────────────────────────────────────┐
│ design-from-brand skill                         │
│                                                 │
│  Phase 0:  Parse + validate                     │
│  Phase 1:  Palette derivation                   │
│  Phase 2:  Token scaffolding (globals.css)       │
│  Phase 3:  Project scaffold (Next.js + Shadcn)  │
│  Phase 4:  Surface scaffolding                  │
│  Phase 5:  Documentation generation (13 files)  │
│  Phase 6:  QA harness installation              │
│  Phase 7:  Build + screenshot baseline          │
│  Phase 8:  First deploy                         │
│  Phase 9:  Handoff report                       │
└─────────────────────────────────────────────────┘
      │
      ▼
Production codebase
      │
      ▼ (per feature)
┌─────────────────────────────────────────────────┐
│ feature-build skill + design-agent              │
│                                                 │
│  1. Read design rules (AGENTS.md, docs/)        │
│  2. Build feature                               │
│  3. Self-audit (30 items)                       │
│  4. tsc --noEmit                                │
│  5. npm run build                               │
│  6. Deploy                                      │
│  7. Update docs (UX-FLOWS, TOKENS, CHANGELOG)   │
└─────────────────────────────────────────────────┘
      │
      ▼ (before major deploys)
┌─────────────────────────────────────────────────┐
│ qa-orchestrator                                 │
│                                                 │
│  Phase 1:  code-scanner + token-auditor (║║)    │
│  Phase 2:  Build gate                           │
│  Phase 3:  visual-diff + a11y-checker (║║)      │
│  Aggregate → JSON report + Markdown summary     │
└─────────────────────────────────────────────────┘
```

---

## Phase 0 — Parse and validate

**Input:** YAML file path  
**Output:** Validated context object or halt with errors

The skill reads the YAML file and validates it against `schema/brand-book.schema.yml` using AJV (Another JSON Validator).

**Halt conditions:**
- File not found
- YAML parse error
- Any required field missing
- `palette.primary` or `palette.deep` not a valid 6-digit hex

The validation error message lists every failing field — you don't have to guess.

---

## Phase 1 — Palette derivation

**Input:** `palette.primary` (hex), `palette.deep` (hex), `palette.gray_tint`  
**Output:** Full CSS custom property value map

### Primary scale derivation

The primary color becomes `--primary-500`. The agent derives the rest:

```
--primary-50    →  mix primary + white, 95% white
--primary-100   →  mix primary + white, 88% white
--primary-200   →  mix primary + white, 76% white
--primary-300   →  mix primary + white, 60% white
--primary-400   →  mix primary + white, 30% white
--primary-500   →  the color as provided
--primary-600   →  mix primary + deep, 15% deep
--primary-700   →  mix primary + deep, 30% deep
--primary-800   →  mix primary + deep, 50% deep
--primary-900   →  mix primary + deep, 68% deep
--primary-950   →  mix primary + deep, 82% deep
```

All mixing is done in HSL space to preserve perceptual linearity.

### Deep scale derivation

The deep color becomes `--deep-900`. Lighter stops interpolate toward white; `deep-950` pushes toward black.

### Contrast check

Every stop used as text must pass WCAG AA:
- Body text: 4.5:1 against its background
- UI text / large text: 3:1

If `primary-500` fails 3:1 on white, the skill warns and recommends using `primary-600` for interactive text.

---

## Phase 2 — Token scaffolding

**Input:** Derived color map, typography settings  
**Output:** `app/globals.css`, `tailwind.config.ts`

Three layers, written in order:

1. **Primitive layer** — raw scale values. Never referenced by components directly.
2. **Semantic layer** — role-based bindings (light + dark). This is what components use.
3. **Typography layer** — font family variables + fluid type scale.

See `docs/DESIGN-SYSTEM.md` for the full architecture.

---

## Phase 3 — Project scaffold

**Input:** Brand context  
**Output:** Next.js 16 project with Shadcn UI, configured for the brand

Steps:
1. `create-next-app` with TypeScript + Tailwind + App Router
2. `shadcn init --defaults` to install all Shadcn primitives
3. Install supporting packages (lucide-react, class-variance-authority, etc.)
4. Configure Google Fonts (link tag in `layout.tsx`)
5. Create token viewer pages
6. Create Shadcn showcase page
7. Create brand-specific nav and footer

---

## Phase 4 — Surface scaffolding

**Input:** `product.surfaces`, `product.roles`, `product.key_routes`  
**Output:** Route files + shell components

Each surface gets a shell wrapper component and a set of default routes. Key routes from the brand book get their own page files with the correct shell applied.

---

## Phase 5 — Documentation generation

**Input:** Brand context + Handlebars templates  
**Output:** 13 files in `docs/` + root-level `AGENTS.md`, `CHANGELOG.md`, `README.md`

All documentation is generated from templates in `templates/docs/`. Every brand-specific detail (colors, font names, audience descriptions, tone words) is substituted at generation time.

**Why generate docs?** The design-agent reads these docs before building features. If the docs describe your brand correctly, the agent makes better decisions. The token tables in `TOKENS-*.md` are especially critical — the `token-auditor` cross-references them against `globals.css`.

---

## Phase 6 — QA harness installation

**Input:** Plugin's agents, hooks, and skills directories  
**Output:** `.claude/` directory in the project

The QA harness is installed from the plugin. The `design-agent` and all 5 QA agents are copied into `.claude/agents/`. The 4 hooks are copied into `.claude/hooks/`. A `settings.json` wires everything together.

This means the QA harness is **per-project**, not global. Different projects can have different rule sets (though the defaults are the same).

---

## Phase 7 — Build + screenshot baseline

**Input:** Completed project  
**Output:** Passing build, committed screenshots

```bash
npm run build           # Must pass — halts if it fails
node scripts/qa-screenshots.mjs  # Playwright captures each route
git add screenshots/
git commit -m "chore: initial screenshot baseline"
```

The screenshot baseline is the reference point for all future visual diffs. Without it, `visual-diff` has nothing to compare against.

---

## Phase 8 — First deploy

```bash
npx vercel deploy --prod --yes
```

If `deploy.vercel_project` is set in the brand book, the project is linked automatically.

---

## Phase 9 — Handoff report

The skill prints a summary of everything created, with the live URL. The project is ready for feature work.

---

## After the scaffold: the feature loop

Every new feature follows the same loop:

```
Request
  → feature-build skill
    → design-agent reads rules
    → design-agent builds
    → design-agent self-audits (30 items)
    → tsc + build
    → deploy
    → docs updated
  → live URL reported
```

Run `qa-orchestrator` periodically (or on every PR via the GitHub Action) to catch drift.
