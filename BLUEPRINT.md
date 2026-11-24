# PaperBuilder — Platform Blueprint v1

*Agent brief for the front-end prototype phase. Design language: "Daftar". Written in English for the implementation agent; the product itself is bilingual (Urdu + English).*

## 0. How to use this document

- This is the single source of truth for **what to build, how it should look, and in what order**. Follow the phases in section 11 strictly, one at a time.
- Everything here is a decision already made. Do not ask the owner about colours, spacing, button styles or copy. If something is genuinely missing, choose the most conventional option, record it in `DECISIONS.md`, and continue.
- Do **not** reuse the look or code of the earlier PaperBuilder prototype (dark-green sidebar, 7-step bar, stat cards). This is a fresh start.
- The real question-bank data is **not** part of this phase. Build against a mock provider (section 10).

## 1. Product in one paragraph

PaperBuilder is a **School Examination & Paper Management Platform**. A platform owner (Super Admin) onboards and approves schools. Each school manages its teachers, classes, subjects, exam schedule, templates and branding. Teachers create board-pattern exam papers in a guided studio, submit them for approval, and print them (paper + separate answer key) in Urdu, English or both. Every paper has a lifecycle, an owner, a history and an audit trail. The paper is the product, so the interface always shows the paper.

## 2. Scope of this phase

**In scope:** complete, clickable, responsive front-end for all roles and screens in section 4, with realistic mock data, role switching for demo, Urdu RTL + English LTR, print-ready A4 paper output.

**Out of scope (later):** real backend and authentication, real question-bank import, payments, SMS/email delivery, dark mode, native apps.

## 3. Roles and permissions

| Role | Who | Can do | Cannot do |
| --- | --- | --- | --- |
| Super Admin | Platform owner | Approve/reject/suspend schools, manage plans and limits, view all schools, platform announcements, audit log, platform settings | Edit a school's papers |
| School Admin | Principal / exam controller | Manage teachers, classes, subjects, templates, branding, approve papers, see all school papers and reports | See other schools |
| Teacher | Subject teacher | Create papers for assigned classes/subjects, save drafts, submit for approval, print approved papers, use templates | Approve own paper (unless school setting allows), see other teachers' drafts |

Assumption to confirm: a Student role is **not** part of this phase. If the owner's project already defines more roles, add them to this table and keep the same patterns.

## 4. Screen inventory

Every screen needs four states designed and built: **loading, empty, error, populated**. Every list needs search, filter, sort and a mobile card layout.

### 4.1 Public and access

1. Landing page
2. Sign in
3. Request school access (multi-section form: school details, contact person, documents, plan interest)
4. Request submitted / Pending approval (status screen with timeline)
5. Forgot / reset password
6. Accept teacher invitation (set password, choose language)

### 4.2 Super Admin

1. **Dashboard** — schools by status, approvals waiting, papers generated this month, active teachers, recent activity.
2. **Schools** — table: name, city, status, plan, teachers, papers, last active. Filters: status, plan, city.
3. **School detail** — tabs: Overview, Users, Usage, Plan & limits, Documents, Activity. Actions: suspend, reactivate, change plan.
4. **Approval queue** — list plus review panel: submitted details and documents, internal notes, actions: Approve, Request information, Reject (reason required).
5. **Plans & limits** — plans, paper quotas, teacher seats, features per plan.
6. **Question bank library** — placeholder view: classes, subjects, coverage by chapter, import status. Shows "Connect data source" empty state.
7. **Platform users** — Super Admin staff, invitations.
8. **Announcements** — compose, target (all / plan / school), schedule.
9. **Audit log** — filterable, exportable table.
10. **Platform settings** — branding, default languages, legal text, support contacts.

### 4.3 School Admin

