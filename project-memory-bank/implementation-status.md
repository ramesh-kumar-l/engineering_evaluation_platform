# Implementation Status

A fine-grained, per-module ledger — more granular than [[19-phase-status]]'s per-phase table.
Update this whenever a major feature/module is finished, not only at phase boundaries.

## src/domain/common/

| Module | Status |
|---|---|
| `ids.ts` (branded IDs, 14 entities) | Done |
| `idGenerator.ts` (`generateId<Brand>()`) | Done (Phase 3) |
| `semver.ts` | Done |
| `timestamps.ts` | Done |
| `status.ts` (`RunStatus` taxonomy) | Done |

## src/domain/ (entity schemas)

| Entity | File | Status |
|---|---|---|
| Task | `task/task.schema.ts` | Done |
| Condition | `experiment/condition.schema.ts` | Done |
| Experiment | `experiment/experiment.schema.ts` | Done |
| ContextArtifact | `evidence/context-artifact.schema.ts` | Done |
| Evidence | `evidence/evidence.schema.ts` | Done |
| Action | `trace/action.schema.ts` | Done |
| Decision | `trace/decision.schema.ts` | Done |
| Trace | `trace/trace.schema.ts` | Done |
| Verification | `verification/verification.schema.ts` | Done |
| Outcome | `outcome/outcome.schema.ts` | Done |
| Run | `run/run.schema.ts` | Done |
| Metric | `metric/metric.schema.ts` | Done |
| Evaluation | `evaluation/evaluation.schema.ts` | Done |
| Report | `report/report.schema.ts` | Done |

## src/domain/providers/

| Interface | Status |
|---|---|
| `ContextProvider` (now carries `runId` on its request — Phase 3) | Interface defined; native implementation Phase 3, ECC-backed implementation Phase 6 — both Done |
| `Agent` (now carries `runId` on its request — Phase 3) | Interface defined; `NativeAgent` (Phase 3, harness-plumbing only) and `LlmSolvingAgent` (Phase 6 remainder, real LLM-backed solving agent) both Done |

## src/benchmark/ (Phase 2)

| Module | Status |
|---|---|
| `loadTasks.ts` (read + validate `benchmark/tasks/*.json` against `taskSchema`) | Done |
| `index.ts` (barrel) | Done |

## src/harness/ (Phase 3, extended Phase 4/5/6/6-remainder)

