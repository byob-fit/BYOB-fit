# EXEC-14: Snapshot to the organisation (v1.0, Oct 5, 2026)

You are the execution pipeline for BYOB-fit. This task creates the public repository `byob-fit/BYOB-fit` from a redacted snapshot of the existing local copy, as decided in D-091 (it arrives with the snapshot). Follow the tasks exactly. Nothing in the existing repository changes: do not push to it, change its settings, or edit its working copy. Do not put the identifier list or the patch file into any repository. If any check fails, STOP and report; do not work around it. Routine choices inside scope: decide, proceed, list under "Judgment calls".

Existing local copy: `~/Code/BYOB-fit`. New local copy: `~/Code/BYOB-fit-org`.

## Tasks

1. Baseline. In `~/Code/BYOB-fit`: `git fetch`; `git rev-parse origin/main` must start with `2b87ff6`; STOP if not. Confirm the pasted text of this prompt has the md5 the owner gives; STOP if it differs (keep it as a file outside both repositories until task 7).

2. Inputs from `~/Downloads`, by md5 (older files of similar names may exist): the redaction patch `snapshot-14.patch` 61a170b5587c123b40cf442abea55702 and the identifier list `blocklist-14.txt` a620339736c93c9b58ebc245459e7846. STOP if either is missing or differs.

3. Snapshot tree. `~/Code/BYOB-fit-org` must not exist; STOP if it does. Then:
   ```
   mkdir ~/Code/BYOB-fit-org
   git -C ~/Code/BYOB-fit archive 2b87ff6 | tar -x -C ~/Code/BYOB-fit-org
   cd ~/Code/BYOB-fit-org && git init -b main
   git apply --check <patch> && git apply <patch>
   git add -A && git write-tree
   ```
   The tree hash must be `b1be6526d2e4b292d1cb16ab0c5f4f9c04b2af63` and `git ls-files | wc -l` must be 234; STOP if either differs. This proves the tree is byte-identical to the one checked in chat.

4. Identifier check. `git grep -I -i -E -f <identifier list> -- .` must print exactly one line: the copyright line of `LICENSE`, which names the owner by their choice (D-091 rule 3). Any other match: STOP and report the file and line number only, not the matched text.

5. Health. `npm ci`; the full test suite reports 722 tests passing; `npm run lint` is clean; `npm run verify` passes. The built `dist/assets/` holds `index-Dtrk_bUl.js` md5 09b1bf5e21032a8906ece1b83e90c264 and `index-CoyCEQpo.css` md5 e63c6939b41284e8ddc376d02dbc2b33; STOP if not.

6. Snapshot commit. Set this repository's local git identity: `git config user.name "BYOB-fit maintainers"` and `git config user.email noreply@byob-fit.invalid` (D-091 rule 5). Commit: `BYOB-fit: initial snapshot (D-091)`. Then `git rev-parse HEAD^{tree}` must still be the task 3 hash, and running the identifier list against `git log --format='%an %ae %cn %ce %s'` must match nothing.

7. Contracts commit. Write this prompt as `docs/EXEC-14.md` and confirm its md5 again. Run the identifier list over it: no match. Commit: `Contracts: EXEC-14`.

8. Publish. `gh repo create byob-fit/BYOB-fit --public --source . --remote origin --push`. If the GitHub CLI has no access to the organisation, STOP and report: the owner authorises it and you rerun this task only. Then `git ls-remote origin main` must equal the local `HEAD`. The deploy workflow will run on this push and is expected to fail at the deploy step until the owner turns on Pages; report its status, do not change the workflow.

## Report

PASS or FAIL per task with evidence: the tree hash, both commit hashes, the file count, the identifier check results (line numbers only), the test count, the two asset md5s, the remote's `main`, and the workflow run's status. Then Judgment calls, then anything noticed but not changed.
