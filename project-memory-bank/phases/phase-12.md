# Phase 12 — External Reproduction

## Objective

Per [[13-roadmap]]'s Phase 12 row: "External users, independent runs, comparison." Phase 13
("CI/GitHub Integration") is the later, separate phase for automation/hosting — this phase is
about giving an external reader a way to independently run and verify EEP's own pipeline.

## Scope narrowing

No live comparison run against a real, paid LLM has ever been executed (still gated on the user's
own credentials and a separate explicit approval — unchanged since Phase 6). "An external user
independently reproduces a result" therefore cannot mean reproducing a real ECC-vs-native finding
this round — following the same narrowing pattern Phases 9/10/11 already established, this round's
concrete, non-overclaiming interpretation is: a free, zero-credential "smoke reproduction" that
exercises the *real* harness → agent → verifier → metrics → Phase 7/8 analysis → Phase 9 report →
Phase 10 dashboard pipeline end-to-end (not hand-authored fixtures, unlike Phase 11's demo, which
never touched the harness at all), using a deterministic fake LLM client instead of a paid API —
and a way to *verify* that reproduction against a checked-in reference, giving concrete meaning to
the roadmap's word "comparison." This is explicitly a mechanism/plumbing verification, not a
performance benchmark: the fake agent never attempts to solve a task, so it proves the pipeline
reproduces identically across machines, not that ECC (or any provider) helps.

## Implemented

**Deterministic fake LLM provider** (`src/harness/llm/`):

- **`deterministicFakeLlmClient.ts`** (40 lines) — `DeterministicFakeLlmClient implements
  LlmClient`, a pure, stateless function of `request.messages`: calls `list_files` once, then
  concludes with no further tool calls once a tool result is present. Never touches the network,
  never edits a file, so it can never be tuned — even by accident — to favor one condition.
- Wired into `createLlmClient.ts` (new `'fake-deterministic'` `LlmProviderConfig` variant) and
  `llmProviderConfigFromEnv.ts` (special-cased before the usual model/key requirements — needs zero
  environment variables).

**Explicit config seam, no `process.env` mutation** (`src/experiments/runComparisonExperiment.ts`):
added an optional `llmProviderConfig?: LlmProviderConfig` field on `RunComparisonExperimentOptions`,
used in place of `llmProviderConfigFromEnv()` when supplied (existing callers unaffected). This
lets the smoke path force the fake provider explicitly, never by mutating global environment state.

**Comparison mechanism** (`src/experiments/`, all files under 300 lines):

- **`eccAvailabilityCheck.ts`** (22 lines) — `isEccCliAvailable()`, a best-effort `spawnSync` probe
  using the same command-resolution convention as `ProcessEccCliInvoker`.
- **`reproductionReference.ts`** (73 lines) — `ReferenceEntry {taskId, conditionName,
  outcomeStatus, metrics}` extracted from raw `RunResultBundle`s, deliberately excluding
  `time-to-correct-outcome` (the one wall-clock-derived metric, never reproducible) and any random
  ids/timestamps. `readReferenceEntries()` throws a plain, actionable error if the checked-in
  reference is missing — it never silently regenerates it. `writeReferenceEntries()` is used only
  once, manually, during implementation.
- **`compareRunResults.ts`** (111 lines) — pure `compareReferenceEntries()`, keyed by
  `(taskId, conditionName)` — never `Run.conditionId`/`report.json`, which mints a fresh random id
  on every `buildExperimentConditions()` call and can never be a stable cross-run key (see
  "Decisions made" below). A `'native'`-condition mismatch is always hard; an ECC-based condition's
  mismatch is downgraded to informational only when a local `ecc` CLI is detected.
- **`runSmokeReproduction.ts`** (117 lines) — the orchestration entry point behind a new
  `npm run reproduce:smoke` script: forces `{provider: 'fake-deterministic'}` explicitly, runs the
  comparison (all 9 conditions, the 3 real-fixture tasks, 1 repetition — deterministic, so repeated
  reps add no information), generates a report and dashboard into gitignored `reports-smoke/`/
  `dashboard-smoke/`, then compares against the checked-in reference and prints a clear
  PASS/FAIL summary, exiting non-zero only on a hard mismatch.

**Checked-in reference artifact**: `docs/reproduction-reference/smoke-reference.json` (27 entries:
3 real-fixture tasks × 9 conditions), generated for real by actually running the new pipeline
against the real fixtures on the implementation machine.

**Documentation** (`docs/`): `REPRODUCING.md` gained a new "Step 0: free smoke reproduction" section
(placed before the LLM provider configuration section) and a "Verifying your reproduction" section
explaining the native-hard vs. ECC-informational distinction; its "Current limitations" list was
reworded to distinguish the now-verified mechanism from a still-absent live-LLM result.
`BENCHMARK.md`'s "Current status" section now mentions the smoke path, and its condition table's
`ecc-full` label was corrected to `ecc` (the real condition name in `experimentConditions.ts` — a
pre-existing inaccuracy noticed while editing this file).

## Tests

