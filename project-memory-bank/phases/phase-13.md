# Phase 13 — CI / GitHub Integration

## Objective

Per [[13-roadmap]]'s Phase 13 row: "CI / GitHub Integration — only after the core system is
reliable." This round's user-specified exit criterion: "automated runs wired into CI, cross-user
report comparison/hosting."

## Scope narrowing

Two constraints carried forward from every prior phase shaped this round: no live comparison run
against a real, paid LLM has ever been executed (still gated on a separate future approval — CI
must never trigger one automatically, no secrets, no recurring cost), and [[04-architecture]]'s
local-first mandate rules out any new database/queue/service/cloud infrastructure. "Automated runs
wired into CI" is therefore satisfied by making Phase 12's free, zero-credential `reproduce:smoke`
a required CI step, not a live LLM job. "Hosting" is satisfied by GitHub Pages publishing
already-generated static files — GitHub operates the hosting, EEP runs nothing. "Cross-user report
comparison" is satisfied by a new, purely local, offline diff CLI — no upload, no server.

## Implemented

**CI workflow** (`.github/workflows/ci.yml`): on `push`/`pull_request` to `main`, matrix Node
20.x/22.x on `ubuntu-latest`, `permissions: contents: read`, a `concurrency` group to cancel
superseded runs. Steps: checkout, setup-node (with npm cache), `npm ci`, `npm run build`,
`npm run lint`, `npm test`, then `node dist/experiments/runSmokeReproduction.js` run directly
(not via the `npm run reproduce:smoke` script, which would trigger a redundant second, non-
incremental `tsc` build). This last step is the genuine "automated run": every CI execution is an
independent machine re-proving the real harness/verifier/metrics/analysis/report/dashboard
pipeline reproduces identically against the Phase 12 reference. Confirmed safe for `pull_request`
from forks (no secrets, no network, no `process.env`/`EEP_LLM_*` reads — explicit
`{provider: 'fake-deterministic'}`). On failure, `experiment-results-smoke/`/`reports-smoke/` are
uploaded as a build artifact for debugging.

**GitHub Pages workflow** (`.github/workflows/pages.yml`): `workflow_dispatch`-only trigger (not
automatic — Pages isn't enabled in repo Settings yet, and an auto-triggered deploy against an
unconfigured repository would fail loudly on every push). Current, non-deprecated two-job pattern:
`build` (`actions/configure-pages`, `actions/upload-pages-artifact` over `docs/`), `deploy`
(`needs: build`, `actions/deploy-pages`, `github-pages` environment,
`permissions: pages: write, id-token: write`). New `docs/index.html` — a small, hand-authored,
self-contained landing page (the Pages site root would otherwise 404) linking to
`sample-dashboard.html` and the two Markdown docs, with a prominent "no real result published yet"
notice.

**Cross-user report comparison** (`src/experiments/`): `independentRunDiff.ts` (98 lines) — pure
`diffEntrySets(a, b): RunSetDiff`, a **symmetric** diff (matched / differs-with-per-field-detail /
onlyInA / onlyInB, no verdict), deliberately not reusing `compareRunResults.ts`'s
`compareReferenceEntries()` (asymmetric reference-vs-actual/ECC-informational/pass-fail semantics
that don't apply between two peer users). Also `formatDiffMarkdown()`, a small purpose-built
summary formatter (not a general Report export). `compareIndependentRuns.ts` (129 lines) — the
`npm run report:compare` CLI, mirroring `runSmokeReproduction.ts`'s established pattern (pure
async function, separate `printSummary`, `isMainModule` tail using `process.exitCode`). Manual
flag parsing: `--a-dir`/`--a-experiment`/`--b-dir`/`--b-experiment` (experiment ids optional,
default to `latestExperimentId()`), `--out <path>` (writes a Markdown summary; omitted means
stdout-only). Two users exchange their `<resultsDir>/<experimentId>/` directory out-of-band
(email, drive, git) — nothing is uploaded. `compareRunResults.ts` was refactored
(behavior-preserving) to extract and export the shared per-field comparison logic as
`diffEntryFields()`/`FieldDifference`, reused by both `compareReferenceEntries()` and
`diffEntrySets()`.

**Documentation:** `docs/REPRODUCING.md` gained "Cross-user comparison" and "Publishing to GitHub
Pages" sections; its "Current limitations" list gained two items (untested against real
independent users; the Pages workflow untested against a real deployment) and item 2 now notes CI
continuously re-runs the smoke reproduction. `README.md` gained a CI status badge and a
"Continuous Integration" section; Status bumped to "Phase 13 of 13."

## Tests

8 new tests across 2 new files (335 total, up from 327, across 87 files): `independentRunDiff.test.ts`
(5 tests — matched/differing-with-field-detail/onlyInA-onlyInB, Markdown formatter content and
its omit-empty-sections behavior), `compareIndependentRuns.test.ts` (3 tests — explicit experiment
ids bypass `latestExperimentId`, fallback to it when omitted, `--out` writes only when given).
Existing `compareRunResults.test.ts` (5 tests) passes unmodified after the `diffEntryFields`
extraction, confirming the refactor was behavior-preserving.

