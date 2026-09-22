# Phase 11 — Public Benchmark

## Objective

Per [[13-roadmap]]'s Phase 11 row: "Benchmark documentation, reproducibility, public results."
Phase 12 ("External Reproduction") is the later, separate phase for onboarding actual external
users — this phase is EEP producing its own public-facing documentation and result artifacts.

## Scope narrowing

No live comparison run has ever been executed (still gated on the user's own LLM credentials and
a separate explicit approval). "Public results" this round therefore cannot mean publishing a real
finding — following the same narrowing pattern Phase 9 (canonical Report persistence only) and
Phase 10 (overview+drilldown only) already established, this round's "public results" means: make
the one existing public-facing result artifact (`docs/sample-dashboard.html`, previously a
hand-copied file with no regeneration script) reproducible, and document plainly that a real
published result still awaits a live run. This is called out explicitly rather than silently
substituted, to avoid the phase's own name ("Public Benchmark") being misread as evidence of a
finding that does not exist.

## Implemented

**Public-facing documentation** (`docs/`, distinct from this internal `project-memory-bank/` per
ADR-016 in [[14-decisions]]):

- **`docs/BENCHMARK.md`** — the benchmark's design for an external reader: task categories/counts
  (30 total across 8 categories), fixture status (3 real, 27 stub), the 9-condition experiment
  design (native baseline + full ECC + 7 named component ablations, causal-isolation rationale),
  verification methodology, metrics, and a paraphrased scientific-integrity commitment from
  [[00-project-charter]].
- **`docs/REPRODUCING.md`** — a step-by-step reproduction guide: prerequisites, LLM provider
  environment variables with a prominent privacy/cost caveat, the exact
  `experiment:run` → `experiment:analyze` → `report:generate` → `dashboard:generate` command
  sequence, required run metadata and independent versioning axes from [[10-reproducibility]], the
  immutability policy, a "publishing a result" section, and a numbered current-limitations list.

**Regenerable public sample** (`src/experiments/`, all files under 300 lines):

- **`demoRunRecords.ts`** (102 lines) — a pure function returning two literal, schema-valid
  `EvaluatedRunRecord` values (a native-condition `TASK_FAILURE` and a full-ECC-condition
  `SUCCESS`, both on `debugging-01`), explicitly commented as synthetic-only, mirroring the
  narrative already present in the previously-hand-copied `docs/sample-dashboard.html`.
- **`generateDemoDashboard.ts`** (43 lines) — orchestrator: `demoRunRecords()` → `buildReport()`
  (reused unchanged from Phase 9) → `renderDashboardPage()` (reused unchanged from Phase 10) →
  write to `docs/sample-dashboard.html` (or an injectable path for tests). New
  `npm run demo:generate` script and CLI entry point, mirroring `generateDashboard.ts`'s pattern.

No changes to `src/dashboard/` or `src/reporting/` — pure reuse, no duplication.

`README.md` updated to link both new docs and describe the sample dashboard as a script output.

## Tests

3 new tests across 2 new test files (302 total across 80 files, up from 299/79):
`demoRunRecords.test.ts` (returns exactly 2 schema-valid records; asserts they use different
`conditionId`s), `generateDemoDashboard.test.ts` (writes to an injectable output path, asserts the
title/synthetic-data disclaimers/two evaluation sections are present, and no external URLs appear).

## Validation

- `npm run build && npm test && npm run lint` — clean build, 302/302 tests passing across 80 files
  (0 failures this run — the previously-observed `eccCliInvoker.test.ts` subprocess-spawn timing
  flake, documented in [[phases/phase-10]], did not reproduce, consistent with load-dependent
  flakiness rather than a regression), zero lint errors.
- `rm -rf dist && npm run build` — confirmed no `*.test.*` files leak into the compiled output;
  the new `dist/experiments/generateDemoDashboard.js` CLI entry point compiled correctly.
