# Active Context

The single "resume here cold" file — read this first, before [[18-current-state]] or any
source code, if picking this project back up after a break.

## Where things stand right now

Phase 0 (Foundation) through Phase 12 (External Reproduction) are complete. Phase 6's full roadmap
scope (real solving agent + actual comparison-run mechanism) is closed — see below. Phase 7 is
complete against its *entire* roadmap row, including failure clustering — not just the
confidence-intervals-and-effect-size scope from the round that first implemented it. Phase 8
(Ablation) is implemented and verified, scoped to per-component measurement of ECC's contribution.
Phase 9 (Reporting) is implemented and verified, scoped to the canonical `Report`/`ReportGraph`
persistence format with full Runs→Metrics→Evidence traceability — CSV/Markdown/HTML export remain
roadmap backlog. Phase 10 (Dashboard) is implemented and verified, scoped to a feasibility spike
plus a static, single-experiment MVP dashboard reading Phase 9's `ReportGraph` format. Phase 11
(Public Benchmark) is implemented and verified, scoped to public-facing benchmark documentation, a
reproducibility guide, and a regenerable synthetic public sample. Phase 12 (External Reproduction)
is implemented and verified, scoped to a free, zero-credential "smoke reproduction" of the real
pipeline, checked against a committed reference — a real published result from an actual live LLM
still awaits an approved live comparison run (see below).

**Phase 12 (this session):** `npm run reproduce:smoke` (`src/experiments/runSmokeReproduction.ts`)
runs the *real* harness → agent → verifier → metrics → Phase 7/8 analysis → Phase 9 report → Phase
10 dashboard pipeline end-to-end, for free, using a new `DeterministicFakeLlmClient`
(`src/harness/llm/deterministicFakeLlmClient.ts`) instead of a paid LLM backend — a pure, stateless
fake that calls `list_files` once then concludes, never editing anything, so it can never be tuned
to favor one condition. This is the first time the pipeline has run against genuinely-executed
(not hand-authored, not purely synthetic) data. Two correctness issues were caught before writing
any code (via a Plan-subagent review) and are now load-bearing design decisions: (1) `Condition.id`
is a fresh random id on every `buildExperimentConditions()` call, so any cross-run comparison must
key off the raw `RunResultBundle.conditionName` (stable: `'native'`, `'ecc'`,
`ecc-ablated:<component>`), never `Run.conditionId`/`report.json`; (2) `time-to-correct-outcome` is
built from wall-clock timestamps and must be excluded from any reference/comparison. New
`src/experiments/reproductionReference.ts`/`compareRunResults.ts` implement this, comparing a fresh
run against a checked-in `docs/reproduction-reference/smoke-reference.json` (27 entries) — a
`'native'`-condition mismatch is always a hard failure; an ECC-based condition's mismatch is
downgraded to informational only when a local `ecc` CLI is detected
(`eccAvailabilityCheck.ts`), since `runHarness.ts` already catches `ContextProvider` failures
without crashing the loop, so the 8 ECC-based conditions are only deterministic when no ECC is
reachable. Verified by actually running `npm run reproduce:smoke` three independent times on the
implementation machine (no local ECC CLI): every run's all 27 `(taskId, conditionName)` entries
matched the reference exactly. `docs/REPRODUCING.md` gained a new "Step 0" section describing this
as the thing to try before spending real money on a live run. Full detail in [[phases/phase-12]]
and ADR-017 in [[14-decisions]].

