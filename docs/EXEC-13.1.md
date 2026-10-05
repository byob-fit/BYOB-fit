# EXEC-13.1: Identity and fixes (v1.0, Oct 4, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly, touch only what they name, no new dependencies. Every colour, size and file below was prototyped and checked in chat on `main` (f766e5c); use these values, do not choose others. Do not touch any Dependabot pull request or branch; nothing under `.github/` changes. If a step would delete files beyond those named, touch `main`, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". Read `docs/DECISIONS.md` D-069, D-083, D-087 and D-088 after task 2 has placed it.

Two commits after the contracts commit, each passing `npm run verify`, `npm run lint` and the full test suite on its own: B (tasks 3 to 6, identity) and C (tasks 7 to 10, fixes).

Working directory: `~/Code/BYOB-fit`.

## Tasks

1. Branch and baseline. `git checkout main && git pull && git checkout -b small-13.1`. `git log --oneline -1` must show `f766e5c`; STOP if not. Write `docs/EXEC-13.1.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` 08579e2d91197fa415f8faccc4495c91, `docs/DECISIONS.md` ae2efdac7a686790e0d49aa0a5b86fd8, `docs/EXEC-13-rework.md` d6d328899d5561f0f037f6e012a67532; STOP if any differ. `npx vitest run` reports 681 tests.

2. Place by hash from `~/Downloads` (older downloads of the same names exist; identify by md5): `docs/PLAN.md` c9f486f587277fa19032c50cd2e2e1df, `docs/DECISIONS.md` 5991274d7c575d904e8b79ed7a47035f. Re-hash both; STOP if either differs. Commit with `docs/EXEC-13.1.md`: `Contracts: plan v1.27, D-087 and D-088, EXEC-13.1`.

### Commit B: identity (D-087)

3. Icons. Place by hash from `~/Downloads`, replacing files of the same name: `public/icon.svg` 6cfad95c9fb18f76938528984a0b2627; `design/icon-maskable.svg` 579142575063be489845973f6670e140; `public/pwa-192.png` b3f126321ff863a86256eb44be1d1418; `public/pwa-512.png` 64c131c8770341eabf09d112afbf2695; `public/apple-touch-icon.png` 16e2ccd2af9f92807a511e007a476931; `public/pwa-maskable-192.png` 33390a0a74dd1b1c8a7f40c9cacba5a6; `public/pwa-maskable-512.png` 9f87038f6b907575ebb338663e6ed91b. Re-hash all seven; STOP if any differs.

4. Manifest and page (`vite.config.ts`, `index.html`): `theme_color` and `background_color` become `#1d1d1f` (comment: D-087, the brand black matching the icon). The two `purpose: 'maskable'` entries point at `pwa-maskable-192.png` and `pwa-maskable-512.png`; the two `any` entries are unchanged. The `apple-touch-icon` link points at `/BYOB-fit/apple-touch-icon.png`. The inline script that sets the page's `theme-color` per mode is unchanged.

5. Tokens and styles. In `src/index.css`, light: `--tabbar: #1d1d1f; --tabbar-edge: #2c2c2e; --tab-inactive: #a1a1a6; --tab-active: #fdfcf9; --tab-pill: transparent`. Both dark blocks (the `prefers-color-scheme` one and `:root[data-theme='dark']`): `--tabbar: #a2aaad; --tabbar-edge: #8c9497; --tab-inactive: #3a3a3c; --tab-active: #000000; --tab-pill: #ffffff`. In `src/ui/v3.css`: `.tab--active` adds `background: var(--tab-pill); border-radius: 22px; margin: 0 6px`; `.wordmark` colour `var(--ink)`; `.wordmark__plate` border colour and `.wordmark__plate span` background `currentColor`. `--navy` stays only on `.ai-tag`, `.ai-banner__text` and `.ob-tip`; list any other use you find under Judgment calls and leave it unchanged.

6. Tests and commit B: the seven files by md5; the manifest's icons and colours; the touch icon link; the tab tokens per mode (light, system dark, chosen dark); the wordmark uses no navy. Commit: `13.1 B: identity, brand black, tab bar, wordmark, icon (D-087)`.

### Commit C: fixes (D-088)

7. Add exercise on the tile (D-088 rule 1). In the deck's tool row (`.dk-tools`), a `chip dk-tool` button "+ Add exercise" directly after Swap, on every tile that shows Swap. It opens the same Add exercise list as the Plan sheet (`setAdding(true)`), and the added exercise goes right after the current one (D-069 rule 7). Test that the button renders after Swap and opens the list.

8. Cardio minutes box (D-088 rule 2). First reproduce in WebKit at 390 × 844 and at 375 × 667: seed a program whose day has a cardio item prescribed in minutes, open it in the deck, set 24 minutes, and record a screenshot and the box's and text's measured widths. Then apply the candidate fix in `.cardio-panel__input` (`width: 3ch; min-width: 3ch; padding: 0; font-variant-numeric: tabular-nums`, replacing `width: 110px`) and measure again with 24 and 120. If the reproduction shows another cause (for example the + button covering the value), fix that cause instead and say so. Evidence before and after in the report.

9. Plan sheet height (D-088 rule 1). In WebKit at 390 × 844 and 375 × 667, with 12 exercises on the day: "+ Add exercise", "Change today's workout" and "End workout" are visible without scrolling the page and each responds to a tap. If any is cut off, fix the sheet's height and bottom padding (use `dvh` and the bottom safe area) and report what changed; if all pass, change nothing.

10. Tests and commit C: the cardio box holds three digits at 56 px; the tile chip; any Plan sheet change. Commit: `13.1 C: Add exercise on the tile, cardio minutes box (D-088)`.

## Checks and report

11. After commit C, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, evidence in the report:
   a. `npm run verify` passes with the task 2 md5s; `npm audit` reports 0; the test count is above 681.
   b. The served `manifest.webmanifest` lists the new icons and colours; each icon URL returns 200 with the task 3 md5.
   c. Screenshots, light and dark, of every tab with the tab bar visible, the deck tile with "+ Add exercise", the cardio box at 24, and the Plan sheet with 12 exercises, under `phase13.1-screens/`.
   d. Regression: 11.9 checks b, d and f; Phase 13's in-progress bar and its return to the deck; no policy violation in the console on any route.
   e. `git diff --stat main`: only files these tasks named, nothing under `.github/` or `seed/`.

12. Push `small-13.1` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.1: identity and fixes"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