1. **Dashboard** — papers waiting for approval (primary), upcoming exams, teacher activity, recent papers.
2. **Approvals** — queue of submitted papers with side-by-side preview; Approve / Request changes (comment required).
3. **Teachers** — list, invite, edit assignments, deactivate.
4. **Classes & subjects** — grid of class x subject with assigned teacher, medium, pattern default.
5. **Exam calendar** — month/list of exams (term, class, subject, date), linked to papers.
6. **All papers** — school-wide library with status filter.
7. **Templates** — paper header/footer templates, board patterns, instructions text.
8. **Reports** — papers per class/subject/teacher, chapter coverage, approval turnaround. Export CSV/PDF.
9. **School settings** — name, logo, address, header layout, default language/medium, approval policy (required / optional), roll-number block on/off.
10. **Plan & usage** — current plan, quota meter, upgrade request.

### 4.4 Teacher

1. **Dashboard** — "Continue where you left off" (latest draft), start new paper, my papers by status, upcoming exams assigned to me.
2. **Paper Studio** — the 6-step creation flow (section 6).
3. **My papers** — library with status filter: Draft, Submitted, Changes requested, Approved, Printed, Archived. Actions: open, duplicate, print, archive.
4. **Paper detail** — read-only paper, answer key tab, history/timeline tab, comments from approver.
5. **Templates** — use school templates, save personal patterns.
6. **Saved questions** — questions bookmarked while building (placeholder data).

### 4.5 Shared screens (all roles)

1. **Profile** — name, photo, subjects, contact, password.
2. **Settings** — interface language (Urdu/English), default print language, font size, notification preferences.
3. **History** — personal activity (papers created, edited, printed) with filters.
4. **Notifications** — approvals, comments, announcements, invitations; mark all read.
5. **Help** — short guides, contact support.
6. **System states** — 404, no permission, offline, session expired, maintenance.

## 5. Key flows

### 5.1 School onboarding

Request access -> Pending approval screen -> Super Admin reviews -> Approved (welcome email mock + first-login checklist) or Information requested (school sees exactly what is missing) or Rejected (reason shown). First-login checklist for School Admin: add logo, invite first teacher, assign first class/subject, choose approval policy.

### 5.2 Paper lifecycle

`Draft -> Submitted -> In review -> Approved -> Printed -> Archived`, with `Changes requested` returning to Draft. If the school's policy is "approval optional", the teacher may go Draft -> Approved directly. Every transition writes a history entry (who, when, comment).

### 5.3 Approval

Approver opens a paper, sees the live A4 preview and a checklist (marks total correct, every chapter in scope covered, no duplicate questions, answer key present). Actions: Approve, Request changes (comment required, pinned to the paper).

## 6. Paper Studio (the signature screen)

**Principle:** the paper is always visible. The page is a three-zone workspace.

- **Left rail (240px):** vertical step list with status (done / current / blocked) and a one-line summary of each finished step (for example "Class 9 · Mathematics · Urdu medium"). Finished steps are clickable.
- **Centre (flexible):** the work area for the current step. One task per step. Primary action (Continue) is fixed at the bottom of this zone, secondary (Back, Save draft) beside it.
- **Right (380px):** live A4 paper preview that updates as choices are made, with a marks meter pinned at its top (target vs current, coloured by status). Preview can be collapsed.
- **Mobile:** steps become a compact header ("Step 3 of 6 · Blueprint"), the preview becomes a bottom sheet opened by a "Preview paper" button, Continue is a sticky bottom bar.

**Steps**

1. **Setup** — class, subject, medium, exam type (monthly / midterm / board-pattern / chapter test), term, exam date, duration. Only classes and subjects assigned to the teacher are selectable.
2. **Scope** — chapters with checkboxes, per-chapter question counts, "select all", search. Shows how many questions are available per type.
3. **Blueprint** — marks pattern: sections (MCQ / short / long), marks per question, attempt rules, total. Presets: Board 75, Half-book, Chapter test, Custom. The meter must be honest: show 0 until a pattern exists.
4. **Questions** — Auto-fill or Manual per section. Each question is a row with preview, type, chapter, marks, Lock, Swap, Remove. Swap suggests alternatives from the same chapter.
5. **Review** — full-page A4 preview, validation checklist (marks match target, coverage, duplicates, missing answers), side-by-side English/Urdu toggle.
6. **Finish** — header details (school branding auto-filled), instructions, roll-number block, answer-key options, then: Print, Download PDF, Submit for approval, or Save as draft. Confirmation screen after.

