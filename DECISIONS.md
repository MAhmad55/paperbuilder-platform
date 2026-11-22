# PaperBuilder — Decisions log

Design decisions made where the blueprint left latitude. Entries are dated; open items are marked ⚑.

## Stack & layout
- **Vite + React 18 + TypeScript, single-page SPA.** react-router-dom v6 (BrowserRouter) for routes. The blueprint does not prescribe a toolchain; this is the closest fit for a frontend-only prototype with fast HMR.
- **One-file-per-concern for the shell**: `Rail` (240px, collapsible to 72px), `TopBar` (title, language toggle, notifications, profile menu), `BottomTabs` (mobile), `AppShell` (skip-link, rail + body, mobile Drawer), `PageHeader` (breadcrumb + title + lead + action).
- **Mobile tabs own navigation** below 768px; the desktop rail hides. A more-sheet handles items not in the tabs.
- **Two layout modes per breakpoint**: the rail/topbar/tabs are all `display: flex` with logical properties and a single `@media (max-width: 768px)` block — no duplicate CSS files.

## Design language — “Daftar”
- Tokens only (no hard-coded colors in components): ink (navy), paper (white), pen (red accent), mark (yellow highlighter), canvas (light bg), line (borders), muted text. Everything is tuned in `src/styles/tokens.css`.
- **No emoji anywhere**; every status always pairs color + label + icon (e.g. `StatusChip`).
- Status is always the triplet {color, label, icon}; a percentage/coverage/marks value always carries a textual cue next to it.

## RTL
- `<html lang>` + `dir` are set at runtime (i18next `languageChanged` listener) and persisted to localStorage (`paperbuilder.lang`).
- **Logical properties only** (`margin-inline-start`, `inset-inline-start`, `border-inline-end`, `text-align: start|end`); no `left/right` anywhere in CSS or inline styles — documented and enforced by review. `.flip-rtl` swaps directional arrows; `.bdi` wraps bidi-problematic numbers.
- `PaperSheet` has an explicit `mode: 'en' | 'ur'` prop: Urdu uses Nastaliq at 17px line-height 2.0, English uses Source Serif 4.

## i18n
- i18next + react-i18next, both JSON bundles in `src/i18n/` (191 keys, parity enforced by `scripts/check-i18n.mjs`, CI-fail on diff).
- **Whole-interface switch** — one toggle in the top bar flips the entire app, persisted across sessions.
- Component-level keys stay language-agnostic (`shell.profile`, `nav.dashboard`); only paper content uses en/ur variants via `PaperSheet`'s `mode` prop.
- ⚑ Remaining: Urdu typography is Nastaliq (source-of-truth); the English version uses Space Grotesk headings.

## Auth & routing
- **Frontend demo auth** — `AuthService.signIn/switchRole` writes a session to localStorage (`paperbuilder.v1`); no real backend. `DEMO_USERS` maps each role to a concrete mock user.
- **Role switcher lives inside the profile menu** (super-admin → `/admin`, school-admin → `/school`, teacher → `/teacher`).
- Routes guarded by role; wrong-role pages render a system state (`no-permission`) rather than leaking content.
- Placeholders are real, role-resolved pages (not an unstyled stub); each is a breadcrumb-aware `PlaceholderPage`.
- `/design-system` is reachable from the shell rail (internal tooling).
- System states (not-found / no-permission / offline / session-expired / maintenance) render a `SystemStatePage` — offline/maintenance are stubbed since there is no backend to simulate them.

## Mock data & services
- Deterministic seeded generator (mulberry32(98765)); stable across reloads. Counts: 60 papers, 12 schools, 8 school admins, 40 teachers, 15 notifications, 25 audit events, 15 users, 3 plans, 12 exams, 8 templates, 12 saved questions. See `src/mock/README.md` for the invented names and disclaimer.
- `services/` defines the contracts (`PaperService`, `SchoolService`, `QuestionBankProvider`, `PlatformService`, `AuthService`); `mock-store.ts` implements them in-memory with localStorage persistence. The real question bank swaps in via `QuestionBankProvider` later.
- **Transitions** (paper draft → submitted → in-review → approved/changes-requested → printed → archived) are enforced centrally with an audit event per transition; approved requires a school-admin/super-admin role and a non-optional policy or the opt-out bypass.

