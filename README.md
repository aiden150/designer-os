# Designer OS

> A Claude Code plugin that turns a brand book into a production design system.

You upload a brand book. The plugin reads it, derives a three-layer token system, scaffolds a Next.js + Shadcn UI project, installs an inspect-only QA harness, and writes thirteen documentation files — all using your brand identity, not someone else's defaults.

It's the operating system Mentix was built on, packaged for anyone.

---

## What you get

```
Your brand book          →    A production codebase
─────────────────             ─────────────────────────
brand-book.yml                Next.js 16 + Shadcn + Tailwind v4
   ↓                              ├── Three-layer design tokens
   ↓                              ├── Marketing site (live preview embed)
   ↓                              ├── Product app shell
   ↓                              ├── Auth + onboarding flows
   ↓                              ├── 13 documentation files
   ↓                              ├── 5 QA agents + 4 save-time hooks
   ↓                              ├── Playwright screenshot baseline
   ↓                              └── GitHub Action for design QA
```

---

## What's inside this repo

| Folder | What it is |
|---|---|
| `schema/` | The structured brand book format (YAML, with JSON Schema validation) |
| `skills/` | Claude Code skills — methodology the agent follows |
| `agents/` | Claude Code agents — design-agent + 5 QA agents |
| `hooks/` | Pre/post-save hooks (Node.js, cross-platform) |
| `templates/` | Handlebars templates for `globals.css`, `docs/*`, project files |
| `docs/` | How this plugin works, principles, architecture, workflow |
| `.github/workflows/` | CI template for design QA on PRs |
| `plugin.json` | Claude Code plugin manifest |

---

## Quick start

### 1 · Install the plugin

```bash
# In your Claude Code config:
mkdir -p ~/.claude/plugins
git clone https://github.com/aiden150/designer-os ~/.claude/plugins/designer-os
```

Then add to your Claude Code settings:

```json
{
  "plugins": ["designer-os"]
}
```

### 2 · Fill in your brand book

Copy the template:

```bash
cp ~/.claude/plugins/designer-os/schema/brand-book.template.yml my-brand.yml
```

Edit `my-brand.yml`:

```yaml
brand:
  name: "Acme"
  tagline: "The fastest way to ship X."
  description: "Acme helps teams do Y, faster."

palette:
  primary:   "#7C3AED"   # brand accent color
  deep:      "#1E1B4B"   # dark backgrounds, headings
  # ...auto-derives 11-stop scales

typography:
  body:    "Inter"
  display: "Inter"        # or pair: { display: "Georgia", body: "Inter" }

voice:
  audience: "Institutional buyers"
  tone:     ["confident", "technical", "calm"]
  forbid:   ["hype", "exclamation points"]

product:
  type: "B2B SaaS"
  surfaces: ["marketing", "auth", "product-app", "admin"]
  roles:    ["customer", "admin"]
```

See **[`schema/brand-book.example.yml`](./schema/brand-book.example.yml)** for a fully filled-in version.

### 3 · Invoke the designer

In Claude Code, with your project folder open:

```
/skill design-from-brand my-brand.yml
```

The skill walks the agent through:

1. **Brand intake** — parse the YAML, validate against the schema
2. **Palette derivation** — generate full 11-stop scales from primary + deep
3. **Token scaffolding** — write `globals.css` with three layers (primitives → semantics → component variables)
4. **Project scaffold** — Next.js 16 + Shadcn UI in your chosen folder
5. **Documentation** — generate all 13 docs from templates, filled with your brand
6. **QA harness install** — drop `.claude/agents/`, `.claude/hooks/`, `.claude/settings.json`
7. **First deploy** — Vercel preview URL
8. **First QA run** — `qa-orchestrator` reports any gaps

### 4 · Iterate

After the first scaffold, use the per-feature workflow:

```
/skill feature-build "Add a settings page with notification preferences"
```

The `design-agent` reads your project's `AGENTS.md` (auto-generated from your brand), follows the absolute rules, runs `tsc --noEmit`, deploys, and hands off with a live URL.

---

## What the plugin produces (concretely)

A fresh project after one `design-from-brand` invocation:

```
my-app/
├── CHANGELOG.md
├── README.md
├── AGENTS.md                          ← Token rules + agent delegation (brand-specific)
├── CLAUDE.md                          ← @AGENTS.md import
├── .claude/
│   ├── CLAUDE.md                      ← QA process
│   ├── settings.json                  ← Hooks + permissions wiring
│   ├── agents/                        ← 6 agents (design + 5 QA)
│   ├── hooks/                         ← 4 hooks + 2 helpers
│   └── skills/                        ← 4 methodology skills
├── app/
│   ├── globals.css                    ← Your three-layer tokens
│   ├── layout.tsx · page.tsx · …
│   ├── tokens/{primitive,semantic,mobile}/page.tsx   ← Visual viewers
│   └── components/page.tsx            ← Live Shadcn showcase
├── components/
│   ├── ui/                            ← Shadcn primitives
│   └── site/                          ← Brand-styled nav + footer
├── docs/
│   ├── README.md                      ← Doc map + 30-second pitch
│   ├── PRINCIPLES.md                  ← "Fast and simple" — 10 principles
│   ├── DESIGN-SYSTEM.md               ← 3-layer architecture
│   ├── TOKENS-{PRIMITIVE,SEMANTIC,MOBILE}.md
│   ├── COMPONENTS.md                  ← Shadcn usage rules
│   ├── UX-PATTERNS.md                 ← Shells, drawer, mask fade
│   ├── UX-FLOWS.md                    ← Routes mapped
│   ├── BUILD-PROCESS.md               ← Workflow
│   ├── DEPLOY.md                      ← Vercel + QA automation
│   ├── QA.md                          ← Pass criteria
│   └── JOURNAL.md                     ← Empty, agent appends as it builds
├── scripts/qa-screenshots.mjs         ← Playwright capture
└── .github/workflows/design-qa.yml    ← PR-time QA
```

---

## Philosophy

This plugin encodes one belief: **constraints make systems, not options**.

When you give the agent ten ways to do something, it picks differently each time, the codebase drifts, and the team loses time chasing inconsistency. When you give it one way — Shadcn for components, tokens for colors, mobile-first responsive, lucide-react for icons, viewer-first for tokens — the result is consistent across sessions, contributors, and brands.

The full philosophy is in **[`docs/PRINCIPLES.md`](./docs/PRINCIPLES.md)**.

---

## Docs

| File | What it covers |
|---|---|
| [`docs/GETTING-STARTED.md`](./docs/GETTING-STARTED.md) | First-time setup, step-by-step |
| [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) | The order the plugin executes (brand intake → scaffold → deploy) |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Three-layer token model, explained |
| [`docs/PRINCIPLES.md`](./docs/PRINCIPLES.md) | The ten principles the agent follows |
| [`docs/BRAND-INTAKE.md`](./docs/BRAND-INTAKE.md) | How the brand book is parsed + validated |
| [`docs/PLUGIN.md`](./docs/PLUGIN.md) | How the plugin is wired into Claude Code |

---

## Credits

This plugin started life as the design system for **Mentix** (a surgical training platform). After shipping Mentix in one continuous session, we packaged the framework — three-layer tokens, Shadcn-first components, QA harness, design-agent — so any brand could use the same machinery.

If you ship something with it, [open an issue](https://github.com/aiden150/designer-os/issues) — we'd like to see it.

---

## License

MIT. See [`LICENSE`](./LICENSE).