25 new/extended tests (327 total across 85 files, up from 302/80): `deterministicFakeLlmClient.test.ts`
(5 tests — pure request→response mapping, statelessness), extended `createLlmClient.test.ts` and
`llmProviderConfigFromEnv.test.ts` (2 new cases), `eccAvailabilityCheck.test.ts` (4 tests, mocked
`spawnSync`), `reproductionReference.test.ts` (4 tests — extraction, exclusion, sorting, disk
round-trip, missing-reference error), `compareRunResults.test.ts` (5 tests — pass/hard-mismatch/
informational-downgrade/missing/extra), `runSmokeReproduction.test.ts` (4 tests, mocking
`runComparisonExperiment`/`generateReport`/`generateDashboard` rather than spawning the real
27-run pipeline in the automated suite — matching this project's established precedent of verifying
real subprocess pipelines manually, not inside `npm test`, e.g. Phase 6's real-ECC test and Phase
11's `demo:generate` diff-check).

## Validation

- `npm run build && npm test && npm run lint` — clean build, 327/327 tests passing across 85 files,
  zero lint errors.
- `rm -rf dist && npm run build` confirmed no test files leak into `dist/`.
- **Ran `npm run reproduce:smoke` for real, three independent times** (each with a fresh random
  experiment/run id) against the actual fixtures on the implementation machine, which has no `ecc`
  CLI on `PATH`: every run produced the identical, deterministic result — all 3 native-condition
  runs `TASK_FAILURE` with real, non-zero metrics (tool-calls=1, agent-turns=1, real
  `context-tokens`); all 24 ECC-based-condition runs `AGENT_FAILURE` (context provider unreachable)
  with all-zero metrics. All 27 `(taskId, conditionName)` entries matched the checked-in reference
  exactly across all three runs — confirming genuine, verified reproducibility, not merely a
  design that ought to work.
- Confirmed the missing-reference path throws the intended, actionable error (ran
  `npm run reproduce:smoke` once before the reference existed).
- Line-count check: largest new file `runSmokeReproduction.ts` at 117 lines, comfortably under the
  300-line ceiling.
- `git status --short` reviewed before reporting done; change set matches intent.

## Decisions made

ADR-017 in [[14-decisions]]: the deterministic fake LLM provider design; the critical finding that
`Condition.id` is a fresh random id on every `buildExperimentConditions()` call (so any
cross-run comparison must key off raw-bundle `conditionName`, never `conditionId`/`report.json`);
the `time-to-correct-outcome` exclusion (the one wall-clock-derived, never-reproducible metric);
the native-hard/ECC-informational comparison scoping (`runHarness.ts` already catches
`ContextProvider` failures without crashing the loop, confirmed by reading it); the
never-auto-regenerate reference policy; and the `llmProviderConfig` seam avoiding `process.env`
mutation from an importable function. This design was independently reviewed by a Plan subagent
before implementation, which surfaced both the `conditionId` instability and the
`time-to-correct-outcome` exclusion as corrections to the original draft — both incorporated before
any code was written.

## Explicitly not implemented (by design, later work)

- **A real published result from an actual live LLM.** The fake agent never attempts to solve a
  task — this phase proves pipeline mechanics, not that ECC (or any provider) helps. Still gated on
  an approved live comparison run.
- **Any mechanism for a second external user's independently-produced report to be uploaded or
  compared against a first user's.** [[13-roadmap]]'s Phase 13 ("CI/GitHub Integration") territory;
  would also add hosting/infra ahead of a concrete need, against [[04-architecture]]'s local-first
  mandate.
- **A general external-contributor onboarding document** (e.g. `CONTRIBUTING.md`).
  `docs/REPRODUCING.md`'s new Step 0 section is judged sufficient for this round.
- **Fixing the `Run.metadata.modelName`/`modelVersion` gap**, authoring more fixtures, or adding
  new verifiers/metrics — all pre-existing, unrelated backlog items, unchanged.

## Known limitations

- The smoke path proves pipeline mechanics, not ECC's (or any provider's) quality — it must stay
  clearly labeled as such wherever it surfaces (the `limitations` field on its generated report and
  dashboard, and both public docs) so it is never mistaken for a real finding.
- `docs/reproduction-reference/smoke-reference.json` has no automated freshness check: a future
  change to `benchmark/fixtures/{debugging,feature,refactoring}-01/`'s own test suites, or to the
  metric/verifier set, could make `reproduce:smoke` start failing for reasons unrelated to a real
  regression. The reference must be regenerated and re-committed in the same change as any such
  edit — flagged as a process reminder in [[20-next-actions]], not solved with tooling this round
  (no concrete need yet for anything more automated, per ADR-004/ADR-009 discipline).
- The comparison's native-vs-ECC distinction depends on `isEccCliAvailable()`'s best-effort probe
  (`<command> --version` exiting 0); an unusual local ECC CLI that doesn't support `--version`
  would be reported as "not available" even if actually present, causing its divergence to be
  treated as a hard mismatch rather than informational — a false negative in the probe, not in the
  underlying comparison logic itself.

## Risks discovered

No new risk-register row was needed. This phase adds a new, zero-cost, already-tested code path
that reuses every existing harness/verifier/metrics/reporting/dashboard layer unchanged — it
introduces no new operational risk category [[16-risks]] tracks. The "Excessive evaluation cost"
row was updated (not newly opened) to note that the smoke path is unaffected by that cost concern
(zero cost, not a live LLM run), status unchanged (`Open`).

## Status

Complete (this round's scope: a free, zero-credential smoke reproduction of the real pipeline,
verified against a checked-in reference across three independent runs on the implementation
machine). Pending user approval to proceed with executing a live comparison run, Phase 13 (CI/
GitHub Integration), the remaining Phase 9 roadmap scope (CSV/Markdown/HTML export), richer Phase
10 dashboard views, or any other next step.
