# 20 — Next Actions

1. **Immediate:** await explicit user approval to proceed with executing a live comparison run
   (item 2 below), Phase 13 (CI/GitHub Integration), the remaining Phase 9 roadmap scope (item 2c
   below), or richer Phase 10 dashboard views (item 2d below). Phase 7's roadmap scope (including
   failure analysis, item 2a below), Phase 8's orchestration follow-up (item 2b below), Phase 9's
   canonical Report/persistence format (item 2c below), Phase 10's dashboard MVP (item 2d below),
   Phase 11's benchmark documentation/reproducibility guide/regenerable demo (item 2e below), and
   Phase 12's free smoke reproduction (item 2f below) are now all fully implemented.
2. **Phase 6 remainder — now implemented, live execution still open:**
   - `LlmSolvingAgent` (`src/harness/agents/llmSolvingAgent.ts`) is the real, LLM-backed solving
     agent, supporting Claude, ChatGPT, Gemini, or a local model via `src/harness/llm/` (ADR-013
     in [[14-decisions]]). It runs under **every** condition in the real comparison, including the
     native baseline — `NativeAgent` is *not* the baseline agent there; only the `ContextProvider`
     varies (native/ECC/each ablated component), per [[09-experiment-strategy]]'s causal-isolation
     principle. This corrects this item's earlier wording, which literally said `NativeAgent`
     "remains the native/no-context baseline" — see ADR-013 for the full reasoning. `NativeAgent`
     is unmodified and still used only in its own harness-plumbing tests.
   - `src/experiments/runComparisonExperiment.ts` runs the actual controlled comparison (native +
     full ECC + each `AblatedEccContextProvider` component = 9 conditions) × the 3 real-fixture
     tasks × 3 repetitions, and `src/experiments/analyzeComparisonResults.ts` feeds the results
     into Phase 7's `analyzeRepeatedRuns()` and Phase 8's `analyzeComponentContributions()`
     unchanged. **Not yet done:** actually *executing* this against a live LLM backend — that
     needs the user's own credentials/local server (`EEP_LLM_PROVIDER`/`EEP_LLM_MODEL`/
     `EEP_LLM_API_KEY`/`EEP_LLM_BASE_URL`, see `llmProviderConfigFromEnv.ts`) and a deliberate
     `npm run experiment:run` (then `npm run experiment:analyze`), which this implementation does
     not trigger automatically. See [[phases/phase-06]].
   - `Run.metadata.modelName`/`modelVersion` (required per [[10-reproducibility]]) are still not
     populated — `HarnessRunConfig`/`runHarness.ts` have no channel for an agent to report which
     model powered a run. Partial mitigation: `LlmSolvingAgent`'s default `Agent.name` embeds the
     exact provider/model. Fixing this properly means adding optional `modelName`/`modelVersion`
     fields to `HarnessRunConfig` and setting them in `executeRun()` from the agent's own identity
     — a small, additive `runHarness.ts` change, not yet made (outside the Phase 6 remainder's
     approved file scope). Pick this up before treating comparison-run results as fully
     reproducible metadata.
   - `EccContextProvider`/`AblatedEccContextProvider` currently have no real `tokenCount` from
     ECC's CLI contract, so both use Phase 5's `estimateTokenCount()` fallback on the serialized
     package — revisit if ECC's documented output ever adds one.
