# Engineering Evaluation Platform (EEP)

[![CI](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-/actions/workflows/ci.yml/badge.svg)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-/actions/workflows/ci.yml)

**Reproducible evaluation infrastructure for AI-assisted software engineering.**

EEP exists to answer one question with evidence rather than anecdote:

> Does an AI-assisted engineering system actually improve software-engineering outcomes?

It is a scientific instrument first and a dashboard/product second. EEP evaluates AI coding
agents (with or without external context providers, such as the separate
[Engineering Context Compiler (ECC)](#relationship-to-ecc)) against a benchmark of realistic
engineering tasks, capturing full traces and producing reproducible, falsifiable results.

## Status

Phase 13 of 13 complete — see
[`project-memory-bank/19-phase-status.md`](project-memory-bank/19-phase-status.md) for the
per-phase ledger and [`project-memory-bank/13-roadmap.md`](project-memory-bank/13-roadmap.md) for
the full roadmap. **335 tests passing across 87 files** (verified 2026-09-22: `npm test`).

Built and working: the evaluation contract and 14-entity domain model, a 30-task benchmark (3
with real fixture code and pinned commits), an isolated experiment harness, deterministic
verification, a 14-of-22-metric scoring engine, a hand-rolled statistics module (confidence
intervals, effect sizes, failure clustering), a real ECC `ContextProvider` integration
(subprocess CLI invocation, plus per-component ablation), canonical `Report`/`ReportGraph`
persistence, a static HTML dashboard MVP, public-facing benchmark/reproducibility documentation, a
free, zero-credential "smoke reproduction" that runs the real pipeline end-to-end and verifies it
against a checked-in reference, a GitHub Actions CI workflow that runs that same smoke
reproduction on every push/PR, an offline cross-user report comparison CLI
(`npm run report:compare`), and a GitHub Pages workflow that can publish `docs/` as a static site
(manual opt-in — see [Continuous Integration](#continuous-integration) below).

Not yet done: executing a live comparison run against a real, paid LLM backend (the mechanism is
built and verified end-to-end — including against genuinely-executed, not just synthetic, data via
`npm run reproduce:smoke` — but running it with a real LLM actually attempting each task needs the
user's own API key or local model and an explicit `npm run experiment:run`). See
[`project-memory-bank/20-next-actions.md`](project-memory-bank/20-next-actions.md) for the full
backlog.

## Continuous Integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push/PR to `main` (Node 20.x
and 22.x): build, lint, the full test suite, and — genuinely, not just build/lint/test —
`npm run reproduce:smoke`, so every CI run is an independent machine re-proving the real pipeline
reproduces identically against the checked-in reference. It needs no secrets and makes no network
calls, so it runs safely on pull requests from forks. [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
can publish `docs/` (including the sample dashboard) to GitHub Pages — this is a manual,
one-time-opt-in workflow, not run automatically; see
[`docs/REPRODUCING.md`](docs/REPRODUCING.md#publishing-to-github-pages).

## Benchmark and reproduction

- [`docs/BENCHMARK.md`](docs/BENCHMARK.md) — what the benchmark measures, task categories, fixture
  status, the 9-condition experiment design, verification/metrics methodology.
- [`docs/REPRODUCING.md`](docs/REPRODUCING.md) — step-by-step guide to running a comparison
  yourself, including a free `npm run reproduce:smoke` path that needs no credentials, required
  run metadata, and current limitations.

## Start here

 All durable project context — charter, architecture, domain model, methodology, roadmap,
decisions, assumptions, risks, and current state — lives in
[`project-memory-bank/`](project-memory-bank/). Read the relevant memory-bank files before
reading source code or making changes. Start with
[`00-project-charter.md`](project-memory-bank/00-project-charter.md) for the mission and hard
constraints, then [`04-architecture.md`](project-memory-bank/04-architecture.md) for the
EEP/ECC boundary and module layering.

## Demo

[`docs/sample-dashboard.html`](docs/sample-dashboard.html) is a real, self-contained page produced
by `npm run demo:generate` (`buildReport` → `renderDashboardPage`, the same code path
`dashboard:generate` runs, against two literal synthetic runs in
`src/experiments/demoRunRecords.ts`) — download it and open it in a browser. **The two runs it
shows are synthetic fixture data, not a real evaluation**, and the page says so in its own
"Limitations" section; this demonstrates the dashboard renderer, not a benchmark result. To
generate a real one from an actual comparison run, see [`docs/REPRODUCING.md`](docs/REPRODUCING.md):
`npm run experiment:run`, then `npm run report:generate` and `npm run dashboard:generate`.

## Relationship to ECC

The Engineering Context Compiler (ECC) is a separate, pre-existing repository. EEP treats ECC as
one external, unmodified implementation of a generic `ContextProvider` interface — EEP never
modifies ECC's source and never becomes coupled to its internals. See
[`project-memory-bank/00-project-charter.md`](project-memory-bank/00-project-charter.md).

## Relationship to AI-Evaluation-Platform (AEP)

A separate repository, `AI-Evaluation-Platform`, also has "evaluation" in its purpose but answers
a different question: AEP is a governance/deploy-readiness gate for arbitrary AI model or prompt
outputs (RBAC, audit trail, mandatory-approval release gates). EEP is a scientific instrument for
one narrower question — does AI-assisted *software engineering* tooling actually improve
engineering outcomes — using a benchmark of realistic engineering tasks, with ECC as its first
subject under test. The two are independent products with no shared code and no merge planned.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).
