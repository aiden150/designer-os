# Skill: design-from-brand

**Invocation:** `/skill design-from-brand <path-to-brand-book.yml>`

---

## Purpose

Take a structured brand book YAML file, validate it against the schema, and scaffold a complete production design system — tokens, components, documentation, QA harness, and first deploy.

This skill is the entry point for the Designer OS. Run it once per brand. After that, use `feature-build` for all subsequent work.

---

## Prerequisites

Before running this skill, the user must have:

1. Filled in a brand book YAML (copy from `schema/brand-book.template.yml`)
2. Validated it locally: `npx ajv validate -s schema/brand-book.schema.yml -d my-brand.yml`
3. A Vercel account with `vercel` CLI installed and authenticated
4. Node.js 20+ and `git` available

---

## Step-by-step workflow

### Phase 0 — Parse and validate

1. Read the brand book YAML at the path provided.
2. Validate against `schema/brand-book.schema.yml`.
   - If required fields are missing, **halt immediately** and list every missing field with a clear error message. Do not proceed.
3. Extract all values into a working context object:
   ```
   {brand, palette, typography, voice, product, deploy, references}
   ```

---

### Phase 1 — Palette derivation

From `palette.primary` and `palette.deep`, generate full 11-stop scales.

**Primary scale** (`--primary-50` through `--primary-950`):
- Use the provided hex as the `500` stop.
- Lighter stops (50–400): progressively mix toward white (add ~8% lightness per step).
- Darker stops (600–950): progressively mix toward the `deep` color (add ~6% darkness per step).
- All stops must pass 4.5:1 contrast against white (light mode) OR against `--deep-900` (dark mode) for their intended usage tier. Check contrast for any stop used as text.

**Deep scale** (`--deep-50` through `--deep-950`):
- Use the provided hex as the `900` stop.
- Derive remaining stops by interpolating toward white (lighter) and pure black (darker).
- `deep-50` must be near-white (≥ 95% lightness).

**Gray scale** (`--gray-50` through `--gray-950`):
- If `palette.gray_tint` is `cool`: blend 4% of `--primary-500` hue into each stop.
- If `palette.gray_tint` is `warm`: blend 4% warm beige hue into each stop.
- If `palette.gray_tint` is `neutral`: pure HSL grays.

**Semantic status colors** — use `palette.success/warning/error/info` as provided (or defaults).

Output: a structured map of all CSS custom property values. This feeds Phase 2.

---

### Phase 2 — Token scaffolding (three layers)

Use the template at `templates/globals.css.hbs` as the structure. Fill in all `{{computed.*}}` placeholders with values from Phase 1.

The three layers written to `app/globals.css`:

**Layer 1 — Primitive scales** (`:root` block, top of file)

```css
/* ── Primary scale (11 stops, --primary-50 through --primary-950) ── */
--primary-50:  <computed>;   /* near-white tint */
…
--primary-500: <palette.primary>;   /* the brand hex as provided */
…
--primary-950: <computed>;   /* near-deep dark */

/* ── Deep scale (11 stops, --deep-50 through --deep-950) ── */
--deep-50:  <computed>;   /* near-white */
…
--deep-900: <palette.deep>;   /* the brand hex as provided */
--deep-950: <computed>;   /* near-black */

/* ── Gray scale (--gray-0 through --gray-950) ── */
--gray-0:   #ffffff;
--gray-50:  <computed>;   /* tinted per palette.gray_tint */
…
--gray-950: <computed>;

/* ── Status scales (50, 500, 700 for each) ── */
--success-50:  <computed>;
--success-500: <palette.success>;
--success-700: <computed>;
/* … same for warning, error, info … */

/* ── Typography ── */
--font-sans:    "<typography.body>", system-ui, -apple-system, sans-serif;
--font-display: "<typography.display>", system-ui, -apple-system, sans-serif;
--font-mono:    "<typography.mono>", ui-monospace, monospace;

/* Fluid type scale — values depend on typography.scale */
--type-display-xl: clamp(…);   /* hero */
--type-display:    clamp(…);   /* section hero */
--type-h1:         clamp(…);   /* page title */
--type-h2:         clamp(…);   /* section heading */
--type-h3:         clamp(…);   /* card title */
--type-h4:         1rem;
--type-body:       0.875rem;
--type-caption:    0.75rem;

/* Letter spacing (depends on typography.letter_spacing_headings) */
--tracking-display: <tight=-0.04em | default=-0.02em | loose=0em>;
--tracking-heading: <tight=-0.025em | default=-0.01em | loose=0.01em>;

/* Spacing, radius, shadow — always the same values */
--space-1: 4px; … --space-24: 96px;
--radius-none: 0px; … --radius-full: 9999px;
--shadow-xs: …; … --shadow-glow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 25%, transparent);
```

**Layer 2 — Semantic roles** (`:root` light + `.dark` overrides)

Naming convention matches the actual template exactly:

