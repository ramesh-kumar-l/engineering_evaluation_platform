# 19 — Phase Status

| Phase | Status |
|---|---|
| 0 — Project Foundation | Complete |
| 1 — Evaluation Contract | Complete |
| 2 — Benchmark V1 | Complete |
| 3 — Experiment Harness | Complete |
| 4 — Deterministic Evaluation | Complete |
| 5 — Metrics | Complete |
| 6 — ECC Integration | Complete (ContextProvider, LLM solving agent, comparison-run mechanism — full roadmap scope); no live comparison run executed yet |
| 7 — Experimental Analysis | Complete (confidence intervals + effect size across categories/complexity, plus failure clustering by verificationMethod/condition/category/complexity — full roadmap scope), pending user approval to proceed |
| 8 — Ablation | Complete (per-component measurement of ECC's contribution), pending user approval to proceed |
| 9 — Reporting | Complete (canonical `Report`/`ReportGraph` persistence with full Runs→Metrics→Evidence traceability — this round's scope); CSV/Markdown/HTML formats remain roadmap backlog |
| 10 — Dashboard Feasibility / MVP | Complete (feasibility spike + static, single-experiment MVP dashboard reading Phase 9's `ReportGraph` — this round's scope); richer views (comparison, failure analysis) await Phase 7/8 output folded into `Report` |
| 11 — Public Benchmark | Complete (benchmark documentation, reproducibility guide, and a regenerable public sample dashboard — this round's scope); a real published result still awaits an approved live comparison run |
| 12 — External Reproduction | Complete (a free, zero-credential "smoke reproduction" exercising the real pipeline end-to-end via a deterministic fake LLM client, verified against a checked-in reference — this round's scope); a real, live-LLM comparison result still awaits an approved live comparison run |
| 13 — CI / GitHub Integration | Not started |

Per the strict phase gate ([[00-project-charter]] §Working protocol), Phase 9 does not begin
until the user explicitly approves proceeding past Phase 8. Phase 6 is now complete against
[[13-roadmap]]'s full original scope: `EccContextProvider` (a real `ContextProvider`),
`LlmSolvingAgent` (a real, multi-provider LLM solving agent, ADR-013 in [[14-decisions]]), and
`src/experiments/` (an actual native-vs-ECC-vs-per-ablation-component comparison-run mechanism,
scoped to the 3 real-fixture tasks). What remains is executing a live run — that needs the user's
own LLM credentials/local server and a deliberate `npm run experiment:run`, which this
implementation does not trigger automatically; see [[phases/phase-06]] and [[20-next-actions]].
Phase 7's exit criterion this round was originally scoped by the user to confidence intervals and
effect size across categories/complexity; failure analysis (the 4th item in [[13-roadmap]]'s
Phase 7 row) was closed in a later session — `src/analysis/failureClustering.ts`'s
`analyzeFailureClusters()` clusters `verificationMethod` failure rates overall and by condition/
category/complexity, reusing the same Wilson-interval machinery Phase 7 already built for
`task-success` (ADR-011). Phase 7 is now complete against [[13-roadmap]]'s full row. Phase 8's
exit criterion (per-component measurement of ECC's contribution) matches [[13-roadmap]]'s Phase 8
row exactly and is fully built (the ablation mechanism plus measurement). Phase 7's
`analyzeRepeatedRuns()`, its `analyzeFailureClusters()`, and Phase 8's
`analyzeComponentContributions()` are all now exercised by
`src/experiments/analyzeComparisonResults.ts` and proven correct against synthetic bundles in
tests, but none has run against a live-executed comparison's real data yet, since no live run has
been executed (see above).

Phase 9's exit criterion this round was narrowed by the user to the canonical `Report`
entity/persistence format itself (not [[13-roadmap]]'s full "JSON, CSV, Markdown, HTML" row).
`src/reporting/`'s `buildReport()` constructs a self-contained `ReportGraph` — a schema-valid
`Report` plus every `Evaluation`/`Run`/`Trace`/`Outcome`/`Metric`/`Verification`/`Evidence`/
`ContextArtifact` it references, deduplicated by id — and `src/experiments/generateReport.ts`
persists it to `reports/<experimentId>/report.json`, replacing the raw `experiment-results/` dump
as the canonical, citable artifact (that dump is kept only as a crash-safe write-ahead record
during a live run — see ADR-014). Like Phase 7/8, this has not yet run against real comparison
data since no live run has been executed; validated against synthetic evaluated-run fixtures in
tests.

Phase 10's exit criterion this round was a feasibility spike plus an MVP dashboard reading from
Phase 9's `Report` format. `src/dashboard/` renders one `ReportGraph` into a single,
self-contained, offline-readable HTML page (an overview panel plus one drill-down section per
`Evaluation`, reusing `traceEvaluation()` unchanged) — a static file, no dev server, no new
dependency, chosen after weighing a client-side SPA and a dynamic local server against
[[04-architecture]]'s local-first mandate (see ADR-015). `src/experiments/generateDashboard.ts`
(`npm run dashboard:generate`) writes it to `dashboard/<experimentId>/index.html`. Multi-experiment
comparison, complexity/category breakdowns, and failure-cluster views from
[[12-dashboard-strategy]]'s full target list remain future work — they need Phase 7/8's analysis
output folded into `ReportGraph` first, a gap already flagged in [[phases/phase-09]]. Like Phase
7/8/9, validated only against synthetic fixtures; no live run has been executed yet.

Phase 11's exit criterion this round was benchmark documentation, a reproducibility guide, and
public results ([[13-roadmap]]). Since no live comparison run has ever been executed, "public
results" this round means making the one existing public-facing artifact,
`docs/sample-dashboard.html`, reproducible via a new `npm run demo:generate` script
(`src/experiments/demoRunRecords.ts`/`generateDemoDashboard.ts`, reusing `buildReport()`/
`renderDashboardPage()` unchanged) instead of hand-copied, plus new `docs/BENCHMARK.md` (benchmark
design) and `docs/REPRODUCING.md` (reproduction guide) — both public-facing, distinct from this
internal memory bank (ADR-016). A real published result still requires an approved live comparison
run, unchanged from Phase 6/7/8/9/10's status.

Phase 12's exit criterion this round was "external users, independent runs, comparison"
([[13-roadmap]]). Still no live comparison run against a real, paid LLM has ever been executed, so
this round builds a free, zero-credential "smoke reproduction" (`npm run reproduce:smoke`,
`src/experiments/runSmokeReproduction.ts`) that runs the *real* harness/agent/verifier/metrics/
Phase 7/8 analysis/Phase 9 report/Phase 10 dashboard pipeline end-to-end using a new deterministic
fake `LlmClient` (`src/harness/llm/deterministicFakeLlmClient.ts`) instead of a paid backend — the
first time this pipeline has run against genuinely-executed, not hand-authored or purely synthetic,
data. The run is compared against a checked-in reference
(`docs/reproduction-reference/smoke-reference.json`, `src/experiments/reproductionReference.ts`/
`compareRunResults.ts`) keyed by `(taskId, conditionName)` — never `report.json`'s random
`conditionId` — giving concrete meaning to "comparison." Verified end-to-end by actually running
`npm run reproduce:smoke` three independent times on the implementation machine: all 27
(taskId, conditionName) entries matched the reference exactly every time (see ADR-017 in
[[14-decisions]] and [[phases/phase-12]]). This is a mechanism/plumbing verification, not a
performance benchmark — the fake agent never attempts to solve a task — so it does not close the
"a real published result" gap; that still requires an approved live comparison run against a real,
paid LLM, unchanged.