| Module | Status |
|---|---|
| `workspace.ts` (`createIsolatedWorkspace` — filesystem-copy sandbox, ADR-007) | Done |
| `support/listFiles.ts` (shared recursive file listing, capped) | Done |
| `support/runNpmTest.ts` (`runNpmTest` — shared `npm test` spawn logic, extracted from `testSuiteVerifier.ts`) | Done (Phase 6 remainder) |
| `providers/nativeContextProvider.ts` (`NativeContextProvider`) | Done |
| `providers/eccPackageSchema.ts` (independent Zod mirror of ECC's `EngineeringContextPackage` contract, ADR-010) | Done (Phase 6) |
| `providers/eccCliInvoker.ts` (`ProcessEccCliInvoker` — configurable subprocess wrapper around ECC's `ecc context` CLI, ADR-010) | Done (Phase 6) |
| `providers/eccContextProvider.ts` (`EccContextProvider implements ContextProvider` — Condition B/C's real ECC-backed source) | Done (Phase 6) |
| `providers/eccPackageFetcher.ts` (`fetchValidatedEccPackage` — shared invoke+parse+validate, extracted Phase 8) | Done (Phase 8) |
| `providers/eccAblation.ts` (`ablatePackage` — per-component content-level ablation, ADR-012) | Done (Phase 8) |
| `providers/ablatedEccContextProvider.ts` (`AblatedEccContextProvider implements ContextProvider` — one ablation Condition per ECC component) | Done (Phase 8) |
| `agents/nativeAgent.ts` (`NativeAgent` — harness-plumbing baseline only, not used in the real comparison run) | Done |
| `llm/llmClient.types.ts` (`LlmClient`/`LlmMessage`/`LlmToolCall` — neutral, vendor-independent shape, ADR-013) | Done (Phase 6 remainder) |
| `llm/anthropicLlmClient.ts` (`AnthropicLlmClient` — covers Claude) | Done (Phase 6 remainder) |
| `llm/openAiCompatibleLlmClient.ts` (`OpenAiCompatibleLlmClient` — covers ChatGPT, Gemini, local models) | Done (Phase 6 remainder) |
| `llm/createLlmClient.ts` (factory over an explicit `LlmProviderConfig`, no hardcoded default) | Done (Phase 6 remainder) |
| `agents/llmAgentTools.ts` (`list_files`/`read_file`/`write_file`/`run_tests` — path-clamped, no shell-exec) | Done (Phase 6 remainder) |
| `agents/promptBuilder.ts` (system prompt + initial user message from `Task`/`ContextArtifact`) | Done (Phase 6 remainder) |
| `agents/llmSolvingAgent.ts` (`LlmSolvingAgent implements Agent` — the real, multi-provider solving agent, ADR-013) | Done (Phase 6 remainder) |
| `runHarness.ts` (`executeRun` — Task+Condition+Agent+ContextProvider → Run+Trace; carries an optional `onBeforeCleanup` hook (Phase 4) and now also returns the full `contextArtifact` on `HarnessRunOutcome` (Phase 5, ADR-009)) | Done — `Run.metadata.modelName`/`modelVersion` still not wired through, see [[20-next-actions]] |
| `index.ts` (barrel) | Done |

## docs/ (Phase 11, public-facing — not internal memory bank)

| File | Status |
|---|---|
| `docs/BENCHMARK.md` (benchmark design: categories, fixture status, 9-condition design, verification/metrics methodology, scientific-integrity commitment) | Done |
| `docs/REPRODUCING.md` (reproduction guide: prerequisites, LLM provider config, command sequence, required metadata, versioning, immutability, publishing, current limitations) | Done |
| `docs/sample-dashboard.html` (now a build output of `npm run demo:generate`, not hand-copied) | Done |

## src/experiments/ (Phase 6 remainder, extended Phase 9/10/11)

| Module | Status |
|---|---|
| `experimentConditions.ts` (`buildExperimentConditions` — the 9 real conditions: native + full ECC + 7 ablations) | Done |
| `llmProviderConfigFromEnv.ts` (`llmProviderConfigFromEnv`/`agentBudgetConfigFromEnv` — env-var-driven, no hardcoded default provider) | Done |
| `resultsWriter.ts` (`writeRunResult`/`readAllRunResults`/`latestExperimentId` — raw JSON dump to gitignored `experiment-results/`, a crash-safe write-ahead record, not the canonical Phase 9 artifact) | Done |
| `runComparisonExperiment.ts` (main loop: 3 real-fixture tasks × 9 conditions × 3 repetitions; runnable via `npm run experiment:run`) | Done — mechanism only; no live run executed yet |
| `analyzeComparisonResults.ts` (reads dumped bundles back, drives Phase 7 (repeated-run + failure clustering)/8's analysis unchanged; runnable via `npm run experiment:analyze`) | Done — proven against synthetic bundles in tests; not yet run against live data |
| `generateReport.ts` (reads dumped bundles back, builds+persists the canonical `ReportGraph` via `src/reporting/`; runnable via `npm run report:generate`) | Done (Phase 9) — proven against synthetic bundles in tests; not yet run against live data |
| `generateDashboard.ts` (reads a persisted `report.json` back, renders+writes the static dashboard via `src/dashboard/`; runnable via `npm run dashboard:generate`) | Done (Phase 10) — proven against synthetic fixtures in tests; not yet run against live data |
| `demoRunRecords.ts` (`demoRunRecords` — two literal, explicitly-synthetic `EvaluatedRunRecord`s, native-failure + ecc-success on `debugging-01`) | Done (Phase 11) |
| `generateDemoDashboard.ts` (`generateDemoDashboard` — reuses `buildReport`/`renderDashboardPage` unchanged to (re)write `docs/sample-dashboard.html`; runnable via `npm run demo:generate`) | Done (Phase 11) |
| `index.ts` (barrel) | Done |

## src/reporting/ (Phase 9)

| Module | Status |
|---|---|
| `evaluatedRunInput.ts` (`EvaluatedRunRecord` — structural input type, decoupled from `src/experiments/`'s `RunResultBundle`) | Done |
| `buildEvaluation.ts` (`buildEvaluation` — first-ever constructor for a schema-valid `Evaluation`; reads `evaluatorVersion` from the run's own metadata) | Done |
| `dedupeById.ts` (generic id-based dedup helper) | Done |
| `reportGraph.ts` (`ReportGraph` — a `Report` plus every entity it transitively references, deduplicated by id) | Done |
| `buildReport.ts` (`buildReport` — the Phase 9 entry point: evaluated runs → `ReportGraph`) | Done |
| `traceEvaluation.ts` (`traceEvaluation` — drills one Evaluation down to its full backing chain, `BrokenReportGraphError` on a broken graph) | Done |
| `reportWriter.ts` (`writeReport`/`readReport`/`latestReportedExperimentId` — persists to gitignored `reports/<experimentId>/report.json`) | Done |
| `index.ts` (barrel) | Done |

## src/dashboard/ (Phase 10)

| Module | Status |
|---|---|
| `htmlEscape.ts` (escapes report-sourced strings before embedding in generated HTML) | Done |
| `outcomeStatusCounts.ts` (`outcomeStatusCounts` — tallies `Outcome.status` across a `ReportGraph`) | Done |
| `renderOverview.ts` (`renderOverview` — report identity, limitations, status breakdown) | Done |
| `renderEvaluationDetail.ts` (`renderEvaluationDetail` — one Evaluation's full drill-down chain via `traceEvaluation`) | Done |
| `renderDashboardPage.ts` (`renderDashboardPage` — one self-contained HTML document per `ReportGraph`) | Done |
| `dashboardWriter.ts` (`writeDashboard`/`defaultDashboardDir` — persists to gitignored `dashboard/<experimentId>/index.html`) | Done |
| `index.ts` (barrel) | Done |

## src/evaluation/ (Phase 4)

| Module | Status |
|---|---|
| `verifiers/verifier.types.ts` (`Verifier` contract, `VerificationExecutionError`/`VerificationTimeoutError`) | Done |
| `verifiers/testSuiteVerifier.ts` (spawns fixture's real `npm test`, now via shared `harness/support/runNpmTest.ts`) | Done |
| `verifiers/diffAnalysisVerifier.ts` (generic pristine-vs-workspace change detection) | Done |
| `verifiers/index.ts` (`ALL_VERIFIERS` registry + barrel) | Done |
| `runVerifiers.ts` (runs every applicable verifier, collects results + execution errors) | Done |
| `determineOutcome.ts` (`determineOutcomeStatus` — pure, exhaustively tested status rule, ADR-008) | Done |
| `evaluateRun.ts` (`executeEvaluatedRun` — Task → Run+Trace+Outcome+Verification[]+Evidence[]) | Done |
| `index.ts` (barrel) | Done |
| Verifiers for `static-analysis`, `repository-invariant`, `acceptance-criteria-check`, `security-check`, `architecture-check`, `human-review`, `llm-judge` | Not started — add as a fixture needs them |

## src/metrics/ (Phase 5)

| Module | Status |
|---|---|
| `estimateTokens.ts` (~4-char/token fallback estimate) | Done |
| `metricHelpers.ts` (`buildMetric`, `durationMs`) | Done |
| `metricsInput.ts` (`RunMetricsInput` structural type) | Done |
| `primaryMetrics.ts` (all 5 primary metrics) | Done |
| `secondaryMetrics.ts` (9 of 17 secondary metrics) | Done |
| `computeMetrics.ts` (`computeRunMetrics` — the Phase 5 entry point) | Done |
| `aggregateMetrics.ts` (`aggregateMetricsByName` — mean/median/stddev, non-statistical) | Done |
| `index.ts` (barrel) | Done |
| 8 secondary metrics: evidence-recall/-precision/-authority/-freshness, context-redundancy, regression-rate, risk-classification, decision-confidence | Not started — no data source exists yet, see ADR-009 |

## src/analysis/ (Phase 7)

| Module | Status |
|---|---|
| `stats.ts` (generic descriptive stats, shared `InsufficientSampleSizeError`) | Done |
| `tDistribution.ts` (exact published t-table + z fallback, 90/95/99% only, ADR-011) | Done |
| `confidenceInterval.ts` (`meanConfidenceInterval` — Student's t; `proportionConfidenceInterval` — Wilson) | Done |
| `effectSize.ts` (`cohensD`, `cohensH`, magnitude classification) | Done |
| `groupBy.ts` (generic grouping helper) | Done |
| `analysisInput.ts` (`RunAnalysisRecord`, `metricKindFor`, `extractMetricValues`) | Done |
| `repeatedRunAnalysis.ts` (`summarizeGroup`, `compareConditions` — both return `insufficient-data` rather than throwing) | Done |
| `groupedAnalysis.ts` (`analyzeRepeatedRuns` — the Phase 7 entry point: overall + by-category + by-complexity) | Done |
| `index.ts` (barrel) | Done |
| `componentContribution.ts` (`analyzeComponentContributions` — Phase 8 entry point, reuses `analyzeRepeatedRuns` unchanged) | Done (Phase 8) |
| `failureAnalysisInput.ts` (`RunVerificationRecord` — structural input pairing a run's `Verification[]` with condition/category/complexity) | Done (Phase 7 remainder) |
| `failureClustering.ts` (`analyzeFailureClusters` — 4th item in Phase 7's roadmap scope: `verificationMethod` failure-rate clustering overall/by condition/category/complexity, Wilson CI per cluster, worst-first sort) | Done (Phase 7 remainder) |

## benchmark/ (Phase 2, updated Phase 3)

| Item | Status |
|---|---|
| 30 task records, `benchmark/tasks/*.json` | Done — matches [[07-benchmark-strategy]] distribution exactly |
| Temporal integrity policy | Done — fully specified in [[07-benchmark-strategy]] |
| Fixture source code, `benchmark/fixtures/<id>/` | 3 of 30 done (`debugging-01`, `feature-01`, `refactoring-01`) — Phase 3; remaining 27 are tracked backlog, see [[20-next-actions]] |
| Real pinned `repository.commitSha` per task | 3 of 30 done (same 3 tasks, real git SHAs — ADR-007); other 27 use the `"unpinned"` sentinel (ADR-006) |

## Not started

Fixture repositories + real commit pins for 27 of 30 tasks (incremental backlog), verifiers for
7 of the 9 `verificationMethod` enum values (add as needed), 8 of 22 named metrics with no data
source yet (ADR-009), **executing a live comparison run** (the mechanism — `LlmSolvingAgent` +
`src/experiments/` — is Done, but no one has run it against a real LLM backend yet; needs the
user's own credentials and a deliberate `npm run experiment:run`), `Run.metadata.modelName`/
`modelVersion` population (small additive `runHarness.ts` change, see [[20-next-actions]]),
a general-purpose CLI, container/process-level sandboxing (open risk, see [[16-risks]]),
CSV/Markdown/HTML report export formats (remaining Phase 9 roadmap scope beyond this round's
canonical entity/persistence exit criterion), richer dashboard views — multi-experiment
comparison, complexity/category breakdowns, failure-cluster views (remaining Phase 10 scope
beyond this round's single-experiment MVP; needs Phase 7/8 analysis output folded into `Report`
first). A real *published* benchmark result (Phase 11's `docs/` covers documentation/reproduction/
a regenerable synthetic demo only, per this round's scope — see [[phases/phase-11]]).

## Verification snapshot

Last run: `npm run build && npm test && npm run lint` — clean build, 302 tests passing across 80
files (0 failures this run; the previously-observed `eccCliInvoker.test.ts` subprocess-spawn
timing flake did not reproduce, consistent with it being load-dependent flakiness, not a
regression), zero lint errors. Confirmed no test files leak into `dist/` after
`rm -rf dist && npm run build`; all five CLI entry points
(`dist/experiments/runComparisonExperiment.js`, `dist/experiments/analyzeComparisonResults.js`,
`dist/experiments/generateReport.js`, `dist/experiments/generateDashboard.js`,
`dist/experiments/generateDemoDashboard.js`) compiled correctly. Ran `npm run demo:generate` for
real and diffed the regenerated `docs/sample-dashboard.html` against its previously-committed
version — identical apart from the randomly-generated report/evaluation ids, confirming the script
faithfully reproduces the artifact.
Largest new/edited file (Phase 11) is `src/experiments/demoRunRecords.ts` at 102 lines;
largest orchestration script remains `src/experiments/generateReport.ts` at 78 lines — all
comfortably under the 300-line ceiling.
Re-run this before trusting this ledger; it is a snapshot, not a live status.