```css
/* Backgrounds */
--color-bg-default:     var(--gray-0);
--color-bg-subtle:      var(--gray-50);
--color-bg-ui:          var(--gray-100);
--color-bg-brand:       var(--primary-500);
--color-bg-brand-muted: var(--primary-50);

/* Text */
--color-text-primary:   var(--deep-900);
--color-text-secondary: var(--gray-600);
--color-text-muted:     var(--gray-500);
--color-text-disabled:  var(--gray-400);
--color-text-brand:     var(--primary-700);
--color-text-on-brand:  var(--gray-0);

/* Borders */
--color-border-muted:   var(--gray-100);
--color-border-default: var(--gray-200);
--color-border-strong:  var(--gray-300);
--color-border-brand:   var(--primary-500);

/* Interactive */
--color-interactive-primary:       var(--primary-600);
--color-interactive-primary-hover: var(--primary-700);
--color-interactive-primary-text:  var(--gray-0);

/* Status (bg, text, border for each: success, warning, error, info) */
--color-status-success-bg:     var(--success-50);
--color-status-success-text:   var(--success-700);
--color-status-success-border: color-mix(in srgb, var(--success-500) 30%, transparent);
/* … same pattern for warning, error, info … */
```

`.dark` block — override every semantic token. See `templates/globals.css.hbs` for all overrides.

**Layer 3 — Fluid typography utility classes** (at bottom of file)

```css
.text-display-xl { font-size: var(--type-display-xl); letter-spacing: var(--tracking-display); … }
.text-display    { font-size: var(--type-display);    letter-spacing: var(--tracking-display); … }
.text-h1         { font-size: var(--type-h1);         letter-spacing: var(--tracking-heading); … }
.text-h2         { font-size: var(--type-h2);         letter-spacing: var(--tracking-heading); … }
.text-h3         { font-size: var(--type-h3);         letter-spacing: var(--tracking-heading); … }
```

**Also write `tailwind.config.ts`** — extend theme with `colors.primary`, `colors.deep`, `colors.gray`, `fontFamily.sans`, `fontFamily.display`, `fontFamily.mono`.

---

### Phase 3 — Project scaffold

Initialize the Next.js project:

```bash
npx create-next-app@latest <brand.name.toLowerCase()>-app \
  --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd <brand.name.toLowerCase()>-app
npx shadcn@latest init --defaults
```

Install required packages:
```bash
npm install lucide-react @radix-ui/react-* class-variance-authority clsx tailwind-merge
npm install -D @playwright/test @axe-core/playwright pixelmatch pngjs
```

Set up Google Fonts (if `typography.body` or `typography.display` are Google Fonts):
- Add `<link>` to `app/layout.tsx` with the correct family and weights.
- Never use `next/font/google` wrappers — add the link tag directly.

Create core layout files:
- `app/layout.tsx` — wraps with font, sets `<html lang="en">`, dark mode class toggle
- `app/page.tsx` — marketing home (if `product.surfaces` includes `marketing`) or app shell
- `components/ui/` — Shadcn primitives (already added by init)
- `components/site/nav.tsx` — top navigation using `brand.name`, `brand.logo.mark`
- `components/site/footer.tsx` — footer with tagline

Create token viewer pages (required — the token-auditor checks for these):
- `app/tokens/primitive/page.tsx` — renders every `--primary-*`, `--deep-*`, `--gray-*` as a color swatch
- `app/tokens/semantic/page.tsx` — renders every `--color-*` grouped by category
- `app/tokens/mobile/page.tsx` — renders the mobile-specific scale (spacing, font-sizes for mobile)

Create the Shadcn component showcase:
- `app/components/page.tsx` — live showcase of Button (all variants), Badge, Input, Card, Table, Tabs, Switch

---

### Phase 4 — Surface scaffolding

Based on `product.surfaces`, scaffold route shells:

| Surface | Routes | Shell |
|---|---|---|
| `marketing` | `/`, `/pricing`, `/about` | Site shell (nav + footer) |
| `auth` | `/login`, `/signup`, `/forgot-password` | Auth shell (centered card) |
| `onboarding` | `/onboarding/[step]` | Onboarding shell (step indicator) |
| `product-app` | `/dashboard`, `/settings` | App shell (sidebar + main) |
| `admin` | `/admin` | App shell (admin sidebar) |
| `docs` | `/docs/[[...slug]]` | Docs shell (sidebar nav + content) |
| `blog` | `/blog`, `/blog/[slug]` | Site shell |
| `status-page` | `/status` | Site shell |

For each route in `product.key_routes`, add a page file with the correct shell wrapper and a `<h1>` matching `route.name`.

If `product.roles` is provided, create role-specific shells:
- Each role gets a `/portal/<role>` landing page.
- The app shell sidebar renders different nav items per role.

---

### Phase 5 — Documentation generation

Generate all 13 documentation files from the `templates/docs/` templates, substituting brand variables.