## Validation

- `npm run build && npm run lint && npm test` — clean, 335/335 tests passing across 87 files, zero
  lint errors.
- `rm -rf dist && npm run build` — no test files leak into `dist/`; new CLI entry points
  (`compareIndependentRuns.js`, `independentRunDiff.js`) compiled correctly.
- Line-count check: largest new/edited file `compareIndependentRuns.ts` at 129 lines.
- **Ran the CI step for real, locally**: `node dist/experiments/runSmokeReproduction.js` (exactly
  as `ci.yml` invokes it) — fresh 27-run experiment, all 27 `(taskId, conditionName)` entries
  matched the checked-in reference, `Reproduction PASSED.`.
- **Ran `report:compare` for real, locally**, against that fresh run compared with itself (a
  trivial all-matched case) and with explicit `--out`: 27 matched, 0 differing, Markdown file
  written and its content inspected — confirms the CLI, flag parsing, `latestExperimentId`
  fallback, and Markdown writer all work end-to-end, not just in mocked tests.
- Workflow YAML reviewed for structural correctness and current (non-deprecated) action names —
  **not** verified against a real GitHub Actions execution, since no local runner is available and
  nothing was pushed this round (see "Known limitations").
- `git status --short` reviewed before reporting done; change set matches intent. No commit/push,
  no GitHub Pages Settings change — per Git Safety Protocol.

## Decisions made

ADR-018 in [[14-decisions]]: the CI workflow design (why `reproduce:smoke` is the automated "run,"
why fork PRs are safe, `permissions`/`concurrency` hardening); the explicit deferral of a
`format:check` gate (a Plan-subagent review found ~105 files with pre-existing formatting drift —
adding the gate today would fail CI immediately over a purely cosmetic diff that deserves its own
explicit, disclosed commit, not one bundled silently into this phase); the GitHub Pages design
(manual-opt-in trigger, two-job pattern, framed as compliant with the local-first/no-cloud-infra
constraint since GitHub operates the hosting); the cross-user comparison CLI design (new symmetric
`diffEntrySets` vs. `compareReferenceEntries`'s asymmetric semantics, the shared `diffEntryFields`
extraction, and the `--out`/Markdown design that connects the comparison and hosting halves of this
phase's exit criterion instead of leaving them disjoint — a gap the Plan-subagent review flagged
and this design closes).

## Explicitly not implemented (by design, later work)

- **`format:check` in CI.** Needs its own explicit, disclosed, whole-repo reformat commit first —
  not bundled into this phase.
- **Actually enabling GitHub Pages in repo Settings, or pushing/triggering any workflow.** This
  phase only adds the workflow files; flipping them on is the user's explicit, separately-confirmed
  action (Git Safety Protocol: no push without an explicit ask; enabling a public-facing setting is
  exactly the kind of externally-visible action that needs confirmation).
- **Dependabot, CodeQL/security scanning, branch protection rules, Windows/macOS CI runners.** No
  concrete need demonstrated yet (ADR-004/ADR-009 discipline) — noted as candidate future work.
- **A live-LLM CI job.** Would need stored secrets and incur real, recurring API cost on every
  push — never automated.
- **A general Report-to-CSV/Markdown/HTML export pipeline.** Unchanged Phase 9 roadmap backlog
  item; the new Markdown formatter here is narrowly for the comparison-diff summary only.

## Known limitations

- The new workflow YAML is unverified against a real GitHub Actions execution — reviewed for
  structural correctness and current action versions, but nothing has been pushed this round.
  Verify on first real push/PR before relying on the CI badge's status.
- `report:compare` has only been exercised against a single user's own data compared with itself
  (an all-matched trivial case) plus mocked unit tests — not yet between two genuinely independent
  real users' results.
- The Pages workflow cannot be end-to-end verified until the repository owner enables Pages in
  Settings, a deliberately manual step this implementation does not take.
- `docs/index.html` links to `BENCHMARK.md`/`REPRODUCING.md` as raw GitHub URLs, not as
  Pages-served Markdown, since the site has no Markdown renderer (no Jekyll/build step was added,
  consistent with the "no new dependency" static-file discipline already established for the
  dashboard, ADR-015).

## Risks discovered

No new risk-register row needed. This phase adds CI/Pages/comparison tooling around the existing,
already-tested pipeline without changing any schema, harness, verifier, metrics, reporting, or
dashboard logic — it introduces no new risk category [[16-risks]] tracks. The pre-existing
formatting-drift discovery (105 files) is tracked as a [[17-known-limitations]] item, not a risk.

## Status

Complete (this round's scope: CI wiring around the real pipeline, a manual-opt-in GitHub Pages
hosting mechanism, and an offline cross-user comparison CLI). Pending user approval before pushing
anything to GitHub, enabling Pages in repo Settings, executing a live comparison run, or a
dedicated `format:check` reformat pass.