2a. **Phase 7 remainder — now implemented:** `src/analysis/failureClustering.ts`'s
   `analyzeFailureClusters()` (the 4th item in [[13-roadmap]]'s Phase 7 row) clusters
   `verificationMethod` failure rates overall and by condition/category/complexity, with a Wilson
   confidence interval per cluster (reusing `proportionConfidenceInterval()` from ADR-011's
   machinery, not new statistics), sorted worst-failure-rate-first.
   `src/experiments/analyzeComparisonResults.ts` wires it in alongside `analyzeRepeatedRuns()`/
   `analyzeComponentContributions()`. Proven correct against synthetic verification data in tests
   only — like the rest of Phase 7/8, it has not yet run against a real comparison run's data,
   since none has been executed (see item 2). See [[phases/phase-07]]'s remainder section.
2b. **Phase 8 orchestration — now implemented:** `src/experiments/experimentConditions.ts` builds
   all 7 `AblatedEccContextProvider` component conditions (plus native and full ECC) and
   `runComparisonExperiment.ts` runs every one against the benchmark end-to-end. As with item 2,
   the mechanism is built and tested but has not yet been executed against a live LLM backend.
2c. **Phase 9 — now implemented:** `src/reporting/`'s `buildReport()` builds a self-contained
   `ReportGraph` (a schema-valid `Report` plus every `Evaluation`/`Run`/`Trace`/`Outcome`/`Metric`/
   `Verification`/`Evidence`/`ContextArtifact` it references, deduplicated by id) from a set of
   evaluated runs, and `traceEvaluation()` drills one `Evaluation` down to its full backing chain
   — the concrete implementation of [[12-dashboard-strategy]]'s "no black-box KPI" principle.
   `src/experiments/generateReport.ts` (`npm run report:generate`) reads the raw
   `experiment-results/` dump back and persists the canonical artifact to
   `reports/<experimentId>/report.json`. See ADR-014 in [[14-decisions]] and
   [[phases/phase-09]]. **Not yet done, remaining Phase 9 roadmap scope:** CSV/Markdown/HTML
   export formats ([[13-roadmap]]'s full Phase 9 row lists "JSON, CSV, Markdown, HTML"; this
   round's user-specified exit criterion was narrowed to the canonical entity/persistence format
   itself) — pick up when a concrete consumer needs a non-JSON format, per the project's
   "don't build ahead of a real need" discipline (ADR-004/ADR-009). Also not yet done: folding
   Phase 7/8's statistical analysis output into the persisted Report (currently
   `analyzeComparisonResults.ts`'s output stays console-only, in-memory).
2d. **Phase 10 — now implemented:** `src/dashboard/`'s `renderDashboardPage()` renders one
   `ReportGraph` into a single, self-contained, offline-readable HTML file (overview panel plus
   one drill-down section per Evaluation, reusing `traceEvaluation()` unchanged) — a static file,
   no dev server, no new dependency (ADR-015 in [[14-decisions]]). `src/experiments/
   generateDashboard.ts` (`npm run dashboard:generate`) writes it to
   `dashboard/<experimentId>/index.html`. **Not yet done:** the rest of
   [[12-dashboard-strategy]]'s target view list — multi-experiment/condition comparison,
   complexity/category breakdowns, failure-cluster views — all of which need Phase 7/8's analysis
   output folded into `ReportGraph` first (same gap item 2c above already flags). Also not done:
   any client-side interactivity, and human-readable Task/Condition names (the dashboard shows raw
   `taskId`/`conditionId` since `ReportGraph` doesn't carry `Task`/`Condition` entities).
2e. **Phase 11 — now implemented:** `docs/BENCHMARK.md` and `docs/REPRODUCING.md` are new
   public-facing documentation (distinct from this internal `project-memory-bank/`), covering the
   benchmark's design, fixture status, 9-condition experiment design, verification/metrics
   methodology, the scientific-integrity commitment, and a full reproduction walkthrough. The one
   existing public "result" artifact, `docs/sample-dashboard.html`, was previously hand-copied into
   git; it is now produced by `npm run demo:generate`
   (`src/experiments/demoRunRecords.ts` + `generateDemoDashboard.ts`, reusing `buildReport()`/
   `renderDashboardPage()` unchanged) so it is reproducible rather than a one-off manual step. See
   ADR-016 in [[14-decisions]] and [[phases/phase-11]]. **Not yet done, by design:** publishing a
   *real* result (still gated on a live comparison run being executed and approved), any GitHub
   Pages/CI hosting automation (Phase 13's territory), and fixing the `modelName`/`modelVersion` gap
   (item 2 above) — `REPRODUCING.md` documents it as an open limitation, it does not resolve it.
2f. **Phase 12 — now implemented:** `npm run reproduce:smoke`
   (`src/experiments/runSmokeReproduction.ts`) runs the real harness/agent/verifier/metrics/Phase
   7-8 analysis/Phase 9 report/Phase 10 dashboard pipeline end-to-end, for free, using a new
   deterministic fake `LlmClient` (`src/harness/llm/deterministicFakeLlmClient.ts`) instead of a
   paid backend — the first time this pipeline has run against genuinely-executed data. The result
   is compared against a checked-in reference (`docs/reproduction-reference/smoke-reference.json`)
   keyed by `(taskId, conditionName)` (`src/experiments/reproductionReference.ts`/
   `compareRunResults.ts`) — never `report.json`'s random `conditionId`, which is minted fresh on
   every `buildExperimentConditions()` call and can never be a stable cross-run key. See ADR-017 in
   [[14-decisions]] and [[phases/phase-12]]. **Not yet done, by design:** a real published result
   from an actual live LLM (the fake agent never attempts to solve a task — this proves pipeline
   mechanics, not ECC's or any provider's quality); any mechanism for a second external user's
   independently-produced report to be uploaded/compared against a first user's (Phase 13's
   territory).
3. **Fixture backlog (not phase-blocking, pick up incrementally):** 27 of the 30 tasks still use
   the `"unpinned"` sentinel — only `debugging-01`, `feature-01`, `refactoring-01` have real
   fixture source code, a real `commitSha`, and real verification coverage. Author the rest the
   same way (build in a scratch location, `git commit` for a real SHA, copy the working tree
   without `.git` into `benchmark/fixtures/<id>/`) as they're needed. `feature-01` still has not
   been exercised through `executeEvaluatedRun()`/`computeRunMetrics()` in a test.
4. **Verifier coverage backlog (not phase-blocking):** 7 of the 9 `verificationMethod` enum values
   have no `Verifier` implementation yet — add one as a fixture actually needs it, following the
   `Verifier` interface + `ALL_VERIFIERS` registry pattern (ADR-008).
5. **Metrics coverage backlog (not phase-blocking):** 8 of the 22 named metrics
   (`evidence-recall`/`-precision`/`-authority`/`-freshness`, `context-redundancy`,
   `regression-rate`, `risk-classification`, `decision-confidence`) are not computed. Now that
   `EccContextProvider` exists, its `ContextArtifact.content` carries ECC's real per-item
   `relevance`/`trustLevel`/`provenance.authority`/`provenance.freshness` data — a genuine future
   data source for `evidence-recall`/`-precision`/`-authority`/`-freshness` once a pipeline stage
   extracts it into `Evidence[]` records (no such extraction path exists yet; the artifact's
   content is opaque text to the rest of the system today). `context-redundancy`,
   `regression-rate`, `risk-classification`, and `decision-confidence` still need other data
   sources entirely (cross-run history, a `Task.risk` field, a `Decision.confidence` field). See
   ADR-009 in [[14-decisions]] for the full reasoning per metric — do not compute any of these
   until a real source lands, per that ADR's discipline.
6. **Environment portability note:** `EccContextProvider`/`ProcessEccCliInvoker` never hardcode a
   path to the sibling ECC checkout — the invoked command defaults to `ECC_CLI_COMMAND` env var
   (else `"ecc"` on PATH) with optional `commandArgs`. To point at a local ECC checkout without a
   global `npm link`, construct with `{ command: 'node', commandArgs: ['<checkout>/dist/cli/index.js'] }`
   or set `ECC_CLI_COMMAND=node` and pass `commandArgs` accordingly. See ADR-010 and
   [[phases/phase-06]].

7. **Statistics convention note (ADR-011):** `src/analysis/` supports exactly three confidence
   levels (90%/95%/99%), each backed by an exact published critical value — do not add a new
   level without adding its exact table value, and do not replace the table with an approximated
   inverse-distribution formula. Multiple-comparisons correction (flagged as a known limitation in
   [[phases/phase-07]] and still not implemented in [[phases/phase-09]]) belongs in a `Report`'s
   `limitations`/reporting layer, not by changing `analyzeRepeatedRuns()`'s per-comparison
   confidence level.

8. **Ablation convention note (ADR-012):** `src/harness/providers/eccAblation.ts` only ablates
   fields ECC's documented package contract already reports — never invent a component dimension
   ECC doesn't actually surface. Ablation is content-level (post-hoc field removal from the CLI's
   JSON output), not a true inside-ECC per-component toggle, since ECC's CLI contract has no such
   flag and EEP cannot fork/patch ECC (ADR-001). If ECC's documented contract ever adds a
   per-component flag, prefer wiring that directly over content-level ablation.

9. **LLM backend convention note (ADR-013):** `src/harness/llm/createLlmClient.ts` never picks a
   default provider — `src/experiments/llmProviderConfigFromEnv.ts` always resolves
   `EEP_LLM_PROVIDER` (`"anthropic"` or `"openai-compatible"`), `EEP_LLM_MODEL`, and
   `EEP_LLM_API_KEY`/`EEP_LLM_BASE_URL` as applicable from the environment, throwing
   `MissingLlmConfigError` rather than silently falling back. To add a fifth backend that isn't
   Anthropic-native or OpenAI-compatible-shaped, add a third `LlmClient` implementation rather than
   overloading either existing adapter. To run the real comparison against a local model, set
   `EEP_LLM_PROVIDER=openai-compatible` and `EEP_LLM_BASE_URL` to that local server's URL (e.g.
   Ollama's `http://localhost:11434/v1`) — no `EEP_LLM_API_KEY` needed. See
   `agentBudgetConfigFromEnv()` for the agent's own turn/token/wall-clock budget env vars
   (`EEP_AGENT_MAX_TURNS`, `EEP_LLM_MAX_TOKENS`, `EEP_AGENT_WALL_CLOCK_BUDGET_MS`).

10. **Reporting convention note (ADR-014):** `src/reporting/` depends only on `src/domain/` — it
   never imports from `src/experiments/`/`harness`/`evaluation`, the same one-way-dependency
   discipline ADR-011 established for `src/analysis/`. `src/experiments/generateReport.ts` is the
   one place that adapts `RunResultBundle` into `EvaluatedRunRecord`; keep that adaptation there,
   not inside `src/reporting/`. `experiment-results/`'s per-run dump is a crash-safe write-ahead
   record, not the canonical artifact — `reports/<experimentId>/report.json` is; don't treat the
   raw dump as something a report reader/dashboard should read directly.

11. **Dashboard convention note (ADR-015):** `src/dashboard/` depends only on `src/domain/` and
   `src/reporting/` — it never imports from `src/experiments/`/`harness`/`evaluation`, matching
   [[04-architecture]]'s layering ("Dashboard... reads canonical artifacts only, owns no
   evaluation logic"). `src/experiments/generateDashboard.ts` is the one place that resolves which
   report to read from disk; keep that resolution there, not inside `src/dashboard/`. Every
   report-sourced string must pass through `htmlEscape.ts` before being embedded in rendered HTML
   — this data can be LLM/agent-authored. The dashboard is a static-file generator, not a server;
   don't add a dev/live server without a concrete need (ADR-004/ADR-009 discipline). Any new
   gitignored output directory under the repo root (`reports/`, `dashboard/`,
   `experiment-results/`) must be anchored with a leading `/` in `.gitignore` — an unanchored
   pattern can accidentally match a same-named `src/` subdirectory, as happened with `dashboard/`
   matching `src/dashboard/` when first added (caught before commit).

12. **Public-docs convention note (ADR-016):** `docs/BENCHMARK.md` and `docs/REPRODUCING.md` are
   written for an external reader and must stay self-contained — paraphrase `project-memory-bank/`
   content into them rather than linking a public doc into this internal, AI/dev-facing memory
   bank. There is no separate "publish" script: a generated `dashboard/<experimentId>/index.html`
   file is itself the publishable artifact (copy it anywhere). If the benchmark's metric list,
   ablation components, or condition design change, update `docs/BENCHMARK.md` in the same change
   — it has no automated freshness check against its `project-memory-bank/` sources.

13. **Smoke-reproduction convention note (ADR-017):** the `fake-deterministic` `LlmProviderConfig`
   (`src/harness/llm/`) exists solely for `npm run reproduce:smoke`; never wire it up as a
   real-comparison-run option or a default. Any comparison mechanism that needs to identify "which
   condition a run belongs to" across two independently-generated experiments must key off the raw
   `RunResultBundle.conditionName` (stable), never `Run.conditionId`/`report.json` (a fresh random
   id every `buildExperimentConditions()` call). `docs/reproduction-reference/smoke-reference.json`
   is a checked-in file, regenerated manually (`extractReferenceEntries()` +
   `writeReferenceEntries()`) only when a real change (a fixture's tests, the metric set, the
   verifier set) legitimately changes the smoke path's expected output — never regenerated
   automatically from a user's own run, which would defeat its purpose as an independent check.
   `time-to-correct-outcome` must stay excluded from any such reference/comparison; it is the one
   metric built from wall-clock timestamps and never reproduces exactly.

Do not execute a live comparison run before approval is given (master prompt §40). Phase 13
(CI/GitHub Integration), the remaining Phase 9 roadmap scope (item 2c above), and richer Phase 10
dashboard views (item 2d above) also await explicit approval before implementation starts.
