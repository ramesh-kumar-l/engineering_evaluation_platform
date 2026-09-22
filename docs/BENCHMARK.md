# The EEP Benchmark

**No live comparison run has been executed yet.** Everything in this repository today — including
[`docs/sample-dashboard.html`](sample-dashboard.html) — is either an automated-test fixture or an
explicitly-labeled synthetic demo. This document describes the benchmark's *design*, not a
published result. See [REPRODUCING.md](REPRODUCING.md) for how to run it yourself and change that.

## What this measures

The Engineering Evaluation Platform (EEP) measures whether an AI coding agent performs
measurably better on realistic engineering tasks when paired with a given context-compilation
system, versus a native baseline with no curated context. Its first subject under test is the
[Engineering Context Compiler (ECC)](../README.md#relationship-to-ecc), a separate, unmodified
system integrated only through its public CLI contract.

## Task categories

30 tasks total, each one JSON file under `benchmark/tasks/<id>.json`:

| Category | Count |
|---|---|
| Debugging | 6 |
| Feature | 6 |
| Refactoring | 5 |
| Test generation | 4 |
| Migration | 3 |
| Performance | 2 |
| Code review | 2 |
| Architecture | 2 |
| **Total** | **30** |

Each task also carries a complexity rating from L1 (trivial) to L5 (architectural/systemic).

## Fixture status

A task's JSON definition (title, description, acceptance criteria, verification method, ground
truth) is separate from having a real, runnable fixture repository behind it. As of today:

| Task | Fixture status |
|---|---|
| `debugging-01` | Real fixture, pinned commit SHA |
| `feature-01` | Real fixture, pinned commit SHA |
| `refactoring-01` | Real fixture, pinned commit SHA |
| Remaining 27 tasks | Task definition only — fixture source code not yet authored |

Fixtures are self-hosted inside this repository under `benchmark/fixtures/<id>/` — never an
external GitHub repository — specifically to avoid benchmark contamination (well-known public code
may already be in a model's training data) and to keep every task fully offline and reproducible.

## Experiment design

Every run pairs one agent against one task under one **condition** — a condition is defined
entirely by which `ContextProvider` the agent receives, holding everything else constant (same
agent, same model, same task, same repository state, same evaluator version):

| Condition | Context source |
|---|---|
| `native` | No curated context — task text plus a plain file listing only |
| `ecc` | ECC's full compiled context package |
| `ecc-ablated:history` | ECC's context with the `history` field neutralized |
| `ecc-ablated:memory` | ECC's context with memory-sourced evidence removed |
| `ecc-ablated:ranking` | ECC's context with relevance ranking replaced by a neutral order |
| `ecc-ablated:provenance` | ECC's context with per-evidence provenance stripped |
| `ecc-ablated:risk` | ECC's context with conflict/risk flags removed |
| `ecc-ablated:budgeting` | ECC's context with the excluded-items list removed |
| `ecc-ablated:verification` | ECC's context with verification data removed |

That is 9 conditions per task. The same task is run 3 times per condition (default, configurable)
to give the statistics layer (confidence intervals, effect sizes) something to work with —
individual LLM runs are not deterministic.

**Why the same agent runs every condition:** an earlier design would have kept a deterministic,
non-code-generating agent as the "native" baseline while only the ECC condition used a real
LLM-backed agent. That conflates two different variables — "having a capable agent at all" and
"having curated context" — into one measurement. Every condition here uses the identical
LLM-backed solving agent; only the `ContextProvider` varies, which isolates context quality as the
one thing actually being tested.

**Ablation methodology:** ECC is integrated only through its documented CLI contract, which has no
flag to disable an internal component. Ablation is therefore done at the *content* level: after
ECC returns its full, validated context package, exactly one already-present field is
deterministically stripped or neutralized before the agent sees it, holding every other field
constant. This measures the marginal contribution of that field's information, not necessarily
ECC's internal architecture — if a component's effect leaks into another field this scheme doesn't
touch, the isolation is imperfect. That is a known, documented limitation, not an oversight.

## Verification methodology

An agent's own claim that it succeeded is never trusted on its own. Every run's outcome is decided
by independent, deterministic verifiers appropriate to that task (for example, running the
fixture's real test suite, or checking that the repository content actually changed). A run is
only marked successful when verification independently confirms it; infrastructure failures
(environment errors, timeouts) are always reported as such and never miscategorized as a task or
agent failure.

## Metrics

Metrics are never collapsed into one composite score — every number stays traceable back to the
run, trace, and evidence that produced it. The primary metrics are task success, engineering
quality, time to correct outcome, context efficiency, and human intervention. A further set of
secondary metrics (context tokens, tool calls, agent turns, files read/changed, retries, failed
attempts, provenance completeness, verification completeness) is also computed; a handful of
secondary metrics (e.g. evidence recall/precision/authority, regression rate) are not yet computed
because no real data source for them exists yet — they are documented as not-yet-available rather
than approximated.

## Scientific-integrity commitment

This benchmark is not optimized to make ECC, or any system under test, look good. Tasks, metrics,
verification methods, and analysis are not adjusted based on which system performs better.
Negative or mixed results are reported exactly as measured. EEP and ECC are separate repositories
with no shared code — EEP never modifies ECC's source or behavior to influence a result.

## Current status

No live comparison run against a real, paid LLM has been executed. The mechanism above is fully
implemented and tested against synthetic fixtures, and has also been verified end-to-end against
the real harness/verifier/metrics/reporting pipeline via a free, deterministic "smoke reproduction"
(`npm run reproduce:smoke` — see [REPRODUCING.md](REPRODUCING.md#step-0-free-smoke-reproduction-start-here)),
which proves the pipeline mechanics reproduce identically across machines without spending any
money. Running the mechanism for real, with an LLM actually attempting each task, requires a
maintainer or reproducer's own LLM credentials — see [REPRODUCING.md](REPRODUCING.md).
