# EXEC-13.5: Key test and model replies (v1.0, Oct 11, 2026)

You are the execution pipeline for BYOB-fit. Implement the numbered tasks exactly and touch only what they name; no new dependencies, no change to `package.json` or `package-lock.json`. The code and its tests were prototyped and checked in chat and arrive as two patches: apply each exactly; if one does not apply cleanly, STOP and report, do not hand-merge. Nothing under `.github/` changes. If a step would touch `main` directly, commit anything under `seed/`, or needs a choice not covered here, STOP and ask. Routine choices inside scope: decide, proceed, list under "Judgment calls". After task 2, read `docs/DECISIONS.md` D-094. No file or commit may name the owner (D-091 rule 2): run the identifier list where task 6 says. No real API key may appear in any test, script, log or report: every check intercepts api.anthropic.com.

Void files: `~/Downloads` may hold older files for this change under the names `EXEC-13.4.md`, `DECISIONS.md`, `PLAN.md` and `fixes-keytest.patch` (D-094 lists their hashes). Place files only by the hashes below.

Three commits on a branch, each passing `npm run verify`, `npm run lint` and the full test suite on its own: A contracts, B the code, C the tests.

Working directory: `~/Code/BYOB-fit-org`.

## Tasks

1. Baseline. `git checkout main && git pull && git checkout -b small-13.5`. `git log --oneline -1` must show `0d7b381`; STOP if not. `git config user.name` must be "BYOB-fit maintainers" and `git config user.email` noreply@byob-fit.invalid; STOP if not. Write `docs/EXEC-13.5.md` from the pasted text and confirm its md5 against the owner's value; STOP if it differs. Confirm on `main`: `docs/PLAN.md` 5c6d434a6f658cedce79268d864e3fcd, `docs/DECISIONS.md` 58ab09ff9aa1ca27376475f85454e8dd, `docs/EXEC-13.4.md` 0bf6ec2803fbb0fb73528bdfded4f84b; STOP if any differ. The full test suite reports 756 tests.

2. Place by md5 from `~/Downloads`: `docs/PLAN.md` 0cb207662bdb6da9d976ebea12f9bc6e, `docs/DECISIONS.md` c317c0a07d39bdc378dd1fd551c64452. Re-hash both in the repo; STOP if either differs. Commit A with `docs/EXEC-13.5.md`: `Contracts: plan v1.32, D-094, D-095, EXEC-13.5`.

3. Commit B, the code. Find `fixes-13.5.patch` in `~/Downloads` by md5 e7248c766516585983e329fc9966fcb9; STOP if absent; never commit it. `git apply --check`, then `git apply`. `git diff --stat` must show 3 files, 23 insertions, 5 deletions: `src/ai/useWeekReview.tsx`, `src/lib/anthropic.ts`, `src/screens/AiSettingsScreens.tsx`; STOP if not. The suite reports 756 tests passing; lint and verify pass. Commit: `13.5 B: key test and model replies (D-094)`.

4. Commit C, the tests. Find `tests-13.5.patch` in `~/Downloads` by md5 bd43b5bbba7be83a8009348b3645270e; STOP if absent; never commit it. `git apply --check`, then `git apply`. It changes only `src/lib/anthropic.test.ts` (42 insertions, 1 deletion); STOP if anything else changes. The suite reports 762 tests passing; lint and verify pass. `npm run build` then gives `index-Comkt7lS.js` e68a64891e1ada3e9c7cb25d35abc4a2 and `index-GBAaOpeR.css` 593bdd1e0e1dab310b46b64fcde94726 (chat's build of the same tree); report yours either way. Commit: `13.5 C: tests for D-094`.

## Checks and report

5. After commit C, scripted in WebKit and Chromium at 390 × 844 under the D-066 policy, against `npm run build` and `vite preview`, service workers blocked. Every request to api.anthropic.com is intercepted and answered by the script (with `access-control-allow-origin: *`); none reaches the network. Test data, made in the scratchpad and never committed: `public/sample-program.json` imported through Import, then Settings `apiKey` set in IndexedDB `byob-fit` to a placeholder ending in `1111`. Evidence in the report.
   a. Settings → AI shows "Ends in 1111". Replace, type a placeholder ending in `2222`, Save and test, answered 401 `{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}`: the alert reads exactly "The test didn’t pass, so nothing was saved. 401: invalid x-api-key"; the stored key still ends in `1111`; after Cancel the row still reads "Ends in 1111".
   b. Replace with a placeholder ending in `3333`, answered 200 with `{"content":[{"type":"thinking","thinking":""}],"stop_reason":"max_tokens","usage":{"input_tokens":20,"output_tokens":16}}`: "Key works · tested just now" shows, the stored key ends in `3333`, the row reads "Ends in 3333".
   c. The same 200 thinking-only answer on onboarding's key step (fresh profile, Get started, through to the key step): the test reads "Key works · tested just now".
   d. A network failure (route aborted) on Save and test: an alert shows and the stored key is unchanged.
   e. A week note request answered 200 with a text block and `"stop_reason":"max_tokens"`: the note shows "The reply ran out of room before it finished, so it wasn’t used." The same request answered with `"stop_reason":"refusal"`: "The model declined this request." Report the `max_tokens` value the week note request carried (expected 4096).
   f. Regression: 13.4's checks 5a to 5g; no policy violation on any route; `npm audit` reports 0.
   g. No user-facing text added by this change contains an em dash or a straight apostrophe.

6. Identifier list: `~/Downloads/blocklist-14.txt` by md5 a620339736c93c9b58ebc245459e7846, never committed or copied. Run it, case-insensitive, over every file of the branch and over `git log main..HEAD --format='%an %ae %cn %ce%n%B'`: the only match is the `LICENSE` copyright line; report line numbers only. `git diff --stat main`: only the files of tasks 2 to 4; nothing under `.github/` or `seed/`.

7. Push `small-13.5` and open the pull request **as a draft**: `gh pr create --draft --title "Small change 13.5: key test and model replies"`. Do not mark it ready and do not merge. Report PASS or FAIL per task with evidence and per-commit hashes, then Judgment calls, then anything noticed but not changed.
