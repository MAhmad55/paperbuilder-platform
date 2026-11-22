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
