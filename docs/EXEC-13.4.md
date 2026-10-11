# EXEC-13.4: Skip an exercise, remove a set, units, reload (v1.0, Oct 10, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly and touch only what they name; no new dependencies, no change to `package.json` or `package-lock.json`. The code and its tests were prototyped and checked in chat and arrive as two patches: apply each exactly; if one does not apply cleanly, STOP and report, do not hand-merge. Nothing under `.github/` changes. If a step would touch `main` directly, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". After task 2, read `docs/DECISIONS.md` D-093. No file or commit may name the owner (D-091 rule 2): run the identifier list where task 6 says.

Three commits on a branch, each passing `npm run verify`, `npm run lint` and the full test suite on its own: A contracts, B the code, C the tests.

Working directory: `~/Code/BYOB-fit-org`.

## Tasks

1. Baseline. `git checkout main && git pull && git checkout -b small-13.4`. `git log --oneline -1` must show `4cf4836`; STOP if not. `git config user.name` must be "BYOB-fit maintainers" and `git config user.email` noreply@byob-fit.invalid; STOP if not. Write `docs/EXEC-13.4.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` 3d3824334dc822e1e8f7919f586e47dd, `docs/DECISIONS.md` 4c57fd8d055d9e2cb2fc5eb09ba6ba56, `docs/SCORES.md` 117956f58bcb34ea4b4235ffbc28519f, `docs/EXEC-13.3.md` 5c21beaf8df99e98260637d929aa795a; STOP if any differ. The full test suite reports 736 tests.

2. Place by md5 from `~/Downloads` (older files of the same names exist): `docs/PLAN.md` 5c6d434a6f658cedce79268d864e3fcd, `docs/DECISIONS.md` 58ab09ff9aa1ca27376475f85454e8dd, `docs/SCORES.md` 9d25568a7b08c8131685fb90ac0798d8. Re-hash all three in the repo; STOP if any differs. Commit A with `docs/EXEC-13.4.md`: `Contracts: plan v1.31, D-093, EXEC-13.4`.

3. Commit B, the code. Find `fixes-13.4.patch` in `~/Downloads` by md5 a26165112a724089f57d385a5060c931; STOP if absent; never commit it. `git apply --check`, then `git apply`. `git diff --stat` must show 13 files, 194 insertions, 93 deletions, all under `src/`; STOP if not. The suite reports 736 tests passing; lint and verify pass. Commit: `13.4 B: skip an exercise, remove a set, Settings unit, reload after End (D-093)`.

4. Commit C, the tests. Find `tests-13.4.patch` in `~/Downloads` by md5 a6227eee8dfe02019318769c00fb1cd4; STOP if absent; never commit it. `git apply --check`, then `git apply`. It adds one file, `src/lib/fixes134.test.ts` (197 insertions); STOP if anything else changes. The suite reports 756 tests passing; lint and verify pass. `npm run build` then gives `index-CUzvhvvd.js` b7a7ce8222128b1541f7c958825c2243 and `index-GBAaOpeR.css` 593bdd1e0e1dab310b46b64fcde94726 (chat's build of the same tree); report yours either way. Commit: `13.4 C: tests for D-093`.

## Checks and report

5. After commit C, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, against `npm run build` and `vite preview`, service workers blocked, browser clock Monday, Oct 12, 2026, 08:00 local (program week 6). Evidence in the report. Test data, made in the scratchpad and never committed: a copy of `public/sample-program.json` with every `unit` field removed, imported through Import; then, in IndexedDB `byob-fit`, Settings `units` set to `lb` and a session `2026-10-05__mon` (week 5, ended) with item `s006` (`bench-press`) logged as 4 sets of 185 × 8. Reload, then:
   a. Today's last-week line for the barbell bench press reads "185 lb × 8, 8, 8, 8"; no "kg" appears for it.
   b. Start the workout and open the barbell bench press from the Plan sheet. Its line reads "last week 185 lb × 8, 8, 8, 8". Save sets 1 and 2 as 190 × 8. The tools row shows "− Remove set 4", 8 px after "+ Add set". Tap it: it becomes "− Remove set 3". Tap it: two rows remain and the chip is gone. "+ Add set" stores `removedSets: 1` and no `addedSets`. Remove again, tap Done: the stored entry has 2 sets and `removedSets: 2` (no set filled from last week).
   c. On the incline dumbbell press, "Skip today": the page reads "Skipped today." with "Undo skip" and "+ Add exercise"; Swap, Felt off and Add set are absent; the rest panel names the next exercise, not a set. "Undo skip" brings the rows and tools back. Skip again, Done.
   d. On the next exercise, the Plan sheet lists the incline dumbbell press as "Skipped" with no tick marker. Save one set there: "Skip today" is no longer offered.
   e. End the workout: the summary reads "… · 2 sets removed" and includes "skipped"; its comparison uses lb and no "kg" appears.
   f. Reload with the summary open: the app lands on Today (`#/`), which reads "2 of 12 exercises".
   g. Progress, Training, "How this is worked out": "Exercises you skip and sets you remove count as not done".
   h. Regression: 13.3's checks 6a to 6f (left/right hold timer), 13.2's Back position and chart dot, 11.9 checks b, d and f; a program whose items carry `kg` still shows kg with Settings on lb; a Discomfort skip still reads "Skipped today: discomfort." and is left out of completeness; no policy violation on any route; `npm audit` reports 0.
   i. No user-facing text added by this change contains an em dash or a straight apostrophe.

6. Identifier list: `~/Downloads/blocklist-14.txt` by md5 a620339736c93c9b58ebc245459e7846, never committed or copied. Run it over every file of the branch and over `git log main..HEAD --format='%an %ae %cn %ce%n%B'`: the only match is the `LICENSE` copyright line; report line numbers only. `git diff --stat main`: only the files of tasks 2 to 4; nothing under `.github/` or `seed/`.

7. Push `small-13.4` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.4: skip, remove a set, units, reload"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
