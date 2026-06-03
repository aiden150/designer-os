# Principles

> Ten rules the design-agent follows. These encode the philosophy behind every decision.

---

## 1. Two colors, one system

The entire visual language derives from two hex values: `primary` and `deep`. We don't ask for ten colors and hope they're harmonious. We compute harmony from the brand's core identity. If the output doesn't feel right, the input colors need revisiting — not the derivation.

## 2. Constraints make systems, not options

When an agent has ten ways to do something, it picks differently each time. When it has one way — Shadcn for components, tokens for colors, lucide-react for icons — the result is consistent across sessions, contributors, and months. Every rule in `AGENTS.md` exists to remove a choice, not to add friction.

## 3. Semantic tokens, not primitive references

Components reference roles (`--color-text-primary`), never scale stops (`--gray-900`). This is what makes dark mode a CSS cascade, not a conditional tree. It's also what lets you rebrand a product by changing a handful of semantic bindings, not hunting through 300 component files.

## 4. Viewers are first-class

Every token must be visible in a token viewer page before it can be used. Not documented — *visible*, as a rendered swatch. If you can't see it, you don't know it exists. Viewer-first forces the token system to be self-describing.

## 5. QA is separate from build

The design-agent never runs QA on itself. A separate `qa-orchestrator` runs after the build. This separation matters because self-reporting systems lie — not deliberately, but because they're optimizing for the wrong goal. The agent is optimizing to finish the feature. The QA agents are optimizing to find problems. Those are different jobs.

## 6. Documentation is part of the feature

A feature is not done until `UX-FLOWS.md`, `TOKENS-*.md`, `CHANGELOG.md`, and `JOURNAL.md` are updated. Documentation is not overhead — it's how the design-agent stays coherent across sessions. If it can't read what was built before, it will build inconsistently.

## 7. Dark mode is a CSS cascade, not a conditional

If a component contains `if (isDark)`, it's wrong. Dark mode is a CSS class on `<html>`. Components read variables. The cascade handles the rest. This rule has no exceptions.

## 8. Shadcn is the floor, not the ceiling

We use Shadcn UI primitives for all interactive components. We don't write raw `<button>` or `<input>`. But Shadcn is the starting point — you can extend its variants, wrap it with brand-specific styles, and compose it into larger patterns. What you can't do is replace it with a handwritten primitive that doesn't handle focus, ARIA, and keyboard navigation correctly.

## 9. Mock data in lib/, not in components

Components are not responsible for their own data. Mock data lives in `lib/<domain>-mock.ts`. This keeps components testable, keeps pages readable, and prevents the agent from embedding hardcoded strings in component files that should be variable.

## 10. TypeScript errors are blockers, not warnings

`tsc --noEmit` must pass with zero errors before any deploy. Not "mostly" — zero. A type error in production code is a bug that hasn't been caught yet. The design-agent is not done until the TypeScript compiler agrees.