## Showcase strategy (final fix pass)
- EN + UR sample papers are rendered from one `SamplePaper.tsx` (header / MCQ w-4 options / short Qs / 1 long Q / footer "Page 1 of 2"), each 700×990 at 100% zoom (A4); `PaperSheetDemo` uses a single-column `.ds-paper-grid`. The earlier container-name-based `ds` grid was left at `align-items: start` so the Switch card sits alone in its row without stretched empty panels beside it.
- The topbar page title is restored on mobile ≤768px (§7.5); the language toggle is a ≥44px control whose inactive label is ink-700 on ink-100 (≥4.5:1); the UR label is rendered at the same visual size as EN.
- ⚑ Remaining: the paper crop script hides the app chrome before capturing (`.app-rail`/`.app-topbar { display:none }`) so the 100%-zoom crops capture pure paper.

## Showcase strategy
- Each demo block declares its states explicitly (`Demo.states`) and renders each in a labelled row. For deterministic states that can’t be captured by a screenshot (hover, focus, active, pressed), the showcase uses `data-force="hover|focus|active|disabled|loading"` + `showcase.css` rules; real hover/focus/click also works.
- Screenshots captured with Playwright against a `npm run dev` server; the composite stitch at `scripts/screenshots.mjs` is the canonical capture command.

## Testing
- **Vitest** is wired (`npm test` → `vitest run`, 24 tests: paper status transitions + marks totals). Component tests + keyboard-navigation pass remain open for Phase 2.
- Verification stack: `tsc -b --noEmit` (strict), `scripts/check-i18n.mjs` parity (193 keys each), `vite build`, unit tests, plus the Playwright smoke capture (`scripts/screenshots.mjs`) which also runs axe-core WCAG AA serious/critical per route in both languages — all 12 routes × 2 languages currently clean.
- ⚑ Remaining: component tests, keyboard-navigation test pass.

## Not built (out of scope)
- Real question bank — mock provider only (per owner choice).
- No uploads to Google Drive (per owner choice).
- No Phase 2+ content until this phase is approved by the owner.

## Round 2 — review fixes
- **i18n scaffolding**: `copy.*` (identity/buttons/forms/selection/overlays/feedback/data/paper) + `common.*` aria-labels + `test.*` strings carry every showcase demo string, wired to components via `t()`. Timeline meta lines are formatted in code via `formatDateTime` (`src/utils/date.ts`) — never ISO-style dates. Urdu translations are natural (not word-for-word); only proper nouns and sample data (school/person names, paper content) stay in English.
- **Raw-key gate** (`tests/raw-keys.spec.ts`): scans the visible text of every route × both languages; any leaf matching `/^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/` fails the test. `data-sample-artifact="paper"` on `PaperSheet` scopes the scan past the bilingual sample-paper fixture (sample content, not demo copy). The `.pb-date` button shows `formatDate` output (never numeric 12/15/2026 styles).
- **StatusChip keys**: hyphenated chip statuses map to camelCase keys (`status.inReview`, `status.changesRequested`) via a `KEY_BY_STATUS` table; the `roles.${role}` slug bug (`roles.super-admin`) is fixed via `roleLabelKey()` in `navigation.ts`.
- **Bidi**: `utils/bidi.tsx` (`<Bidi>`) wraps numeric/Latin runs with `dir="auto"` — Meter, Stepper summaries, Timeline meta, ChapterRow counts, QuestionRow marks, FileUpload sizes, meter value, avatar initials, table date/teacher cells, typoArabicStack sample. ICU plural strings keep the number inside the Urdu sentence (`{{count}}` in `chaptersPending_*`).
- **Lang toggle** (`shell.css`): EN/UR options ≥44px high; active option filled ink-700 with white text; UR label gets ~+2px (17px vs 15px) for an optical match.
- **Check-i18n** (`scripts/check-i18n.mjs`): parity + non-empty + `ur.json` Arabic-script check — a ur.json value with no Urdu/Arabic character fails unless it is in the reviewed allowlist (`scripts/i18n-allowlist.json`, each entry carries a reason). 471 keys (423 Arabic-script Urdu strings, 48 reviewed Latin-only keys).
- **PDFs** (`scripts/pdf-export.mjs`): design-system page exported via `page.pdf()` (printBackground, no margins) at EN/UR × 390px/1280px — each PDF is full-width, fonts embedded, app chrome (rail/topbar/jump-nav/skip-link) hidden in print; `.ds-demo` and paper sheets `break-inside: avoid`.
- **`.ds-grid align-items: start`** unchanged; demo artifacts intentionally exclude hover/focus-only demos (`ButtonsDemo` uses `data-force`).
