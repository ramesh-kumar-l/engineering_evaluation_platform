# Engineering Evaluation Platform (EEP)

**Reproducible evaluation infrastructure for AI-assisted software engineering.**

EEP exists to answer one question with evidence rather than anecdote:

> Does an AI-assisted engineering system actually improve software-engineering outcomes?

It is a scientific instrument first and a dashboard/product second. EEP evaluates AI coding
agents (with or without external context providers, such as the separate
[Engineering Context Compiler (ECC)](#relationship-to-ecc)) against a benchmark of realistic
engineering tasks, capturing full traces and producing reproducible, falsifiable results.

## Status

Phase 10 of 13 complete — see
[`project-memory-bank/19-phase-status.md`](project-memory-bank/19-phase-status.md) for the
per-phase ledger and [`project-memory-bank/13-roadmap.md`](project-memory-bank/13-roadmap.md) for
the full roadmap. **299 tests passing across 78 files** (verified 2026-09-19: `npm test`).

Built and working: the evaluation contract and 14-entity domain model, a 30-task benchmark (3
with real fixture code and pinned commits), an isolated experiment harness, deterministic
verification, a 14-of-22-metric scoring engine, a hand-rolled statistics module (confidence
intervals, effect sizes, failure clustering), a real ECC `ContextProvider` integration
(subprocess CLI invocation, plus per-component ablation), canonical `Report`/`ReportGraph`
persistence, and a static HTML dashboard MVP.

Not yet done: executing a live comparison run against a real LLM backend (the mechanism is built
and tested end-to-end against synthetic data; it needs the user's own API key or local model and
an explicit `npm run experiment:run`), and Phase 11+ (public benchmark, external reproduction, CI
integration). See [`project-memory-bank/20-next-actions.md`](project-memory-bank/20-next-actions.md)
for the full backlog.

## Start here

 All durable project context — charter, architecture, domain model, methodology, roadmap,
decisions, assumptions, risks, and current state — lives in
[`project-memory-bank/`](project-memory-bank/). Read the relevant memory-bank files before
reading source code or making changes. Start with
[`00-project-charter.md`](project-memory-bank/00-project-charter.md) for the mission and hard
constraints, then [`04-architecture.md`](project-memory-bank/04-architecture.md) for the
EEP/ECC boundary and module layering.

## Demo

[`docs/sample-dashboard.html`](docs/sample-dashboard.html) is a real, self-contained page
produced by EEP's own rendering pipeline (`buildReport` → `writeDashboard`, the same code path
`npm run dashboard:generate` runs) — download it and open it in a browser. **The two runs it
shows are synthetic fixture data, not a real evaluation**, and the page says so in its own
"Limitations" section; this demonstrates the dashboard renderer, not a benchmark result. To
generate a real one from an actual comparison run: `npm run experiment:run` (needs your own LLM
credentials — see [`project-memory-bank/20-next-actions.md`](project-memory-bank/20-next-actions.md)),
then `npm run report:generate` and `npm run dashboard:generate`.

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
