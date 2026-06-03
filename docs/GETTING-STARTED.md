# Getting Started

> From brand book to deployed design system in one session.

---

## What you need

- **Claude Code** with this plugin installed
- **Node.js 20+** and **npm**
- **git** (for baseline commits)
- A **Vercel** account with the `vercel` CLI installed and authenticated (`vercel login`)
- Your brand's primary and deep colors (two hex values)

That's it. Everything else is derived.

---

## Step 1 — Install the plugin

```bash
mkdir -p ~/.claude/plugins
git clone https://github.com/aiden150/designer-os ~/.claude/plugins/designer-os
```

Add to your Claude Code `settings.json`:

```json
{
  "plugins": ["designer-os"]
}
```

Restart Claude Code. You should now have:
- `/skill design-from-brand` available
- `/skill feature-build` available
- `/agents design-agent` available
- `/agents qa-orchestrator` available

---

## Step 2 — Create your brand book

Copy the template into your working directory:

```bash
cp ~/.claude/plugins/designer-os/schema/brand-book.template.yml my-brand.yml
```

Open `my-brand.yml` and fill in at minimum the required fields:

```yaml
brand:
  name:        "Your Brand"          # Required
  tagline:     "What you do."        # Required
  description: "1-2 sentences."      # Required

palette:
  primary: "#0066FF"                 # Required — your brand accent color
  deep:    "#0A0F1E"                 # Required — your dark background color

typography:
  body: "Inter"                      # Required — Google Font or system font

voice:
  audience: "Who your users are"     # Required
  tone:     [confident, calm]        # Required — 2-4 descriptors

product:
  type:     "b2b-saas"               # Required
  surfaces: [marketing, auth, product-app]  # Required
```

See `schema/brand-book.example.yml` for a fully filled-in reference.

**Validate before running** (optional but recommended):

```bash
npx ajv-cli validate -s ~/.claude/plugins/designer-os/schema/brand-book.schema.yml -d my-brand.yml
```

---

## Step 3 — Run the scaffold

In Claude Code, with your project folder open:

```
/skill design-from-brand my-brand.yml
```

This runs the 9-phase workflow:

| Phase | What happens | Duration |
|---|---|---|
| 0 | Parse + validate brand book | < 5s |
| 1 | Derive 11-stop color scales | < 10s |
| 2 | Write three-layer token system | < 30s |
| 3 | Scaffold Next.js + Shadcn project | 2-4 min |
| 4 | Build surface shells (marketing, app, etc.) | 1-2 min |
| 5 | Generate 13 documentation files | 1-2 min |
| 6 | Install QA harness (.claude/) | < 30s |
| 7 | First build + screenshot baseline | 2-3 min |
| 8 | First deploy to Vercel | 1-2 min |
| 9 | Handoff report | < 5s |

**Total: ~10-15 minutes** for a complete scaffold from scratch.

---

## Step 4 — Verify the scaffold

After the handoff report, open the live URL. Check:

1. **Token viewers** — visit `/tokens/primitive`, `/tokens/semantic`, `/tokens/mobile`. Every color should render as a swatch.
2. **Component showcase** — visit `/components`. All Shadcn components should appear with your brand colors.
3. **Dark mode** — toggle dark mode (if the nav includes a toggle). All colors should invert correctly via CSS variables.
4. **Surfaces** — visit each surface you requested (`/`, `/login`, `/dashboard`, etc.). Each should have the correct shell (site nav, app sidebar, auth card).

---

## Step 5 — Run QA

```
/agents qa-orchestrator
```

The first run typically finds a few warnings (token documentation gaps, minor contrast adjustments). Fix them or note them as acceptable before moving to feature work.

---

## Step 6 — Build your first feature

```
/skill feature-build "Add a settings page with notification preferences and a danger zone for account deletion"
```

The `design-agent` takes it from here. It reads your brand's design rules, builds the feature, verifies it passes all token and type checks, deploys, and hands off with a live URL.

---

## Updating your brand book later

If you need to update brand colors, typography, or voice after the initial scaffold:

1. Edit your `my-brand.yml`
2. Run `/skill design-from-brand my-brand.yml` again

> ⚠️ **Warning:** Re-running `design-from-brand` on an existing project will overwrite `globals.css` and all 13 documentation files. Feature code in `app/` and `components/` is preserved, but you should commit your work first.

Alternatively, make targeted changes directly using `feature-build`:
```
/skill feature-build "Change the brand primary color to #0066FF and update all semantic tokens"
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `design-from-brand` halts with missing fields | Open `my-brand.yml`, check the error message, fill in the listed fields |
| Schema validation fails | Run `npx ajv-cli validate -s …/brand-book.schema.yml -d my-brand.yml` to see the exact error |
| Build fails during Phase 7 | Check the error. Often a missing Google Font or a Tailwind config issue |
| Vercel deploy fails | Run `vercel login` to re-authenticate, or `vercel link` to connect the project |
| Token viewers are empty | `globals.css` may not have been written correctly. Run `/agents token-auditor` |
| Dark mode looks wrong | Check `.dark` block in `globals.css`. All semantic tokens need overrides |
