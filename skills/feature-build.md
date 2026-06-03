# Skill: feature-build

**Invocation:** `/skill feature-build "<description of what to build>"`

---

## Purpose

Add a new page, component, or pattern to an existing Designer OS project. This skill delegates to the `design-agent`, enforces all token and component rules, runs `tsc`, deploys, and hands off with a live URL.

Use this skill for all work after the initial `design-from-brand` scaffold.

---

## Prerequisites

- The project was initialized with `design-from-brand`.
- `AGENTS.md` exists at the project root (it encodes the brand's design rules).
- The current working directory is the scaffolded project.

---

## Step-by-step workflow

### Step 1 — Understand the request

Parse the description. Classify into one of:

| Type | Examples |
|---|---|
| **New page** | "Add a pricing page", "Add a settings page" |
| **New component** | "Add a data table for portfolio positions", "Add an alert banner" |
| **New pattern** | "Add an empty state for the positions list", "Add a skeleton loader" |
| **Token change** | "Change the brand color to #0066FF", "Switch to a generous type scale" |
| **Layout change** | "Add a secondary sidebar", "Make the nav sticky" |

### Step 2 — Read the design rules

Before writing any code, read these files in order:

1. `AGENTS.md` — absolute token rules for this project
2. `docs/DESIGN-SYSTEM.md` — three-layer token architecture
3. `docs/COMPONENTS.md` — Shadcn component rules
4. `docs/UX-PATTERNS.md` — shell patterns, drawer, empty state conventions

If any rule is unclear, re-read. Do not proceed on assumptions.

### Step 3 — Delegate to design-agent

Hand off to the `design-agent` with:
- The parsed request type
- The relevant rules from Step 2
- The current route map (from `docs/UX-FLOWS.md`)
- Any relevant existing components to match

The design-agent will build the feature. The skill resumes in Step 4 after the agent completes.

### Step 4 — Verify token compliance

After the design-agent writes code, run the code-scanner to check for violations:

```bash
# The agent self-audits, but the skill independently verifies
```

Check the agent's output for:
- [ ] No hardcoded hex in component files
- [ ] No raw pixel values outside `globals.css`
- [ ] All colors via `var(--color-*)` or `var(--primary-*/--deep-*/--gray-*)`
- [ ] All icons from `lucide-react` with `strokeWidth={1.5}`
- [ ] All interactive elements use Shadcn `<Button>`, `<Input>`, `<Switch>`, etc.
- [ ] Dark mode works (components read CSS variables, no theme branching in code)

If any violation is found, send back to the design-agent with the specific violation.

### Step 5 — TypeScript check

```bash
npx tsc --noEmit
```

**If this fails, do not proceed.** Fix all type errors before continuing.

### Step 6 — Build check

```bash
npm run build
```

**If this fails, do not proceed.** Fix all build errors before continuing.

### Step 7 — Deploy

```bash
npx vercel deploy --prod --yes
```

Capture the live URL.

### Step 8 — Update documentation

After a successful deploy:

1. If a new route was added, append it to `docs/UX-FLOWS.md`.
2. If a new token was added to `globals.css`, append it to the relevant `docs/TOKENS-*.md`.
3. If a new component pattern was introduced, append it to `docs/UX-PATTERNS.md`.
4. Append to `CHANGELOG.md`:

```markdown
## <date>

### Added
- <description of what was added>

**Live:** <vercel-url>
```

5. Append a one-paragraph entry to `docs/JOURNAL.md` describing what was built and why.

### Step 9 — Handoff

```
✅ Feature complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature:  <description>
Live URL: <vercel-url>

Changed files:
  <list of created/modified files>

Token compliance: ✅ (no violations)
TypeScript:       ✅ (0 errors)
Build:            ✅ (passed)
```

---

## Decision trees for the 5 most common requests

### 1. New page

```
Does a shell already exist for this page type?
  YES → Use the existing shell wrapper
  NO  → What type is it?
    Marketing → wrap with <SiteShell>
    App → wrap with <AppShell>
    Auth → wrap with <AuthShell>

Does it need data?
  YES → Add mock data in lib/<route>-mock.ts (never inline in page.tsx)
  NO  → Static content only

Does it have a loading state?
  YES → Add loading.tsx next to page.tsx
  NO  → Skip
```

### 2. New color

```
Is this a new primitive?
  YES → Add to globals.css :root primitive block
        Add to tailwind.config.ts colors
        Add to docs/TOKENS-PRIMITIVE.md
        Add swatch to app/tokens/primitive/page.tsx
  NO  → Is this a new semantic role?
    YES → Add to globals.css :root AND .dark blocks
          Add to docs/TOKENS-SEMANTIC.md
          Add to app/tokens/semantic/page.tsx
    NO  → Use an existing semantic variable
```

### 3. New button variant

```
Does Shadcn's <Button> support this variant?
  YES → Use variant="<name>" — done
  NO  → Add a new variant to components/ui/button.tsx using cva()
        The variant MUST use semantic tokens (--color-*), not primitives
        Add to docs/COMPONENTS.md
        Add to app/components/page.tsx showcase
```

### 4. Icon-only button

```
<Button size="icon" aria-label="<action description>">
  <IconName
    size={16}
    strokeWidth={1.5}
    style={{ color: "var(--color-text-secondary)" }}
  />
</Button>
```

- Always include `aria-label` (never omit)
- Never use emoji as icon
- Prefer `size={16}` or `size={20}` — never hardcode px in style

### 5. List with empty state

```tsx
{items.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <IconName
      size={32}
      strokeWidth={1.5}
      style={{ color: "var(--color-text-tertiary)" }}
    />
    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
      {emptyMessage}
    </p>
  </div>
) : (
  <ul>…</ul>
)}
```

- Empty state always centered, always has an icon + message
- Never show a raw "No items found" string without the icon
- `emptyMessage` comes from a prop or constant — never hardcoded inline

---

## What the design-agent must NOT do

- Modify `globals.css` to add tokens without documenting them
- Use raw `<button>` instead of Shadcn `<Button>`
- Hardcode colors or pixels in component files
- Import from `react` without `"use client"` when using hooks
- Use `console.log` in committed code
- Modify any file outside the scope of the requested feature

---

## 30-item self-audit checklist (design-agent runs this before declaring done)

The design-agent must check each item before returning control to the skill:

**Tokens**
- [ ] No `#[0-9a-fA-F]{6}` in component files
- [ ] No `rgb(` in component files
- [ ] No raw `px` values outside globals.css
- [ ] All color references use `var(--color-*)` or Tailwind `text-/bg-/border-` with token-mapped colors

**Components**
- [ ] All interactive elements use Shadcn primitives
- [ ] All tables use Shadcn `<Table>`
- [ ] All inputs use Shadcn `<Input>` + `<Label>`
- [ ] All icons are from `lucide-react`
- [ ] All icons have `strokeWidth={1.5}`
- [ ] All icon-only buttons have `aria-label`
- [ ] No emoji used as icons

**Dark mode**
- [ ] No `isDark` conditional in any component
- [ ] All colors read from CSS variables (not hardcoded per-theme)
- [ ] Tested dark mode visually in the preview

**TypeScript**
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No `any` types added
- [ ] All new props have explicit types

**Accessibility**
- [ ] All images have `alt` text
- [ ] Decorative images use `alt=""` and `aria-hidden`
- [ ] All form inputs have associated `<Label>`
- [ ] Focus is visible on all interactive elements (no `outline: none` without replacement)

**Code quality**
- [ ] No `console.log` in committed files
- [ ] No hardcoded strings that should be variables/constants
- [ ] Mock data is in `lib/*-mock.ts`, not in the page/component file
- [ ] No unused imports
- [ ] No unused variables

**Documentation**
- [ ] `docs/UX-FLOWS.md` updated if route added
- [ ] `docs/TOKENS-*.md` updated if token added
- [ ] `CHANGELOG.md` entry added
- [ ] `docs/JOURNAL.md` paragraph added

**Build**
- [ ] `npm run build` passes with 0 errors
- [ ] `npx vercel deploy --prod --yes` succeeded
- [ ] Live URL reported
