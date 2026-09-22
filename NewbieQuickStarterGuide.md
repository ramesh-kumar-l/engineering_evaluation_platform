# Newbie Quickstart Guide

You just cloned the Engineering Evaluation Platform (EEP) for the first time. This guide answers
the questions a first-time reader actually has, in the order they come up — not a schema reference.
For the full design history, decisions, and architecture, see
[`project-memory-bank/`](project-memory-bank/); this guide only summarizes and links out to it.

## What is this project, in one paragraph?

EEP is a benchmark and evaluation harness that answers one question with evidence, not anecdote:
does pairing an AI coding agent with a context-compilation system (its first subject under test is
a separate project, the Engineering Context Compiler / ECC) actually improve engineering outcomes
compared to giving the same agent no curated context at all? It runs the same LLM-backed agent
against a set of realistic engineering tasks under different "conditions" (no context, full ECC
context, and several ablated variants of ECC's context), verifies every outcome independently and
deterministically (never trusting the agent's own claim of success), and produces a fully traceable
report — every number resolves back to the exact run, trace, and evidence that produced it. See
[`docs/BENCHMARK.md`](docs/BENCHMARK.md) for the full design and
[`project-memory-bank/00-project-charter.md`](project-memory-bank/00-project-charter.md) for the
EEP/ECC relationship and the project's hard constraints (local-first, no shared code with ECC, no
result adjusted to flatter either system).

**Important, up front:** no live comparison run has ever been executed against a real, paid LLM.
Everything runnable in this repository today is either an automated-test fixture, a free
deterministic "smoke" pipeline check, or an explicitly-labeled synthetic demo. See
[`docs/BENCHMARK.md#current-status`](docs/BENCHMARK.md#current-status).

## Requirements

- **Node.js ≥ 20** (checked by `package.json`'s `engines` field). No Python, no database, no
  external services — this is a deliberately local-first project
  ([`project-memory-bank/04-architecture.md`](project-memory-bank/04-architecture.md)).
- **npm** (ships with Node). Dependencies are pinned via the committed `package-lock.json` — always
  install with `npm ci`, not `npm install`, to get exactly the locked versions.
- Optionally, a separate ECC checkout if you want the `ecc`/ablation conditions to run against a
  real ECC CLI later — not required for anything in this guide.

## Setup, step by step

```
git clone <this repo>
cd Engineering-Evaluation-Platform-EEP-
npm ci
npm run build
npm run lint
npm test
```

`npm ci` installs exactly the versions locked in `package-lock.json`. `npm run build` compiles
`src/` (TypeScript, ES2022/NodeNext/strict) to `dist/`. `npm test` runs the full Vitest suite —
hundreds of tests colocated as `src/**/*.test.ts` next to the code they cover (excluded from the
`tsc` build itself; see `tsconfig.json`'s `exclude`). All three should complete cleanly with no
setup beyond Node and `npm ci`.

## Run the free, zero-credential smoke reproduction

This is the best first thing to run after setup — it exercises the *real* pipeline end-to-end
(harness, LLM-agent interface, verifiers, metrics, statistical analysis, report generation,
dashboard rendering) without needing any API key, using a deterministic fake LLM client that never
actually attempts to solve a task:

```
npm run reproduce:smoke
```

Output goes to `experiment-results-smoke/`, `reports-smoke/`, `dashboard-smoke/` (all gitignored)
and the command finishes by comparing your run against a reference checked into
`docs/reproduction-reference/smoke-reference.json`, printing `Reproduction PASSED.` on success. This
is also exactly what CI runs on every push — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
Full detail: [`docs/REPRODUCING.md`](docs/REPRODUCING.md).

## Look at the sample dashboard

```
npm run demo:generate
```

Then open `docs/sample-dashboard.html` in a browser. **The two runs it shows are hand-authored
synthetic fixture data** (`src/experiments/demoRunRecords.ts` says so in its own comment), used only
to demonstrate the dashboard renderer — the page's own "Limitations" section says the same. It is
not a benchmark result.

## Project structure map

| Path | What it's for |
|---|---|
| `src/domain/` | The 14-entity evaluation contract/schema (`Evaluation`, `Run`, `Trace`, `Outcome`, `Metric`, `Verification`, `Evidence`, `ContextArtifact`, `Report`, etc.) — the data model everything else builds on. |
| `src/harness/` | The experiment harness: LLM client abstraction, the solving agent, the ECC `ContextProvider` integration. |
| `src/evaluation/` | Deterministic `Verifier`s that independently judge whether a run actually succeeded. |
| `src/metrics/` | The metrics-scoring engine. |
| `src/analysis/` | Statistics — confidence intervals, effect sizes, failure clustering, per-component ablation measurement. |
| `src/reporting/` | Builds the canonical, self-contained `ReportGraph` from raw run data. |
| `src/dashboard/` | Renders a `ReportGraph` into a single offline-readable HTML page. |
| `src/experiments/` | CLI entry points that wire the above into runnable pipelines (`npm run experiment:run`, `reproduce:smoke`, `report:compare`, etc.) — this is where to look for "how do I actually run X." |
| `benchmark/tasks/` | The 30 task definitions (JSON), each scoring category/complexity/acceptance-criteria/verification-method. |
| `benchmark/fixtures/` | Real, runnable source code + tests for the 3 tasks that have them so far (`debugging-01`, `feature-01`, `refactoring-01`) — self-hosted here, not an external repo, specifically to avoid benchmark contamination. |
| `docs/` | Public-facing documentation: `BENCHMARK.md`, `REPRODUCING.md`, `golden-examples/`, the sample dashboard. |
| `project-memory-bank/` | The full internal design history: charter, architecture, decisions (ADRs), roadmap, current status. Read this before source code if you want the "why," not just the "what." |
| `blogs/` | A written series explaining the project's design decisions in depth (see [`blogs/README.md`](blogs/README.md)). |
| `dist/` | Build output (gitignored). |

## Glossary

Plain-English definitions; see [`project-memory-bank/03-domain-model.md`](project-memory-bank/03-domain-model.md)
for the full schema if you need it.

- **`ContextProvider`** — the interface any context-compilation system implements to supply an
  agent with curated information about a task. ECC is one implementation; `native` (the baseline
  condition) is effectively "no provider."
- **`Verifier`** — independent, deterministic logic that decides whether a run actually succeeded —
  e.g. by running the fixture's real test suite. An agent's own claim of success is never trusted.
- **`Evaluation` / `Run` / `Trace` / `Outcome` / `Metric` / `Evidence`** — the traceability chain: an
  `Evaluation` groups the `Run`s for one task; each `Run` has a `Trace` of what the agent actually
  did; a `Verifier` produces an `Outcome`; `Metric`s are computed from the run and reference
  `Evidence` — nothing is a bare number with no path back to what produced it.
- **`ReportGraph`** — the canonical, self-contained, citable output of one full comparison: a
  `Report` plus every entity it references, deduplicated, in one file.
- **Ablation** — running ECC's context with exactly one field (history, memory, ranking, provenance,
  risk flags, budgeting, verification data) stripped or neutralized, to measure that field's
  marginal contribution, holding everything else constant.
- **Condition** — which `ContextProvider` (and, for ECC, which ablation) an agent receives for a
  given run; everything else (agent, model, task, repository state) is held constant across
  conditions.

## Where do I find X?

| Question | Look here |
|---|---|
| Why does this project exist, and what are its hard constraints? | [`project-memory-bank/00-project-charter.md`](project-memory-bank/00-project-charter.md) |
| How is EEP/ECC's boundary enforced? | [`project-memory-bank/04-architecture.md`](project-memory-bank/04-architecture.md) |
| What's the full schema/domain model? | [`project-memory-bank/03-domain-model.md`](project-memory-bank/03-domain-model.md) |
| Why was decision X made a particular way? | [`project-memory-bank/14-decisions.md`](project-memory-bank/14-decisions.md) (ADR log) |
| What's built vs. not yet built? | [`project-memory-bank/19-phase-status.md`](project-memory-bank/19-phase-status.md), [`project-memory-bank/implementation-status.md`](project-memory-bank/implementation-status.md) |
| What's the current open backlog? | [`project-memory-bank/20-next-actions.md`](project-memory-bank/20-next-actions.md) |
| What known limitations exist? | [`project-memory-bank/17-known-limitations.md`](project-memory-bank/17-known-limitations.md) |

## Common questions

**Why hasn't a real result been published yet?** Running the comparison for real requires an LLM
actually attempting each task, which needs the user's own API credentials (or a local model) and
incurs real cost/time — it's a deliberate, explicit action (`npm run experiment:run`), never
triggered automatically by CI or by cloning the repo. See
[`docs/REPRODUCING.md`](docs/REPRODUCING.md).

**Why do only 3 of 30 tasks have real fixtures?** Authoring a real, runnable fixture (source code +
tests + a pinned commit) for each task is deliberate, careful work — the other 27 currently exist
only as task definitions (title, acceptance criteria, verification method). This is tracked openly
as backlog, not hidden.

**Why no database, no server, no cloud infra?** EEP is local-first by design until a concrete
requirement demonstrates the need for more — see
[`project-memory-bank/04-architecture.md`](project-memory-bank/04-architecture.md). Reports and
dashboards are self-contained files you can copy anywhere.

**Where are the tests?** Colocated next to the code they test, as `*.test.ts` files throughout
`src/`, run via Vitest (`npm test`). There is no separate top-level `tests/` directory.

**What are the "golden examples"?** Two of the three real-fixture tasks
(`debugging-01`, `refactoring-01`), each with a full design walkthrough — what makes the task a
good benchmark item, what a context-free attempt is likely to get wrong, and how verification
judges it: [`docs/golden-examples/`](docs/golden-examples/).

## Troubleshooting

- **`npm run build` or a CLI script fails with a missing `dist/...` file.** Every `npm run
  experiment:*`, `report:*`, `dashboard:*`, `demo:*`, `reproduce:smoke` script runs `npm run build`
  first as part of the same script — but if you ran a compiled file under `dist/` directly without
  building first, run `npm run build` yourself first.
- **Node version errors.** Check `node --version` is ≥ 20 (`package.json`'s `engines.node`). Older
  Node versions are not supported.
- **`npm install` produced different versions than expected.** Use `npm ci`, not `npm install`, to
  install exactly what `package-lock.json` locks — `npm install` can update the lockfile itself.

## Next steps

- Read the two golden examples: [`docs/golden-examples/debugging-01.md`](docs/golden-examples/debugging-01.md),
  [`docs/golden-examples/refactoring-01.md`](docs/golden-examples/refactoring-01.md).
- Read the blog series for the design reasoning behind the whole system: [`blogs/README.md`](blogs/README.md).
- Read [`docs/REPRODUCING.md`](docs/REPRODUCING.md) if you want to eventually run a real comparison
  yourself.
