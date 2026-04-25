# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a pre-implementation project. All documentation exists but no source code has been written yet. The next step is to initialize the Next.js project and start building the MVP Core.

## Quick Project Brief

GeoCanvas is a minimalist geometric shape editor (SPA) built with Next.js App Router. There is no backend; persistence is localStorage + local JSON import/export.

## Canonical Sources

When details conflict or are missing here, use these files in order:
1. `.ai/prd.md` (product behavior and acceptance criteria)
2. `.ai/tech-stack.md` and `.ai/tech-stack-analysis.md` (stack decisions)
3. `docs/geocanvas-prd-summary.md` (condensed product summary)

## Rule Priority

Apply rules in this precedence order (highest first):
1. This `CLAUDE.md`
2. `.cursor/rules/shared.mdc`
3. Domain-specific `.cursor/rules/*.mdc`
4. Existing project config (`eslint`, `prettier`, `tsconfig`, scripts)

If two rules conflict, follow the higher-priority source and briefly explain the choice in your response.

## Imported Rules from `.cursor/rules/` (Claude Code Mirror)

All current rules from `.cursor/rules/` are represented below so Claude Code follows the same standards.

### Shared (`shared.mdc`)

- Treat this app as a clean, minimal, geometry-focused SPA.
- Keep TypeScript strict and code production-safe.
- Prefer guard clauses and early returns.
- Handle edge cases and errors explicitly (with useful messages).
- Avoid unnecessary nesting and redundant `else` blocks.
- Required runtime: Node.js >=20.9.0.

### React (`frontend-react-react_coding_standards.mdc`)

- Use function components and hooks.
- Use memoization (`React.memo`, `useMemo`, `useCallback`) when it helps avoid real rerenders/recompute.
- Use `React.lazy`/`Suspense` for meaningful code-splitting.
- Use `useId` for accessibility IDs.
- Use `useTransition` for non-urgent UI updates where helpful.

### Zustand (`frontend-react-zustand.mdc`)

- Keep state segmented by domain; avoid monolithic stores.
- Use selectors to reduce rerenders.
- Use Immer for complex immutable updates.
- Use strict typing for store contracts.
- Use shallow comparison when beneficial.
- Use custom hooks to encapsulate store access logic.

### ESLint (`coding_practices-static_analysis-eslint.mdc`)

- Keep lint rules aligned to project standards in `eslint.config.js`.
- Integrate lint + format so rules do not conflict.
- Prefer automated fixes for safe cases.
- Keep lint checks in CI and pre-commit flow when available.

### Prettier (`coding_practices-static_analysis-prettier.mdc`)

- Keep one shared `.prettierrc`.
- Use format-on-save.
- Exclude generated artifacts via `.prettierignore`.
- Enforce formatting in CI.

### Jest (`testing-unit-jest.mdc`)

- Use Jest + TypeScript.
- Prefer Testing Library for UI/component tests.
- Use snapshots sparingly.
- Use mocks/spies for isolation.
- Structure tests with `describe`, setup/teardown hooks, and specific assertions.
- Cover async/time-based logic with async mocks and fake timers.

### Next.js React Generalist (`nextjs-react-generalist-cursor-rules.mdc`)

- Be expert-level in JS/TS/CSS/React/Tailwind/Node/Next; choose simple, non-duplicative solutions.
- Work in small steps with a quick test after each step.
- Prefer concise non-code answers when possible; use code only when needed (especially for complex logic).
- Before proposing code, write `<CODE_REVIEW>` (current behavior) and then `<PLANNING>` (change plan).
- Preserve existing names/literals unless change is required; for convention names, use `::UPPERCASE::`.
- If ambiguous, ask clarifying questions and discuss trade-offs.
- Prioritize security; for risky areas include `<SECURITY_REVIEW>`.
- Also cover performance, error handling, edge cases, and operational soundness.
- Adapt based on feedback.

## Non-Negotiable Constraints

- Tailwind CSS v4 only (CSS-first config via `@theme`; no v3-style JS config).
- Use `@uiw/react-color`; do not use `react-colorful`.
- Target smooth interaction with 200+ shapes and zero production console errors.

## Definition of Done (for each change)

- Behavior matches PRD/acceptance criteria for touched scope.
- Code is typed, lint-clean, and formatted.
- Edge cases and failure paths are handled.
- Tests are added/updated for changed logic (or a brief reason is provided when not applicable).
- No regressions in existing flows affected by the change.

## Expected Commands (once app is initialized)

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```
