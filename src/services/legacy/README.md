# Legacy domain (reference only)

The board-paper engine merged from the old PaperBuilder (Gemini merge,
2026-11-24) lives here for reference. It is NOT used by the app: no
screen, service or component imports anything under this folder, and the
tests here only check the code itself.

- `board-paper.ts` — board pattern presets + paper totals (legacy engine)
- `question-selection.ts` — assembles a board paper from a bank (legacy)
- `subjects.ts` — board subject assets with textbook-cover image paths
  (the images are textbook covers; usage rights unconfirmed — see
  DECISIONS.md)

The Studio engine in `../studio.ts` is the single paper engine. Do not
wire `assembleBoardPaper` or `BOARD_PATTERN_PRESETS` into any screen.