Autosave after every change with a visible "Saved · 10:42" indicator.

## 7. Design language: "Daftar"

**Concept:** an examiner's desk. Navy ink, white paper, a red pen for what needs attention, a yellow highlighter for what is selected. Calm and trustworthy for school administrators; fast and clear for teachers.

### 7.1 Principles

1. **The paper is the hero.** Show real A4 paper wherever a paper exists.
2. **One screen, one job.** A single primary action per view.
3. **Status is always visible** and never colour-only (colour + label + icon).
4. **Density by role:** Super Admin and School Admin get compact tables; Teachers get roomy cards and a guided flow.
5. **Bilingual by design,** not by translation afterthought.

### 7.2 Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `ink-900` | `#0F1733` | Primary text, headings |
| `ink-700` | `#1E2A78` | Primary buttons, links, active nav |
| `ink-600` | `#2D3CA0` | Primary hover |
| `ink-100` | `#E8EAF8` | Selected rows, tinted fills |
| `pen-600` | `#C92A45` | Needs attention, destructive, errors |
| `pen-100` | `#FCE4E8` | Error tint |
| `mark-300` | `#FFD84D` | Highlighter: current step, selection emphasis. Text on it is always `ink-900` |
| `canvas` | `#F4F5F9` | App background |
| `paper` | `#FFFFFF` | Cards, the A4 sheet |
| `line` | `#DCE0EC` | Borders, dividers |
| `muted` | `#4A5470` | Secondary text (passes AA on white and canvas) |

**Status chips** (background / text): Draft `#E6E9F2` / `#2B3556`; Submitted `#E8EAF8` / `#1E2A78`; In review `#FFF0C2` / `#7A4B00`; Approved `#DDF3EA` / `#0B6B50`; Changes requested `#FCE4E8` / `#9B1C2E`; Printed `#E6E9F2` / `#2B3556` with check icon; Archived grey with archive icon. Every chip has an icon and a text label.

### 7.3 Typography

- **Latin headings:** Space Grotesk 600. **Latin UI/body:** Inter 400/500/600.
- **Urdu UI (labels, tables, forms):** Noto Naskh Arabic. It stays legible at small sizes.
- **Urdu headings and all paper content:** Noto Nastaliq Urdu, with line-height at least 2.0 and never negative letter-spacing.
- **English paper text:** Source Serif 4.
- Scale (px): 12 / 14 / 16 / 18 / 22 / 28 / 36. Body 16 on Teacher screens, 14 in admin tables. Urdu sizes are +2px of the Latin equivalent.
- Numerals: show Latin digits by default; offer Eastern Arabic-Indic digits as a setting.

### 7.4 Spacing, shape, elevation

- 4px base grid; common steps 8 / 12 / 16 / 24 / 32 / 48.
- Radius: 10px controls, 14px cards, 999px chips. The A4 paper has radius 2px and a soft shadow.
- Borders over shadows: cards use 1px `line`; only floating layers (menus, dialogs, bottom sheets) use shadow.
- Max content width 1280px; forms max 720px.

### 7.5 App shell

- **Desktop:** left rail 240px (collapsible to 72px icons) in `paper` with `line` border; active item is an `ink-100` pill with `ink-700` text and a 3px `pen-600` marker on the leading edge (a "red pen tick"). Top bar 64px: school switcher (Super Admin: global search), search, language toggle (اردو / English), notifications, profile menu.
- **Tablet:** rail collapsed to icons.
- **Mobile:** top bar with title and menu; bottom tab bar with 4 role-specific tabs plus More. Studio uses its own header (section 6).
- Page header pattern: breadcrumb, H1, one-line description, primary action right-aligned (leading edge in RTL).

