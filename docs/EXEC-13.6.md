# EXEC-13.6: Progress kept across program imports (v1.0, Oct 11, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly and touch only what they name; no new dependencies, no change to `package.json` or `package-lock.json`. The code and its tests were prototyped and checked in chat and arrive as two patches: apply each exactly; if one does not apply cleanly, STOP and report, do not hand-merge. Nothing under `.github/` changes. If a step would touch `main` directly, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". After task 2, read `docs/DECISIONS.md` D-095 and D-096. No file or commit may name the owner (D-091 rule 2): run the identifier list where task 6 says. No real API key and none of the owner's data in any test, script, log or report.

Three commits on a branch, each passing `npm run verify`, `npm run lint` and the full test suite on its own: A contracts, B the code, C the tests.

Working directory: `~/Code/BYOB-fit-org`.

## Tasks

1. Baseline. `git checkout main && git pull && git checkout -b small-13.6`. `git log --oneline -1` must show `486a05b`; STOP if not. `git config user.name` must be "BYOB-fit maintainers" and `git config user.email` noreply@byob-fit.invalid; STOP if not. Write `docs/EXEC-13.6.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` 0cb207662bdb6da9d976ebea12f9bc6e, `docs/DECISIONS.md` c317c0a07d39bdc378dd1fd551c64452, `docs/EXEC-13.5.md` a03259e64c8819119eeb4a04686e001c; STOP if any differ. The full test suite reports 762 tests.

2. Place by md5 from `~/Downloads` (older files of the same names exist): `docs/PLAN.md` 9082f7b02a3d935f5aee54c49aea5122, `docs/DECISIONS.md` 707e99f07b23aa0ce802fc8014c82f36. Re-hash both in the repo; STOP if either differs. Commit A with `docs/EXEC-13.6.md`: `Contracts: plan v1.33, D-096, EXEC-13.6`.

3. Commit B, the code. Find `fixes-13.6.patch` in `~/Downloads` by md5 546fb7fd3869af7f07f167b9e1972e1c; STOP if absent; never commit it. `git apply --check`, then `git apply`. `git diff --stat` must show 14 files, 368 insertions, 84 deletions, all under `src/`, including the new `src/lib/programHistory.ts`; STOP if not. The suite reports 762 tests passing; lint and verify pass. Commit: `13.6 B: Progress kept across program imports (D-095, D-096)`.

4. Commit C, the tests. Find `tests-13.6.patch` in `~/Downloads` by md5 4696bf9d1bd3c3345f4fa78e54e30b92; STOP if absent; never commit it. `git apply --check`, then `git apply`. It adds exactly `src/lib/programHistory.test.ts` and `tests/programHistory.test.ts` (133 insertions); STOP if anything else changes. The suite reports 779 tests passing; lint and verify pass. `npm run build` then gives `index-9FgGPl30.js` 3d4d9dc6e9096def50edd0abacfbe4e0 and `index-C5vp0iOg.css` 0d694dd3db4e7b5e475312be81a7b4ab (chat's build of the same tree); report yours either way. Commit: `13.6 C: tests for D-095 and D-096`.

## Checks and report

5. After commit C, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, against `npm run build` and `vite preview`, service workers blocked, browser clock Monday, Oct 12, 2026, 08:00 local. Test data, made in the scratchpad and never committed: `public/sample-program.json` (id `sample-3day`, start 2026-09-06); a copy of it with `startDate` 2026-10-04 and `name` "Second program". Evidence in the report.
   a. Import the sample through Import. In IndexedDB `byob-fit`, add a finished session `2026-09-28__mon` (week 4, item `s006`, one set 60 × 8) with no `programId`. Reload: the session now has `programId` `sample-3day`; `meta.programHistory` lists `sample-3day` as program 1.
   b. With one program, Progress → Training reads "Week 5 review"; the calendar rows read 1 to 6 with no "Program" heading.
   c. Import the copy: both programs are stored (`sample-3day` from 2026-09-06, `sample-3day-2` from 2026-10-04); the list numbers them 1 and 2; the active program is `sample-3day-2`; the old session still has `programId` `sample-3day`.
   d. Progress → Training reads "Program 2 · Week 1 review" and the score card "Program 2 · Week 1 · training". The calendar shows "Program 1" over rows 1 to 4 and "Program 2" over rows 1 and 2; row 4's Monday is Done. Every week number and heading sits on one line.
   e. Nutrition and Body headers read the same review week. The exercise page for `bench-press` still shows its history, and no stored session's `programWeek` changes.
   f. Backup round trip: export a backup, restore it on a fresh profile: `meta.programHistory` and every session's `programId` come back unchanged, and Progress reads as in d.
   g. Regression: 13.5's checks 5a to 5e and 13.4's checks 5a to 5g; no policy violation on any route; `npm audit` reports 0.
   h. No user-facing text added by this change contains an em dash or a straight apostrophe.

6. Identifier list: `~/Downloads/blocklist-14.txt` by md5 a620339736c93c9b58ebc245459e7846, never committed or copied. Run it, case-insensitive, over every file of the branch and over `git log main..HEAD --format='%an %ae %cn %ce%n%B'`: the only match is the `LICENSE` copyright line; report line numbers only. `git diff --stat main`: only the files of tasks 2 to 4; nothing under `.github/` or `seed/`.

7. Push `small-13.6` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.6: Progress kept across program imports"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
