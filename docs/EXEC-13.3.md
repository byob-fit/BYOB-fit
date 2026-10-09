# EXEC-13.3: Timer, summary, text (v1.0, Oct 8, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly and touch only what they name; no new dependencies. The code change was prototyped and checked in chat and arrives as a patch: apply it exactly; if it does not apply cleanly, STOP and report, do not hand-merge. Nothing under `.github/` changes. If a step would touch `main` directly, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". After task 2, read `docs/DECISIONS.md` D-092. No file or commit may name the owner (D-091 rule 2): run the identifier list where task 7 says.

Four commits on a branch, each passing `npm run verify`, `npm run lint` and the full test suite on its own: A contracts, B the patch, C the audit fix, D tests.

Working directory: `~/Code/BYOB-fit-org`.

## Tasks

1. Baseline. `git checkout main && git pull && git checkout -b small-13.3`. `git log --oneline -1` must show `f658b39`; STOP if not. `git config user.name` must be "BYOB-fit maintainers" and `git config user.email` noreply@byob-fit.invalid; STOP if not. Write `docs/EXEC-13.3.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` 1a4fee38b020ab853265561cb91c53e8, `docs/DECISIONS.md` 8f3cb2da93a00e9b972bc0c16599cbeb, `docs/EXEC-14.md` 430a5035321a44354c3558bd6f1cc532; STOP if any differ. The full test suite reports 722 tests.

2. Place by md5 from `~/Downloads` (older files of the same names exist): `docs/PLAN.md` 3d3824334dc822e1e8f7919f586e47dd, `docs/DECISIONS.md` 4c57fd8d055d9e2cb2fc5eb09ba6ba56. Re-hash both; STOP if either differs. Commit A with `docs/EXEC-13.3.md`: `Contracts: plan v1.30, D-092, EXEC-13.3`.

3. Commit B, the patch. Find `fixes-13.3.patch` in `~/Downloads` by md5 76a637fab359e89403664047fbe64a95; STOP if absent; never commit it. `git apply --check`, then `git apply`. `git diff --stat` must show 38 files, 235 insertions, 118 deletions, all under `src/`, including the new `src/lib/deckScroll.ts`; STOP if not. The suite reports 724 tests passing; lint and verify pass. Commit: `13.3 B: timer for left/right holds, summary lists, text standards (D-092)`.

4. Commit C, the audit fix (D-092 rule 9). Run `npm audit fix`. The only change allowed is `package-lock.json`, and within it only the `node_modules/source-map-js` entry (1.2.1 to 1.2.2, with its `resolved` and `integrity`). Any other version change, an added or removed package, or a change to `package.json`: STOP, revert with `git checkout -- package.json package-lock.json`, and report what it wanted to change. `npm audit` then reports 0; tests, lint and verify pass. Commit: `13.3 C: source-map-js 1.2.2 (npm audit fix)`.

5. Commit D, tests (new test files only):
   a. `parseDeckState` keeps a valid `hold` and ignores a malformed one; a running hold written and read back round-trips.
   b. Source checks that both hold buttons use `holdRow`, that starting a timer calls `stopHolds()` first, that a running box's focus calls `stopHolds()`, and that `saveRow` reads a running hold for its row.
   c. The summary tiles render as three buttons with `aria-pressed`, a zero-count tile disabled.
   Commit: `13.3 D: tests for D-092`.

## Checks and report

6. After commit D, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, evidence in the report. Test data, made in the scratchpad and never committed: `public/sample-program.json` with the `single-leg-stance` item (a left/right hold, 3 × 30 s) moved into the main section of the day the browser clock is set to, imported through Import.
   a. Open the hold: the panel reads "Set 1, left side. Start when you’re in position."
   b. Start, wait 2 s, Stop and log: left is logged and the panel reads "Set 1, right side…". Start again: "Holding, set 1, right side."
   c. Tap the running right box: the timer stops, the box holds the seconds and is not read-only; type 31 and tick: Set 1 shows "L … s · R 31 s" and the panel moves to Set 2, left side.
   d. "Log 30 s without the timer" logs Set 2 left and moves to the right side.
   e. Start a timer, jump to another exercise from the Plan sheet, come back: no timer runs and the box holds the time as an editable value. Start a timer, switch to the Progress tab and back: the timer is still running.
   f. Never two running: after each step above, at most one box shows a running clock.
   g. With a previous week seeded so the summary has up, same and down exercises: each tile lists its own; a zero tile is disabled.
   h. Text: the safety screen reads "BYOB-fit does not give medical advice" and "physical therapist"; Meals shows "fiber"; no user-facing text contains "fibre", "judgement" or an em dash.
   i. Regression: 13.2's Back position and chart dot; 13.1's tile chip; 11.9 checks b, d and f; no policy violation on any route; `npm audit` reports 0.
   j. Identifier list: `~/Downloads/blocklist-14.txt` by md5 a620339736c93c9b58ebc245459e7846, never committed or copied. Run it over every file of the branch and over `git log main..HEAD --format='%an %ae %cn %ce%n%B'`: the only match is the `LICENSE` copyright line; report line numbers only.
   k. `git diff --stat main`: only the files of tasks 2 to 5; nothing under `.github/` or `seed/`.

7. Push `small-13.3` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.3: timer, summary, text"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