### 7.6 Component library (build first, reuse everywhere)

Button (primary, secondary, ghost, destructive; sizes 40/48), IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, SegmentedControl, DatePicker, FileUpload, Tabs, Table (sortable, selectable, sticky header, mobile-to-cards), Pagination, Card, StatusChip, Badge, Stepper (vertical), Meter (marks), Toast, Dialog, Drawer, BottomSheet, Menu, Tooltip, Banner, EmptyState, Skeleton, Timeline, Avatar, SearchField, FilterBar, PaperSheet (A4 renderer), QuestionRow, ChapterRow, PatternEditor. Each component gets all states: default, hover, focus-visible, active, disabled, loading, error.

### 7.7 Iconography and motion

- One outline icon set (Lucide), 1.75 stroke, 20px default. No emoji anywhere in the UI.
- Motion is functional only: 150ms ease-out for hover and toggles, 220ms for drawers and sheets. Respect `prefers-reduced-motion`. **No scroll-reveal animations** (content must never start faded).
- Skeletons for loading, not spinners, except inside buttons.

### 7.8 Landing page direction

Not a feature grid. Structure: (1) hero with a live, interactive A4 paper that swaps between Urdu and English; (2) "How a paper is made" in 3 beats (pick, build, print) using real paper crops; (3) three role sections (Teacher, School, Platform) each with one product screenshot; (4) trust band (approvals, audit trail, answer key separation); (5) plans; (6) FAQ; (7) request-access call to action. Body text on dark sections must be pure white or `ink-100`.

## 8. Bilingual and RTL rules