| Template | Output | Key variables substituted |
|---|---|---|
| `templates/docs/README.md.hbs` | `docs/README.md` | `brand.name`, `brand.tagline` |
| `templates/docs/PRINCIPLES.md.hbs` | `docs/PRINCIPLES.md` | `brand.name`, `product.type` |
| `templates/docs/DESIGN-SYSTEM.md.hbs` | `docs/DESIGN-SYSTEM.md` | token layer descriptions |
| `templates/docs/TOKENS-PRIMITIVE.md.hbs` | `docs/TOKENS-PRIMITIVE.md` | full primitive scale table |
| `templates/docs/TOKENS-SEMANTIC.md.hbs` | `docs/TOKENS-SEMANTIC.md` | semantic role table |
| `templates/docs/TOKENS-MOBILE.md.hbs` | `docs/TOKENS-MOBILE.md` | mobile scale table |
| `templates/docs/COMPONENTS.md.hbs` | `docs/COMPONENTS.md` | Shadcn rules |
| `templates/docs/UX-PATTERNS.md.hbs` | `docs/UX-PATTERNS.md` | shell descriptions, drawer patterns |
| `templates/docs/UX-FLOWS.md.hbs` | `docs/UX-FLOWS.md` | all routes from `product.key_routes` + defaults |
| `templates/docs/BUILD-PROCESS.md.hbs` | `docs/BUILD-PROCESS.md` | workflow steps |
| `templates/docs/DEPLOY.md.hbs` | `docs/DEPLOY.md` | Vercel project, domain |
| `templates/docs/QA.md.hbs` | `docs/QA.md` | pass criteria |
| `templates/docs/JOURNAL.md.hbs` | `docs/JOURNAL.md` | empty log with brand header |

Also generate:
- `AGENTS.md` — token rules + agent delegation (from `templates/AGENTS.md.hbs`)
- `CLAUDE.md` — `@AGENTS.md` import (one line)
- `CHANGELOG.md` — initial entry with scaffold date and brand name
- `README.md` — project root readme (from `templates/README.md.hbs`)

---

### Phase 6 — QA harness installation

Copy the harness files from the plugin into the project's `.claude/` directory:

```
.claude/
├── CLAUDE.md              ← QA process doc (from plugin docs/QA-PROCESS.md)
├── settings.json          ← hooks + permissions wiring
├── agents/
│   ├── design-agent.md
│   ├── qa-orchestrator.md
│   ├── code-scanner.md
│   ├── token-auditor.md
│   ├── visual-diff.md
│   └── a11y-checker.md
├── hooks/
│   ├── check-design-tokens.mjs
│   ├── check-spacing.mjs
│   ├── check-completeness.mjs
│   └── protect-files.mjs
└── skills/
    ├── visual-qa.md
    ├── token-audit.md
    └── accessibility-check.md
```

Generate `.claude/settings.json` wiring all four hooks to their events.

Generate `scripts/qa-screenshots.mjs` from `templates/scripts/qa-screenshots.mjs.hbs`, substituting all brand book variables. The generated script will have the correct routes from `product.surfaces` and `product.key_routes`.

Also copy `hooks/_visual-diff.mjs` and `hooks/_a11y-runner.mjs` from the plugin into `.claude/hooks/` in the project.

Copy `.github/workflows/design-qa.yml` from the plugin into the project.

---

### Phase 7 — First build and screenshot baseline

```bash
npm run build
```

If the build fails, **halt** and report the full error. Do not proceed to deploy.

```bash
node scripts/qa-screenshots.mjs
git add screenshots/
git commit -m "chore: initial screenshot baseline"
```

---

### Phase 8 — First deploy

```bash
npx vercel deploy --prod --yes
```

Report the live URL.

If `deploy.domain` is set:
```bash
npx vercel domains add <deploy.domain>
```

---

### Phase 9 — Handoff report

Print a structured handoff summary:

```
✅ Designer OS scaffold complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Brand:        <brand.name>
Live URL:     <vercel-url>
Project dir:  ./<brand.name.toLowerCase()>-app/

What was created:
  • 3-layer token system in app/globals.css
    ├── <N> primitive color stops
    ├── <N> semantic roles (light + dark)
    └── Fluid type scale (<typography.scale>)
  • <N> routes across <product.surfaces.length> surfaces
  • 13 documentation files in docs/
  • 6 Claude agents + 4 save-time hooks in .claude/
  • Screenshot baseline (<N> routes captured)
  • GitHub Action for design QA on PRs

Next steps:
  1. Run /agents qa-orchestrator   → full QA sweep
  2. Run /skill feature-build "<description>"  → add your first feature
  3. Check the live URL above — all token viewers should render correctly
```

---

## Error handling

| Failure | Action |
|---|---|
| Brand book missing required field | Halt immediately, list all missing fields |
| Brand book fails schema validation | Halt, show ajv error output |
| `palette.primary` fails contrast at 500 level | Warn, suggest shifting to a darker stop |
| `npm run build` fails | Halt, show full build error |
| Vercel deploy fails | Show error, suggest `vercel login` or project config fix |
| Google Font not found | Warn, fall back to `system-ui` |

---

## What this skill does NOT do

- ❌ Does not write business logic (forms, API calls, auth state)
- ❌ Does not generate content (real copy, images, data)
- ❌ Does not configure a database or backend
- ❌ Does not modify existing projects — run on a fresh folder only

For all of the above, use `feature-build` after the scaffold is complete.