**Phase 11:** New public-facing documentation under `docs/` (distinct from this
internal `project-memory-bank/`, per ADR-016): `docs/BENCHMARK.md` (task categories, fixture
status, the 9-condition experiment design, verification/metrics methodology, the
scientific-integrity commitment) and `docs/REPRODUCING.md` (prerequisites, LLM provider env vars
with an explicit privacy/cost caveat, the exact `experiment:run` → `experiment:analyze` →
`report:generate` → `dashboard:generate` pipeline, required run metadata and versioning axes from
[[10-reproducibility]], the immutability policy, and a numbered current-limitations list). Both
docs state plainly, in their opening paragraph, that no live comparison run has been executed yet —
avoiding the risk of "Public Benchmark" being misread as a real finding. The one existing
public-facing result artifact, `docs/sample-dashboard.html`, was previously a hand-copied file (no
script produced it); it is now a build output of new `npm run demo:generate`
(`src/experiments/demoRunRecords.ts` — two literal, explicitly-commented synthetic
`EvaluatedRunRecord`s — plus `generateDemoDashboard.ts`, which pipes them through `buildReport()`
and `renderDashboardPage()` completely unchanged). Regenerating it was diffed against the
previously-committed file: identical apart from the randomly-generated report/evaluation ids.
Deliberately not built: a new "publish" pipeline (the dashboard's existing self-contained HTML file
already is the publishable artifact — copy it anywhere) and any GitHub Pages/CI hosting automation
(Phase 13's territory). Full detail in [[phases/phase-11]] and ADR-016 in [[14-decisions]].

**Phase 10:** `src/dashboard/` (new, pure — depends only on `src/domain/` and
`src/reporting/`, the same one-way-dependency discipline ADR-011/ADR-014 established) renders one
experiment's `ReportGraph` into a single, self-contained, offline-readable HTML page: an overview
panel (`renderOverview.ts` — title, experiment id, generated timestamp, required `limitations`,
outcome-status breakdown via `outcomeStatusCounts.ts`) plus one drill-down section per Evaluation
(`renderEvaluationDetail.ts`, reusing `src/reporting/traceEvaluation.ts` unchanged — run metadata,
outcome summary, metrics/verifications tables, evidence honoring `Evidence.redacted`), assembled by
`renderDashboardPage.ts` with inline `<style>` and zero external resource references. Every
report-sourced string passes through `htmlEscape.ts` first (this data can be LLM/agent-authored
text). A feasibility spike (documented in ADR-015/`phases/phase-10.md`) weighed this static
generator against a client-side SPA and a dynamic local server, choosing the static generator
because it needs zero new dependencies and matches [[04-architecture]]'s local-first mandate ("No
database... until a real requirement demonstrates the need"). `src/experiments/
generateDashboard.ts` (new, `npm run dashboard:generate`) reads a persisted `report.json` via a new
`latestReportedExperimentId()` helper added to `reportWriter.ts` and writes the rendered page to
`dashboard/<experimentId>/index.html` (`dashboardWriter.ts`). While implementing this, an
unanchored `dashboard/` `.gitignore` pattern was caught matching the new `src/dashboard/` source
directory too — fixed by anchoring all three output-directory ignore entries with a leading `/`.
Proven correct against synthetic `ReportGraph` fixtures in tests (15 new tests across 8 new/edited
test files) — like the rest of Phase 7/8/9, not yet run against a live comparison's real data. Full
detail in [[phases/phase-10]] and ADR-015 in [[14-decisions]].

**Phase 9:** `src/reporting/` (new, pure — depends only on `src/domain/`, the same
one-way-dependency discipline ADR-011 established for `src/analysis/`) gives EEP its first-ever
constructor for a schema-valid `Evaluation` record (`buildEvaluation.ts` — `evaluationSchema`
existed unused since Phase 1) and a `buildReport()` (`buildReport.ts`) that assembles a
self-contained `ReportGraph`: a schema-valid `Report` plus every `Evaluation`/`Run`/`Trace`/
`Outcome`/`Metric`/`Verification`/`Evidence`/`ContextArtifact` it transitively references,
deduplicated by id. `traceEvaluation()` (`traceEvaluation.ts`) is the concrete drill-down reader
implementing [[12-dashboard-strategy]]'s "no black-box KPI" design principle — given a graph and
an `EvaluationId`, it resolves the full backing chain (run, trace, outcome, metrics,
verifications, evidence) purely by id lookup, throwing `BrokenReportGraphError` on a broken/
hand-edited graph rather than returning a silent partial trace. `src/experiments/
generateReport.ts` (new, `npm run report:generate`) reads the raw `experiment-results/` dump back
(same source `analyzeComparisonResults.ts` reads) and persists the canonical `ReportGraph` to
`reports/<experimentId>/report.json` — the artifact meant for actual citation/consumption,
replacing the raw dump as the thing anyone should read directly. The raw per-run dump itself is
kept unchanged, now documented as a crash-safe write-ahead record for a long live run, not the
canonical output. `latestExperimentId()` was extracted out of `analyzeComparisonResults.ts` into
`resultsWriter.ts` (no behavior change) so both scripts share it. Proven correct against synthetic
evaluated-run fixtures in tests (19 new tests across 6 new/edited test files) — like the rest of
Phase 7/8, not yet run against a live comparison's real data. Full detail in [[phases/phase-09]]
and ADR-014 in [[14-decisions]].

**Phase 7 remainder:** `src/analysis/failureClustering.ts`'s
`analyzeFailureClusters()` is the 4th item [[13-roadmap]]'s Phase 7 row always included — which
`verificationMethod`s fail most often, clustered overall and by condition/task category/
complexity. It reuses the *same* Wilson-interval machinery (`proportionConfidenceInterval()`,
ADR-011) Phase 7 already built for `task-success` rather than inventing new statistics: a
verification pass/fail is exactly the Bernoulli shape that interval is for. Every returned list is
sorted worst-failure-rate-first. `src/analysis/failureAnalysisInput.ts`'s `RunVerificationRecord`
is the structural input type (mirrors `RunAnalysisRecord`, but for a run's `Verification[]`
instead of its `Metric[]`). `src/experiments/analyzeComparisonResults.ts` now also builds
`RunVerificationRecord[]` from the same dumped bundles it already reads and wires in
`failureClusterReport`, printing a new section. Proven correct against synthetic verification data
in tests (`failureClustering.test.ts`, 8 tests, plus an extension to
`analyzeComparisonResults.test.ts`) — like the rest of Phase 7/8, not yet run against a live
comparison's real data. Full detail in [[phases/phase-07]]'s remainder section.

**Phase 6 remainder:** `src/harness/llm/` gives EEP a real, multi-provider LLM
client layer (ADR-013 in [[14-decisions]]) — `AnthropicLlmClient` (Claude) and
`OpenAiCompatibleLlmClient` (one implementation covering ChatGPT, Gemini's OpenAI-compatibility
endpoint, and any local OpenAI-compatible server, by configuration alone), assembled via
`createLlmClient(config)` with no hardcoded default vendor. `LlmSolvingAgent`
(`src/harness/agents/llmSolvingAgent.ts`) is the real solving agent: a bounded tool loop
(`list_files`/`read_file`/`write_file`, all path-clamped to the workspace root, plus `run_tests` —
no generic shell-exec) that pairs with *any* `ContextProvider`. Critically, it runs under **every**
condition in the real comparison, including the native baseline — not just the ECC condition —
correcting an earlier design note that would have kept the old, always-`INCOMPLETE`, never-edits-
code `NativeAgent` as the baseline while only ECC got a real agent (a variable-conflation bug
matching the "Baseline weakness" risk, now Mitigated in [[16-risks]]). `src/experiments/`
(`runComparisonExperiment.ts` + `analyzeComparisonResults.ts`) runs the actual 9-condition × 3-task
× 3-repetition comparison through `executeEvaluatedRun()`/`computeRunMetrics()`, dumps raw JSON per
run to a gitignored `experiment-results/`, and feeds the results into Phase 7's
`analyzeRepeatedRuns()` and Phase 8's `analyzeComponentContributions()` unchanged — the first time
either function's wiring has been exercised end-to-end (against synthetic bundles in tests; a
*live* LLM-backed run has not yet been executed — that needs the user's own credentials and a
deliberate `npm run experiment:run`). Full detail in [[phases/phase-06]] and ADR-013.
`src/harness/providers/eccAblation.ts`'s `ablatePackage()` maps each of the 7 named components
from [[06-evaluation-methodology]] §Ablation discipline (history, memory, ranking, provenance,
risk, budgeting, verification) onto a real, already-present field of ECC's documented package
contract and returns a copy with that one field removed/neutralized, holding everything else
constant. `AblatedEccContextProvider` (`ablatedEccContextProvider.ts`) wraps one component's
ablation as its own named `ContextProvider`/Condition (`ecc-ablated:<component>`) — running the
same agent against it and against the full `EccContextProvider` isolates that component's marginal
effect, the same causal-control logic [[09-experiment-strategy]] already uses for conditions.
Measurement needed no new statistics: `src/analysis/componentContribution.ts`'s
`analyzeComponentContributions()` reuses Phase 7's `analyzeRepeatedRuns()` unchanged, once per
component. Full detail in [[phases/phase-08]] and ADR-012 in [[14-decisions]].

Phase 7 recap: `src/analysis/analyzeRepeatedRuns()` (`src/analysis/groupedAnalysis.ts`) is the
repeated-run statistics entry point: given a list of `RunAnalysisRecord` (a run's already-computed
`Metric[]` paired with its condition name and task category/complexity), it produces, per
requested metric, an overall summary/comparison plus one breakdown per category and per
complexity level actually present. Confidence intervals use the Student's t-distribution for
continuous metrics (`meanConfidenceInterval`) or the Wilson score interval for the proportion
metric `task-success` (`proportionConfidenceInterval`); effect size uses Cohen's d (continuous) or
Cohen's h (proportion). All critical values are exact published table lookups, never an
approximated formula (ADR-011). A group with too few runs returns an explicit
`insufficient-data` result rather than a fabricated number or a thrown exception that would abort
the whole analysis. Full detail in [[phases/phase-07]] and ADR-011 in [[14-decisions]].

Phase 6 recap: `EccContextProvider` (`src/harness/providers/eccContextProvider.ts`) wraps ECC's
published CLI contract (`ecc context "<task>" --path <dir> [--budget <n>]`) via
`ProcessEccCliInvoker`, validated against EEP's own independent `eccPackageSchema.ts` mirror —
never an import of ECC source. Full detail in [[phases/phase-06]] and ADR-010.

Phase 5 recap: `src/metrics/computeRunMetrics()` turns a completed, evaluated run into an array of
schema-valid `Metric` records — all 5 primary metrics plus 9 of 17 secondary metrics; 8 remain
deliberately unimplemented (ADR-009). Full detail in [[phases/phase-05]].

## What is NOT done

**A real published benchmark result does not exist yet.** Phase 11's `docs/BENCHMARK.md`/
`docs/REPRODUCING.md` document the benchmark's design and how to reproduce it,
`docs/sample-dashboard.html` is an explicitly-labeled synthetic demo regenerable via
`npm run demo:generate`, and Phase 12's `npm run reproduce:smoke` proves the pipeline mechanics
reproduce identically across machines for free — none of this is a real finding, since the smoke
path's agent never attempts to solve a task. That still requires an approved live comparison run
against a real, paid LLM (see below) followed by the existing `report:generate`/
`dashboard:generate` pipeline. No GitHub Pages/CI publishing automation exists (Phase 13's
territory), and no mechanism exists yet for one external user's independently-produced report to
be compared against another's (also Phase 13's territory).

**Richer dashboard views don't exist yet.** `src/dashboard/` (Phase 10) renders only a single
experiment's `ReportGraph` — [[12-dashboard-strategy]]'s full target view list (multi-experiment/
condition comparison, complexity/category breakdowns, failure-cluster views) needs Phase 7/8's
`analyzeComparisonResults.ts` output folded into `ReportGraph` first, which has not happened
(same gap already flagged for Phase 9). No client-side interactivity, no dev/live server, no
human-readable Task/Condition names (only raw `taskId`/`conditionId`) — see
[[phases/phase-10]]'s "Explicitly not implemented" section for the full list.

**No live comparison run has been executed yet.** `LlmSolvingAgent` and `src/experiments/` exist
and are tested (mocked LLM responses; a synthetic-bundle wiring test for the analysis path), but
nobody has run `npm run experiment:run` against a real Claude/ChatGPT/Gemini/local-model backend —
that requires the user's own `EEP_LLM_*` credentials/server and a deliberate invocation, not
something done automatically. Until that happens, `analyzeRepeatedRuns()` and
`analyzeComponentContributions()` still have never run against *real* experiment data, only
synthetic data in tests. `Run.metadata.modelName`/`modelVersion` are also still unpopulated (see
[[20-next-actions]] item 2's note) — a small additive `runHarness.ts` change, not yet made. 27 of
30 tasks have no fixture source code yet (tracked backlog, see [[20-next-actions]]). Only 2 of 9
`verificationMethod` enum values have a real verifier (`test-suite`, `diff-analysis`). 8 of 22
named metrics have no real data source yet (ADR-009) — though ECC's per-item
relevance/trustLevel/authority/freshness data is now available inside `ContextArtifact.content` as
a future (not yet wired) source for 4 of those 8. ECC's ablation is content-level
(post-hoc field removal from its CLI output), not a measurement of ECC's real internal component
architecture — see ADR-012's trade-offs and [[phases/phase-08]]'s known limitations. A canonical
`Report`/`ReportGraph` now exists (Phase 9, `src/reporting/`) and persists to gitignored
`reports/<experimentId>/report.json`, but Phase 7/8's statistical analysis output
(`RepeatedRunAnalysisReport`/`ComponentContribution[]`/`FailureClusterReport`) is *not* folded into
it yet — `analyzeComparisonResults.ts`'s output stays console-only, in-memory. No CSV/Markdown/HTML
report export formats exist yet (remaining [[13-roadmap]] Phase 9 scope). A static, single-
experiment MVP dashboard now exists (Phase 10, `src/dashboard/`), but no general-purpose CLI
exists yet, and richer dashboard views remain future work (see above). No container/process-level
sandboxing (isolation is
filesystem-copy only; `testSuiteVerifier` and the solving agent's `run_tests` tool both spawn real
child processes with only a wall-clock timeout — narrowed but not closed, see [[16-risks]]). Do not
assume any of these exist without checking `implementation-status.md` first.

## Immediate next step

Per the master prompt's strict phase gate, this Phase 12 work's completion is reported to the user
and no further Phase 13 work or live run has started. Do not begin further work, and do not
execute a live comparison run, without an explicit new approval message from the user, even if
this file is being read in a fresh session — see [[20-next-actions]] and [[00-project-charter]]
§Working protocol. Phases 6, 7, 8, 9, 10, 11, and 12 are now all fully complete against this
round's scope; the next open items are: executing a live comparison run (needs the user's own LLM
credentials and an explicit go-ahead), Phase 13 (CI/GitHub Integration), the remaining Phase 9
roadmap scope (CSV/Markdown/HTML export), or richer Phase 10 dashboard views (multi-experiment
comparison, failure analysis — needs Phase 7/8 output folded into `Report` first).

## Process reminders for whoever (human or agent) picks this up

- Read the memory bank before source code (this file, then [[18-current-state]] and
  [[19-phase-status]]) — it's kept deliberately more token-efficient than re-deriving state
  from the repo.
- Keep source files under ~300 lines; the `src/domain/`, `src/benchmark/`, `src/harness/`,
  `src/evaluation/`, and `src/metrics/` layout (one small file per concern) is the pattern to
  continue.
- Update this file and `implementation-status.md` at the end of any major feature, not only at
  phase boundaries — that's what keeps this file trustworthy as a save state.
- Never commit or push without the user explicitly asking, per the environment's Git Safety
  Protocol.
- Fixture authoring convention (ADR-007): to add a real fixture, build it in a scratch location,
  `git commit` it there to mint a real SHA, then copy only the resulting working tree (no
  `.git`) into `benchmark/fixtures/<id>/` and update that task's `repository.commitSha` — never
  `git init` directly inside `benchmark/fixtures/<id>/` (creates a nested-repo "gitlink").
- New verifier convention (ADR-008): to add support for another `verificationMethod` keyword,
  implement the `Verifier` interface in a new file under `src/evaluation/verifiers/` (see
  `testSuiteVerifier.ts`/`diffAnalysisVerifier.ts` as templates) and register it in
  `verifiers/index.ts`'s `ALL_VERIFIERS` array — no other code needs to change.
- Outcome authority convention (ADR-008): never let an agent's own `SUCCESS` self-report become
  `Outcome.status` directly — only `determineOutcomeStatus()` (fed by real verification results)
  may set it, except for the infra-level statuses which originate in the harness itself.
- New metric convention (ADR-009): only add a metric's real computation once a genuine data
  source exists for it — never approximate a named metric with a fabricated/placeholder value.
  Add it as a small function in `primaryMetrics.ts`/`secondaryMetrics.ts` (or a new file if it
  needs its own data-gathering logic), sourced from `RunMetricsInput` in `metricsInput.ts`.
- ECC integration convention (ADR-010): EEP talks to ECC only through its documented CLI
  contract (`src/harness/providers/eccCliInvoker.ts`/`eccContextProvider.ts`) — never import ECC
  source, and never hardcode a filesystem path to any specific ECC checkout; the invoked
  command/args are always constructor-/env-configurable. If ECC's package contract changes,
  update the independent mirror in `eccPackageSchema.ts`, not by importing ECC's own schema.
- Statistics convention (ADR-011): only 90%/95%/99% confidence levels are supported, backed by
  exact published t-table/z-critical values (`src/analysis/tDistribution.ts`) — never add a new
  confidence level without also adding its exact critical values, and never replace the table with
  an approximated inverse-distribution formula. Low-level functions
  (`meanConfidenceInterval`/`cohensD`/etc.) throw `InsufficientSampleSizeError` when misused
  directly; orchestration code (`repeatedRunAnalysis.ts`/`groupedAnalysis.ts`) must catch that by
  checking sample size upfront and returning a `status: 'insufficient-data'` result instead of
  letting one underpowered group crash the whole analysis.
- Ablation convention (ADR-012): a new ablatable component must map onto a real, already-present
  field of ECC's documented package contract (`eccPackageSchema.ts`) — never invent a dimension
  ECC doesn't actually report. Add it to `ECC_ABLATION_COMPONENTS`/`ablatePackage()` in
  `src/harness/providers/eccAblation.ts`; `AblatedEccContextProvider` and
  `analyzeComponentContributions()` need no changes to support a new component. Never add new
  statistics for ablation measurement — it reuses `analyzeRepeatedRuns()` (Phase 7) because an
  ablation comparison is structurally just another condition-vs-baseline comparison.
- LLM solving-agent convention (ADR-013): `LlmSolvingAgent` must run under *every* condition in
  the real comparison, including the native baseline — never let `NativeAgent` stand in as "the
  baseline agent" in a real comparison run, since that would conflate agent capability with
  context quality (the one thing [[09-experiment-strategy]] says must be the only varying
  dimension). To add a 5th LLM backend, add a new `src/harness/llm/*LlmClient.ts` implementing the
  shared `LlmClient` interface — never hardcode a default provider in `createLlmClient.ts`; new
  provider config always comes from an explicit `LlmProviderConfig` value. The agent's tool
  surface (`llmAgentTools.ts`) stays deliberately narrow — never add a generic shell-exec tool;
  every new filesystem tool must resolve its path argument through `resolveWorkspacePath()` (or
  equivalent) and reject anything that escapes the workspace root, since tool-call arguments come
  from model output and are untrusted input.
- Reporting convention (ADR-014): `src/reporting/` depends only on `src/domain/` — never import
  from `src/experiments/`/`harness`/`evaluation`; `src/experiments/generateReport.ts` is the one
  place that adapts `RunResultBundle` into `EvaluatedRunRecord`. `experiment-results/`'s per-run
  dump is a crash-safe write-ahead record, not the canonical artifact — `reports/<experimentId>/
  report.json` is. `Evaluation.evaluatorVersion` must come from the run's own recorded
  `metadata.evaluatorVersion`, never a separately-supplied parameter that could drift from it.
- Dashboard convention (ADR-015): `src/dashboard/` depends only on `src/domain/` and
  `src/reporting/` — never import from `src/experiments/`/`harness`/`evaluation`.
  `src/experiments/generateDashboard.ts` is the one place that resolves which report to read from
  disk. Every report-sourced string must pass through `htmlEscape.ts` before being embedded in
  rendered HTML. The dashboard stays a static-file generator, not a server — don't add a dev/live
  server without a concrete need (ADR-004/ADR-009 discipline). Any new gitignored output directory
  under the repo root must be anchored with a leading `/` in `.gitignore` (an unanchored pattern
  can accidentally match a same-named `src/` subdirectory, as happened here).
- Public-docs convention (ADR-016): `docs/BENCHMARK.md`/`docs/REPRODUCING.md` are written for an
  external reader — paraphrase `project-memory-bank/` content into them, never link a public doc
  into this internal memory bank. There is no separate "publish" pipeline: a generated
  `dashboard/<experimentId>/index.html` file is already the publishable artifact. If the benchmark
  design (task categories, ablation components, condition list) changes, update
  `docs/BENCHMARK.md` in the same change — it has no automated freshness check against its
  `project-memory-bank/` sources.
- Smoke-reproduction convention (ADR-017): the `'fake-deterministic'` `LlmProviderConfig` exists
  only for `npm run reproduce:smoke` — never make it a default or wire it into a real comparison
  run. Any code comparing runs across two independently-generated experiments must key by
  `(taskId, conditionName)` from raw `RunResultBundle`s, never by `Run.conditionId`/`report.json`
  (a fresh random id every `buildExperimentConditions()` call). `docs/reproduction-reference/
  smoke-reference.json` is a checked-in file, regenerated manually only when a real change (a
  fixture's tests, the metric/verifier set) legitimately changes the smoke path's expected output
  — never regenerated automatically from a user's own run. `time-to-correct-outcome` must stay
  excluded from any such comparison; it is wall-clock-derived and never reproduces exactly.