- Whole-interface language switch (Urdu RTL / English LTR) that persists. **Never mix languages inside one component unless it is content** (for example a question that is in English inside an Urdu paper).
- Use CSS logical properties only (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`). No `left`/`right` in component CSS.
- Mirror layout, chevrons and progress direction in RTL; do not mirror icons that are not directional (search, check, trash).
- Numbers, codes and Latin words inside Urdu use `<bdi>` or `unicode-bidi: isolate`.
- Every user-facing string lives in the translation files (`ur.json`, `en.json`). A build step fails if a key exists in one file and not the other. No hard-coded copy.
- Urdu copy is written natively, not translated word-for-word. Keep Urdu button labels short (1 to 3 words).

## 9. Data model and mock data

Entities: `School`, `User`, `Membership(role)`, `Class`, `Subject`, `Chapter`, `Teaching(teacher, class, subject)`, `Paper`, `PaperSection`, `PaperQuestion`, `Question` (from provider), `Template`, `ApprovalRequest`, `Comment`, `Notification`, `AuditEvent`, `Plan`, `Announcement`, `Exam`.

Mock data must feel real: 12 schools (mixed statuses, invented names, Pakistani cities), 40 teachers, 9 classes, 8 subjects, 60 papers across all statuses, 25 audit events, 15 notifications. Mark every sample name as sample in `mock/README.md`. Use invented names only, never real schools or people.

## 10. Technical direction

- **Stack (default):** Vite, React, TypeScript, React Router, CSS variables for tokens (Tailwind allowed if tokens map 1:1), TanStack Table, React Hook Form + Zod, i18next. Deviate only with a written reason in `DECISIONS.md`.
- **Structure:** `src/design-system` (tokens + components), `src/features/{public,super-admin,school-admin,teacher,shared}`, `src/i18n`, `src/mock`, `src/services`.
- **Service boundary:** all data goes through interfaces in `src/services` (`SchoolService`, `PaperService`, `QuestionBankProvider`, `AuthService`). Phase 1 implements them with mock data plus localStorage persistence. The real question bank will plug in by implementing `QuestionBankProvider` only, with no UI change.
- **Demo auth:** a role switcher in the profile menu (Super Admin / School Admin / Teacher) and a sign-in screen that accepts any demo account.
- **Print:** a dedicated print stylesheet and `PaperSheet` component rendering true A4 (210 x 297 mm), page-break rules, Urdu and English, answer key as a separate document.
- **Routing:** role-prefixed routes (`/admin`, `/school`, `/teacher`), guarded by role.
- **Performance:** route-level code splitting; first load under 250 KB JS gzip excluding fonts; fonts subset and `font-display: swap`.

## 11. Build phases and acceptance criteria

Complete a phase, run its checks, commit, then start the next. Report each phase in 10 lines: what was built, what was decided, what is next.

| Phase | Deliverable | Done when |
| --- | --- | --- |
| 0 Foundation | Repo, tokens, fonts, i18n with RTL switch, router, role guards, mock services, `DECISIONS.md` | Switching language flips layout correctly on a test page; build fails on a missing translation key |
| 1 Design system | All components in 7.6 with a `/design-system` showcase page in both languages | Every component state visible in the showcase; keyboard and focus work |
| 2 Public and access | Screens 4.1 | Request-access form validates and reaches the Pending screen |
| 3 Super Admin | Screens 4.2 | A school can be approved, rejected, suspended; actions change mock state and write audit events |
| 4 School Admin | Screens 4.3 | A submitted paper can be approved or sent back with a comment |
| 5 Teacher and Studio | Screens 4.4 and section 6 | A teacher builds a complete paper end to end, submits it, prints it, and sees it change status |
| 6 Shared screens | Screens 4.5 | Every role reaches Profile, Settings, History, Notifications, Help |
| 7 Polish and QA | Responsive, accessibility, empty/error states, visual QA | Section 12 checklist all green |

## 12. Quality bar

- **Responsive:** verified at 390, 768 and 1280 px in both Urdu and English for every screen.
- **Accessibility:** WCAG 2.2 AA. Visible focus rings (2px `ink-700` with 2px offset), minimum touch target 44px, text contrast 4.5:1, proper labels, landmarks, `aria-current` on active nav/step, status never colour-only, form errors announced.
- **Visual QA:** automated screenshots of every screen at the three widths in both languages (Playwright); review for clipped text, mixed-direction bugs, overlapping elements, faded or low-contrast text.
- **Tests:** unit tests for validation and lifecycle rules (paper status transitions, marks totals), component tests for Table, Stepper, PatternEditor, and one end-to-end test for the Teacher flow.
- **No dead ends:** every button does something (navigates, opens a dialog, or shows a toast explaining it is mocked). Every list has a designed empty state with a next action.

## 13. Later (do not build now)

Real authentication, question-bank import and validation pipeline, payments, email/SMS, parent or student portals, dark mode, offline-first sync, analytics beyond section 4.3 Reports.

## 14. Kickoff prompt for the agent

Paste this as the first message to the implementation agent, together with this document:

> You are the lead front-end engineer for PaperBuilder. Read the attached Platform Blueprint v1 fully before writing code. Work phase by phase (section 11). Do not ask me design questions: the blueprint decides colours, type, spacing, layout and copy structure; when something is missing choose the conventional option and log it in DECISIONS.md. Do not reuse the earlier prototype's look. Start with Phase 0 and Phase 1 only, then stop and give me a 10-line report plus screenshots of the design-system showcase in Urdu and English at 390 and 1280 px. I will approve before you start Phase 2.

## 15. Assumptions to confirm (owner)

1. Roles are Super Admin, School Admin, Teacher. Add any others from the owner's existing project brief.
2. Approval step is configurable per school, default on.
3. Plan names and quotas are placeholders until the owner decides pricing.
4. Digit style defaults to Latin numerals.
