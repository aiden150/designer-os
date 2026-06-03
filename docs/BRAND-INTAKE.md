# Brand Intake

> How the brand book is parsed, validated, and used to drive scaffold decisions.

---

## The brand book contract

The brand book is a YAML file that the user fills in once. It is the **only** source of brand information the system accepts. The design-agent never asks clarifying questions about brand identity — all of that is captured in the brand book before the session starts.

Schema: `schema/brand-book.schema.yml`  
Template: `schema/brand-book.template.yml`  
Example: `schema/brand-book.example.yml`

---

## Validation

Before any code is generated, the brand book is validated against the JSON Schema. Validation runs with AJV in strict mode:

- Missing required fields → halt with a list of every missing field
- Invalid enum values → halt with the allowed values shown
- Malformed hex colors → halt with the field name and expected format
- Extra unknown properties → halt (`additionalProperties: false` on every object)

**The skill will not proceed with an invalid brand book.** This is intentional. Partial information produces partial systems. A missing `voice.audience` means the documentation will be generic. A missing `palette.deep` means the entire dark-end color scale can't be computed.

### How to fix validation errors

Run:
```bash
npx ajv-cli validate -s ~/.claude/plugins/designer-os/schema/brand-book.schema.yml -d my-brand.yml
```

The output shows exactly which fields failed and why.

---

## How each section is used

### `brand`

| Field | Used for |
|---|---|
| `name` | Project folder name, `AGENTS.md` heading, nav brand text, all doc titles |
| `tagline` | Footer, hero subheading, `docs/README.md` pitch |
| `description` | `docs/README.md` intro, marketing hero body |
| `mission` | `docs/PRINCIPLES.md` intro section |
| `domain` | Vercel domain config, `DEPLOY.md` |
| `logo.mark` | Nav brand mark (single character, renders large) |
| `logo.svg` / `logo.png` | Logo component in nav + footer |

### `palette`

| Field | Used for |
|---|---|
| `primary` | Derives `--primary-*` 11-stop scale. CTAs, links, focus rings, active states |
| `deep` | Derives `--deep-*` scale. Hero backgrounds, headings, darkest surfaces |
| `success/warning/error/info` | Status token values in `globals.css` |
| `gray_tint` | Gray scale generation: cool/warm/neutral |

### `typography`

| Field | Used for |
|---|---|
| `body` | `--font-body` variable, `<link>` in `layout.tsx`, `font-sans` Tailwind mapping |
| `display` | `--font-display` variable, heading elements |
| `mono` | `--font-mono` variable, code blocks, data tables |
| `scale` | Controls `clamp()` range in fluid type scale (compact / default / generous) |
| `letter_spacing_headings` | `letter-spacing` on `.text-h*` and `.text-display*` classes |

**Font availability check:** If `body` or `display` are Google Fonts, the system adds the correct `<link>` to `layout.tsx`. If they're system fonts (`-apple-system`, `system-ui`, etc.), no link is added. If the font name is not recognized, a warning is issued and `system-ui` is used as fallback.

### `voice`

| Field | Used for |
|---|---|
| `audience` | `docs/PRINCIPLES.md`, `AGENTS.md` voice section |
| `tone` | The `design-agent` uses tone descriptors when writing UI copy |
| `voice_of` | Reference persona shown to the agent for copy calibration |
| `forbid` | Explicit anti-patterns the agent avoids in all generated copy |
| `examples.good` | Agent reference for on-brand copy |
| `examples.bad` | Agent reference for off-brand copy |

The `voice` section directly shapes how the `design-agent` writes labels, empty states, error messages, and CTA text. A well-filled `voice` section produces noticeably better copy.

### `product`

| Field | Used for |
|---|---|
| `type` | Determines default IA (nav structure, sidebar depth) and `docs/UX-FLOWS.md` structure |
| `surfaces` | Which surface shells to scaffold (see Phase 4 in skill) |
| `roles` | Portal shells + sidebar nav items per role |
| `key_routes` | Additional routes beyond surface defaults, each gets a page file |

**Surface defaults by type:**

| Product type | Default routes added beyond key_routes |
|---|---|
| `b2b-saas` | `/`, `/pricing`, `/dashboard`, `/settings`, `/login` |
| `marketplace` | `/`, `/browse`, `/listing/:id`, `/account`, `/login` |
| `consumer-app` | `/`, `/app`, `/profile`, `/login` |
| `content-site` | `/`, `/about`, `/blog`, `/blog/[slug]` |
| `internal-tool` | `/dashboard`, `/admin`, `/login` |
| `dashboard` | `/dashboard`, `/reports`, `/settings`, `/login` |

### `deploy`

| Field | Used for |
|---|---|
| `vercel_project` | `vercel link --project <slug>` during Phase 8 |
| `domain` | `vercel domains add <domain>` + `DEPLOY.md` config section |

### `references`

The `references` array is passed to the `design-agent` system prompt as context. Before scaffolding marketing pages or complex layouts, the agent is instructed to note the referenced URLs and use them as design inspiration (for IA, hero patterns, information density, etc.).

The agent does not scrape or copy these sites. It uses them as named style references, the way a human designer would say "aim for something like Stripe's docs" or "hero layout inspired by Linear's homepage."

---

## What the brand book does NOT capture

- **Content** — real product copy, actual user testimonials, pricing numbers. The scaffold uses placeholders.
- **Data schema** — database models, API shapes. The scaffold uses mock data.
- **Business logic** — auth flows, payment integration, feature flags. These are feature-build tasks.
- **Brand guidelines PDF** — the brand book is a structured YAML, not a PDF upload. If you have a PDF brand guide, extract the relevant values manually into the YAML.
