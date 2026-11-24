# PaperBuilder — Phase 0–1

School Examination & Paper Management Platform — Foundation + Design system (“Daftar”).
Frontend-only prototype; **no real backend**. All data is mocked.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 — i18n parity check runs first
npm run build    # parity check + strict tsc + production bundle
npm run check:i18n   # parity check only
```

## What’s in it

- **Foundation (Phase 0)**: strict TypeScript, i18n parity check, Daftar tokens (navy/white/red-pen/yellow-mark), logical CSS-properties RTL shell, whole-interface English/اردو switch persisted across sessions.
- **Design system (Phase 1)**: 35+ components in `src/design-system/` (buttons, forms, selection, overlays, feedback, data, paper studio, shell) — all states visible on the `/design-system` showcase, in both languages and both directions, at 390px and 1280px.
- **Shell**: collapsible rail, top bar (language toggle, notifications, profile/role menu), mobile bottom tabs + more-sheet, skip link, role-gated nav and placeholder pages, system-state pages.
- **Mock services**: in-memory + localStorage persistence, seeded deterministic data (12 schools, 40 teachers, 60 papers, …), transition graph with audit events. `QuestionBankProvider` is the contract the real bank will implement.
- **Sign-in**: frontend-only demo auth (any credentials work; role switcher in the top bar flips the viewer between super-admin / school-admin / teacher).

## Screenshots

`screenshots/` contains the showcase captured with Playwright (`scripts/screenshots.mjs`):
- `design-system-{en|ur}-{1280|390}.png` — viewport top (native-resolution) screenshot per language × viewport
- `design-system-{en|ur}-{1280|390}-composite.png` — same page stitched across ~5 scroll positions so the full showcase is visible at useful scale

## Structure

```
src/design-system/    35+ themed components + barrel export
src/shell/            Rail, TopBar, BottomTabs, AppShell, AuthContext, PageHeader, navigation
src/showcase/          per-section demo helpers + demo files (Identity/Buttons/Forms/Selection/Overlay/Feedback/Data/PaperStudio)
src/pages/             DesignSystemPage, SignInPage, FoundationTestPage, PlaceholderPage, SystemStatePage
src/i18n/              en.json / ur.json (parity-enforced) + bootstrap
src/mock/              deterministic mock data + invented-names disclaimer
src/services/          contracts + mock-store (in-memory + localStorage)
src/styles/            tokens.css, global.css, design-system.css, shell.css, showcase.css
```

## Notes

- `/design-system` is a showcase, not a real screen — it is reachable from the shell rail for demoing purposes.
- Phase 0 acceptance passes: language toggle flips layout/direction correctly, spacing/chevrons mirror, numbers render in-context.
- Phase 1 acceptance rests on: all §7.6 components exist + showcase in both languages + every state visible + keyboard/focus works. The accessibility audit (full keyboard pass + screen-reader check) is not yet done and is flagged in `DECISIONS.md` ⚑.

## Legacy domain merge integration pass (2026-11-24)

The Gemini-merged tree added a "legacy domain" layer (board-paper engine,
offline KaTeX, local fonts, textbook-cover images). This pass integrated
what the app uses and quarantined the rest — no new screens, no redesign,
no new dependencies.

- **Used:** `src/services/math-format.ts` (splitMathText / formatMathText /
  containsMath) powers the new `src/design-system/MathText.tsx`, which
  renders question, option, answer and instruction text with inline TeX
  ($...$ / $$...$$). KaTeX loads lazily via `ensureKatex()` in
  `src/utils/katex-offline.ts` — only when text actually contains math,
  once per page; pages without math make zero requests to /vendor/katex/*.
  `printWithTitle()` awaits KaTeX first when the paper has math.
- **Quarantined:** `src/services/legacy/` holds board-paper.ts,
  question-selection.ts and subjects.ts (+ their tests) with a README —
  reference only, imported by nothing. The Studio engine in
  `src/services/studio.ts` is the single paper engine.
  `legacy-domain-ref/` is reference material only (never compiled, never
  picked up by Vitest).
- **Fonts:** the Urdu paper face is local Noto Nastaliq Urdu (159 KB) as
  'Noto Nastaliq Paper' under --font-urdu-paper; Jameel Noori Nastaleeq
  (5.5 MB) was subset-tried and dropped (subset still 5.38 MB — the
  Nastaliq ligature closure keeps the whole font). 'Inter Paper' is the
  paper-only Latin face. Outfit is gone (unused). Non-paper screens
  download no local fonts; an Urdu paper preview requests the paper font
  once. See DECISIONS.md for the measured sizes.
- **Images:** `public/assets/subjects/*.jpg` are textbook covers; the
  owner must confirm usage rights before any public launch; they are not
  shown in the app yet.
- **Demo data:** four bank questions (Algebra MCQ 1, Geometry short 1,
  Physics Mechanics MCQ 1 + short 1) carry inline TeX so the math path is
  demonstrable; seeded paper-007 (physics, approved) contains two of them.
  Gates: tsc 0, i18n parity, Vitest 257/257, Playwright 194+1, axe clean,
  keyboard + announcer pass.

## Fonts and licences

- Inter (SIL OFL 1.1) — app chrome, via Google Fonts; local variable file
  `public/fonts/inter-latin-variable.woff2` is the paper-only 'Inter
  Paper' face (see `public/fonts/INTER-OFL-1.1.txt`).
- Noto Nastaliq Urdu (SIL OFL 1.1) — Urdu paper face, local file
  `public/fonts/noto-nastaliq-urdu-arabic-400.woff2` (see
  `public/fonts/NOTO-NASTALIQ-URDU-OFL-1.1.txt`).
- Jameel Noori Nastaleeq — not shipped; source note kept in
  `public/fonts/JAMEEL-NOORI-SOURCE.txt`.
- KaTeX (MIT) — local vendor copy under `public/vendor/katex/` (JS, CSS
  and fonts), loaded lazily only for math.