- Ran `npm run demo:generate` for real and diffed the regenerated `docs/sample-dashboard.html`
  against its previously-committed version: identical apart from the randomly-generated report and
  evaluation ids (expected — `buildReport()`/`buildEvaluation()` always mint fresh ids; they are
  never used as stable cross-run references).
- Quantitative modularity check: largest new file is `demoRunRecords.ts` at 102 lines, comfortably
  under the 300-line ceiling.
- `git status --short` reviewed; change set matches intent (2 new `src/experiments/*.ts` + 2 new
  test files, 2 new `docs/*.md`, regenerated `docs/sample-dashboard.html`, edited `README.md`,
  `package.json`, `src/experiments/index.ts`, and the memory-bank files listed below).

## Decisions made

ADR-016 in [[14-decisions]]: public-facing docs live in `docs/`, not `project-memory-bank/`;
"publishing a result" reuses the dashboard's existing self-contained HTML file as-is (no new
publish/export pipeline, matching ADR-015/ADR-004's local-first discipline); the one real gap
closed is making the *existing* demo artifact regenerable instead of hand-copied.

## Explicitly not implemented (by design, later work)

- **A real published benchmark result.** Still gated on an approved live comparison run — this
  phase produces documentation and a regenerable synthetic demo only, not a finding.
- **Any GitHub Pages / CI hosting automation.** [[13-roadmap]]'s Phase 13 ("CI/GitHub Integration")
  territory; would also add cloud/CI infrastructure ahead of a concrete need, against
  [[04-architecture]]'s local-first mandate.
- **A new "publish" orchestration pipeline** separate from the existing dashboard generator — would
  be near-total duplication of `generateDashboard.ts` with no decoupling justification.
- **Fixing the `Run.metadata.modelName`/`modelVersion` gap.** [[20-next-actions]] and [[16-risks]]
  already track this as an open item; `docs/REPRODUCING.md` documents it as a limitation for a
  public reader but does not resolve it.
- **Authoring more of the 27 backlog task fixtures.**

## Known limitations

- `docs/BENCHMARK.md`/`docs/REPRODUCING.md` are plain Markdown with no automated check that they
  stay in sync with their `project-memory-bank/` sources (metric list, ablation components,
  condition design) — a future change to those must update the public docs in the same change, or
  they will silently drift out of date. Flagged as a process reminder in [[20-next-actions]] and
  [[active-context]], not solved with tooling this round (no concrete need yet — ADR-004/ADR-009
  discipline).
- The regenerated `docs/sample-dashboard.html` embeds a fresh random report id and two fresh random
  evaluation ids on every run — a harmless, expected cosmetic difference (these ids are never used
  as stable references), but means the committed file's exact byte content will differ slightly
  each time `npm run demo:generate` is re-run, even with no other change.
- `docs/REPRODUCING.md`'s privacy/cost caveat and required-metadata list are accurate as of this
  round but are hand-maintained prose, not generated from `llmProviderConfigFromEnv.ts`/
  `runMetadataSchema` directly — a future change to either could drift out of sync if not updated
  alongside.

## Risks discovered

No new risk-register row was needed. This phase adds documentation and one small, pure,
already-tested-pattern rendering script over data Phases 9/10 already produce and validate — it
introduces no new operational risk category [[16-risks]] tracks. `16-risks.md`'s existing
"Agent/model version drift" row was updated (not newly opened) to note that `docs/REPRODUCING.md`
now surfaces that gap to a wider, external-facing audience, still `Open`.

## Status

Complete (this round's scope: benchmark documentation, a reproducibility guide, and a regenerable
public sample dashboard — a real published result still requires an approved live comparison run).
Pending user approval to proceed with executing a live comparison run, Phase 12 (External
Reproduction), the remaining Phase 9 roadmap scope (CSV/Markdown/HTML export), richer Phase 10
dashboard views, or any other next step.
