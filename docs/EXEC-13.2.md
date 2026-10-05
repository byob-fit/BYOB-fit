# EXEC-13.2: Fixes from Oct 4 screenshots (v1.0, Oct 5, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly and touch only what they name; no new dependencies. The code change was prototyped and checked in chat and is delivered as a patch: apply it exactly, do not rewrite or improve it. If it does not apply cleanly, STOP and report; do not hand-merge. Do not touch any Dependabot pull request or branch; nothing under `.github/` changes. If a step would delete files beyond those named, touch `main`, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". Read `docs/DECISIONS.md` D-089 and `docs/SCORES.md` Part 1 rule 7 after task 2 has placed them.

Two commits after the contracts commit, each passing `npm run verify`, `npm run lint` and the full test suite on its own: B (task 3, the patch) and C (task 4, tests).

Working directory: `~/Code/BYOB-fit`.

## Tasks

1. Branch and baseline. `git checkout main && git pull && git checkout -b small-13.2`. `git log --oneline -1` must show `9b18f14`; STOP if not. Write `docs/EXEC-13.2.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` c9f486f587277fa19032c50cd2e2e1df, `docs/DECISIONS.md` 5991274d7c575d904e8b79ed7a47035f, `docs/SCORES.md` 58305c1c8d40a2f0d5d8648124268cb3, `docs/EXEC-13.1.md` b71f3853d7f65818c156134ed953eff7; STOP if any differ. `npx vitest run` reports 702 tests.

2. Place by hash from `~/Downloads` (older downloads of the same names exist; identify by md5): `docs/PLAN.md` d860934e7ee26c2b5774f38fb58b897e, `docs/DECISIONS.md` 6de920a61bcf9ba5fdcf0fd94c05dfa3, `docs/SCORES.md` e7cdae609e27184d811228098333051c. Re-hash all three; STOP if any differs. Commit with `docs/EXEC-13.2.md`: `Contracts: plan v1.28, D-089 and D-090, scores rule 7, EXEC-13.2`.

### Commit B: the patch (D-089)

3. Find `fixes-13.2.patch` in `~/Downloads` by md5 c231971ec00d81e2fbb2e84193eb7fa1; STOP if absent. Do not commit the patch file. Run `git apply --check`, then `git apply`. `git diff --stat` must show exactly: `src/App.tsx` (+2), `src/lib/scores.ts`, `src/nav/ScrollManager.tsx` (new, 53 lines), `src/screens/LogScreen.tsx`, `src/screens/ProgressScreen.tsx`, `src/ui/TabBar.tsx`, `src/ui/v3.css`: 7 files, 98 insertions, 43 deletions; STOP if it differs. Verify, lint and the 702 tests must pass unchanged. Commit: `13.2 B: page position on screen change, shared chart, scores start at first entry (D-089)`.

### Commit C: tests

4. Add tests (new files only) for:
   a. `ScrollManager`: a forward navigation scrolls to 0 and releases a focused input; Back restores the stored position, including when the page becomes tall enough only after a delay under one second.
   b. `countedDates` with a start date, with `null` (nothing counted) and without one (unchanged); `trainingStart` ignores unfinished and ended empty sessions; `nutritionStart` ignores days without parsed items.
   c. SCORES.md Part 1 rule 7's worked example: weeks 1 to 7 have no training score and week 8's adherence is 4 ÷ 4.
   d. The calendar state is "notstarted" before the first finished workout and "missed" after it; rest days stay "rest".
   e. The exercise page renders the shared `LineChart` (a source check is acceptable) and a single point is centred.
   Commit: `13.2 C: tests for D-089`.

## Checks and report

5. After commit C, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, evidence in the report:
   a. `npm run verify` passes with the task 2 md5s; `npm audit` reports 0; the test count is above 702.
   b. Progress > Training: scroll to the exercise list, focus the search, type "Bench", open Barbell bench press, go Back. Three times: the exercise opens at the top with no focused element, and Back returns to the list's position (report the numbers). Note that the iOS keyboard cannot be reproduced on a desktop; the device check decides.
   c. An exercise with one session: the "Top-set weight" dot is round and inside the chart.
   d. With data whose first finished workout is in week 2: week 1's calendar cells show Not started (dashed), the legend lists Not started, and week 1 has no training score in the trend.
   e. Regression: 13.1's tile chip and the Plan sheet's "+ Add exercise" at 44 px; 11.9 checks b, d and f; no policy violation in the console on any route.
   f. `git diff --stat main`: only the files of tasks 2 to 4, nothing under `.github/` or `seed/`.

6. Push `small-13.2` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.2: fixes from Oct 4 screenshots"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
