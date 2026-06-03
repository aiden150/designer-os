# Architecture

> How the three-layer token model works, and why every decision flows from two hex values.

---

## The core idea

A design system has one job: make every visual decision **once**, then let the system enforce it everywhere. Designer OS does this through a three-layer token architecture.

You provide two colors. The system derives everything else.

---

## The three layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3 — Component variables (optional)           │
│  --button-bg, --card-border, --input-ring           │
│  Used by: specific component files                  │
│  Source: semantic layer                             │
├─────────────────────────────────────────────────────┤
│  LAYER 2 — Semantic roles                           │
│  --color-text-primary, --color-bg-base              │
│  --color-interactive-primary, --color-border-default│
│  Used by: all component code                        │
│  Source: primitive layer                            │
├─────────────────────────────────────────────────────┤
│  LAYER 1 — Primitive scales                         │
│  --primary-50 … --primary-950                       │
│  --deep-50 … --deep-950                             │
│  --gray-50 … --gray-950                             │
│  Used by: semantic layer only                       │
│  Source: brand book (2 hex values)                  │
└─────────────────────────────────────────────────────┘
```

### Layer 1 — Primitive scales

Raw color math. Each scale has 11 stops (50 through 950). No component ever references these directly — they exist only to feed the semantic layer.

**Why 11 stops?** Enough granularity for the semantic layer to pick the right contrast level without generating arbitrary in-between values.

**How generated:** The brand's `primary` hex becomes `--primary-500`. Lighter stops mix toward white; darker stops mix toward `deep`. This means the dark end of the primary scale is brand-harmonized — it doesn't just go toward black.

### Layer 2 — Semantic roles

Meaning-bearing aliases. Each variable has a name that describes its role, not its value:

```css
/* ✅ Semantic — describes role */
--color-text-primary
--color-bg-base
--color-interactive-primary

/* ❌ Not semantic — describes value */
--blue-600
--navy-900
```

This is the layer components reference. When dark mode activates, only this layer changes — the components stay identical.

```css
:root {
  --color-text-primary: var(--deep-900);    /* light mode */
}

.dark {
  --color-text-primary: var(--deep-50);     /* dark mode */
}
```

The component code doesn't know or care which mode is active. It always reads `var(--color-text-primary)`.

### Layer 3 — Component variables (optional)

For components with many configurable properties, a third layer can abstract the semantic layer further:

```css
/* Button uses layer 3 to allow per-component overrides */
.btn-primary {
  --button-bg:           var(--color-interactive-primary);
  --button-text:         var(--color-interactive-primary-text);
  --button-hover-bg:     var(--color-interactive-primary-hover);
}
```

This lets you retheme a single component without touching the shared semantic layer. Most projects don't need this layer for early features — introduce it when a component needs independent theming.

---

## Why two colors are enough

Most design systems ask for many input colors. Designer OS asks for two:

1. **`primary`** — the brand accent. Used for CTAs, links, active states, focus rings.
2. **`deep`** — the brand dark. Used for hero backgrounds, primary headings, the darkest UI surfaces.

Everything else is derived:

| Output | How derived |
|---|---|
| `--primary-*` scale | Math from `primary` hex |
| `--deep-*` scale | Math from `deep` hex |
| `--gray-*` scale | Pure grays, optionally tinted with `primary` hue |
| `--color-text-*` | Mapped from `deep-*` and `gray-*` |
| `--color-bg-*` | Mapped from `deep-*` and `gray-*` |
| `--color-interactive-*` | Mapped from `primary-*` |
| `--color-border-*` | Mapped from `gray-*` |
| Status colors (`success`, `warning`, `error`, `info`) | Defaults, overridable in brand book |

This constraint is intentional. A brand that needs radically different derivation rules has outgrown this framework — they should build a custom token system. For the vast majority of B2B and B2C products, two anchors are sufficient and produce better results than five independent swatches.

---

## The file structure

```
app/
└── globals.css                    ← The entire token system lives here

    /* ── PRIMITIVE: Primary ── */
    --primary-50 through --primary-950
    
    /* ── PRIMITIVE: Deep ── */
    --deep-50 through --deep-950
    
    /* ── PRIMITIVE: Gray ── */
    --gray-50 through --gray-950
    
    /* ── PRIMITIVE: Status ── */
    --success, --warning, --error, --info
    
    /* ── SEMANTIC: Text ── */
    --color-text-primary, -secondary, -tertiary, -brand, -inverse, -on-primary
    
    /* ── SEMANTIC: Backgrounds ── */
    --color-bg-base, -subtle, -muted, -emphasis, -brand, -brand-subtle
    
    /* ── SEMANTIC: Borders ── */
    --color-border-default, -strong, -brand
    
    /* ── SEMANTIC: Interactive ── */
    --color-interactive-primary, -primary-hover, -primary-text
    
    /* ── SEMANTIC: Status ── */
    --color-success, --color-warning, --color-error, --color-info
    
    /* ── TYPOGRAPHY ── */
    --font-body, --font-display, --font-mono
    
    .dark { /* overrides for all semantic tokens */ }
```

---

## Tailwind integration

Tailwind's `theme.extend` maps the CSS variables so you can use them as Tailwind utilities:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        50: "var(--primary-50)",
        // ...
        950: "var(--primary-950)",
      },
      deep: { /* ... */ },
      gray: { /* ... */ },
    },
    fontFamily: {
      body: "var(--font-body)",
      display: "var(--font-display)",
      mono: "var(--font-mono)",
    },
  },
}
```

This means `text-primary-600` in Tailwind resolves to `var(--primary-600)` — but component code should still prefer `var(--color-text-brand)` (semantic layer) over `text-primary-600` (primitive layer directly in class).

---

## Dark mode implementation

Light is the default (`:root`). Dark activates via the `.dark` class on `<html>`.

**No `prefers-color-scheme` media query.** The class approach lets the user toggle explicitly, rather than following the OS. This is the correct UX for most B2B products where users may be in a bright office (dark OS theme) or a dark room (light OS theme).

**Never branch in component code:**

```tsx
// ❌ Wrong — component "knows" about theme
const { theme } = useTheme()
return (
  <div style={{ color: theme === "dark" ? "#fff" : "#000" }}>

// ✅ Correct — component reads a variable, CSS does the work
return (
  <div style={{ color: "var(--color-text-primary)" }}>
```

---

## The viewer contract

Every primitive must be visible in `app/tokens/primitive/page.tsx`.  
Every semantic token must be visible in `app/tokens/semantic/page.tsx`.

This isn't optional decoration — the `token-auditor` checks it. A token that exists in `globals.css` but doesn't appear in a viewer is flagged as a warning. This contract ensures the design-agent can always see the full token palette visually, and new contributors can browse the system without reading CSS.
