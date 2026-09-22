# Reproducing an EEP Result

This guide covers running EEP's benchmark yourself and interpreting the output. It does not
describe a result that has already been produced — see the "Current limitations" section below
before you start.

## Prerequisites

- Node.js ≥ 20
- `npm install` in this repository
- Optionally, a separate [ECC](../README.md#relationship-to-ecc) checkout if you want the ECC/
  ablation conditions to run against a real ECC CLI (`ECC_CLI_COMMAND` env var points EEP at it;
  see `src/harness/providers/eccCliInvoker.ts`)

## Step 0: free smoke reproduction (start here)

Before spending any real money on a live comparison run, verify the pipeline itself reproduces
correctly on your machine — for free, with no LLM credentials at all:

```
npm run reproduce:smoke
```

This runs the real harness, agent, verifiers, metrics, Phase 7/8 analysis, Phase 9 report, and
Phase 10 dashboard end-to-end against the 3 real-fixture tasks and all 9 conditions, but with a
deterministic fake LLM client (`DeterministicFakeLlmClient`) instead of a paid backend — it never
attempts to solve a task (it lists files, then stops), so the result is not a performance
benchmark. It exists to prove the pipeline mechanics reproduce identically across machines, not
that any context provider helps. Output goes to `experiment-results-smoke/`, `reports-smoke/`, and
`dashboard-smoke/` (all gitignored, parallel to the real pipeline's directories) and the command
finishes by comparing your run against a reference checked into
`docs/reproduction-reference/smoke-reference.json`, printing `Reproduction PASSED.` or
`Reproduction FAILED.` and exiting non-zero on failure.

### Verifying your reproduction

The comparison distinguishes two cases:

- **The `native` condition** has no external dependency at all, so it must match the checked-in
  reference exactly on every machine — a mismatch here is a real problem (a bug, or an environment
  difference in how the fixture's own tests run), not something to shrug off.
- **The 8 ECC-based conditions** (`ecc` and its 7 per-component ablations) depend on a real `ecc`
  CLI being reachable (`ECC_CLI_COMMAND` env var, else `ecc` on `PATH` — see
  [ECC integration](../README.md#relationship-to-ecc)). The checked-in reference was generated
  *without* a local ECC checkout available, so those 8 conditions show a deterministic
  `AGENT_FAILURE` (the context provider couldn't be reached) in the reference. If you *do* have a
  working local ECC CLI, your run's ECC-based conditions will legitimately differ from the
  reference — `reproduce:smoke` detects this (the same `ECC_CLI_COMMAND`/`ecc` probe) and reports
  those differences as informational only, not a failure. Only a `native`-condition mismatch, or a
  run missing entirely, fails the command.

## LLM provider configuration

The comparison run needs an LLM backend for its solving agent. Configure it entirely through
environment variables — nothing is hardcoded and no provider is selected by default:

| Variable | Required for | Meaning |
|---|---|---|
| `EEP_LLM_PROVIDER` | always | `anthropic` (Claude) or `openai-compatible` (ChatGPT, Gemini via Google's OpenAI-compatibility endpoint, or any local OpenAI-compatible server such as Ollama/LM Studio) |
| `EEP_LLM_MODEL` | always | Model name/id, e.g. `claude-sonnet-5`, `gpt-4o`, `gemini-2.0-flash`, or a local model name |
| `EEP_LLM_API_KEY` | `anthropic` (required); `openai-compatible` against a cloud vendor (required); a local server (usually not required) | |
| `EEP_LLM_BASE_URL` | `openai-compatible` (required); optional override for `anthropic` | e.g. `https://api.openai.com/v1`, Gemini's OpenAI-compatibility endpoint, or `http://localhost:<port>/v1` for a local server |
| `EEP_LLM_MAX_TOKENS` | optional | Integer cap per completion |

See `src/experiments/llmProviderConfigFromEnv.ts` for the exact resolution logic.

**Privacy and cost, read before running against a cloud provider:** pointing `EEP_LLM_PROVIDER` at
`anthropic` or an `openai-compatible` cloud endpoint sends the benchmark fixture's source code to
that vendor over the network, and every run consumes real, billed API usage — a full run is 3
tasks × 9 conditions × 3 repetitions = 81 runs, each potentially several LLM turns. Nothing leaves
your machine if you instead point `EEP_LLM_BASE_URL` at a `localhost` OpenAI-compatible server.
Benchmark fixtures are small, self-authored, non-sensitive code, but you should still treat any
cloud run as a deliberate choice, not a default.

## Running the pipeline

Run these in order:

1. `npm run experiment:run` — executes the full comparison (3 real-fixture tasks × 9 conditions ×
   3 repetitions) and writes each run's raw result to `experiment-results/<experimentId>/<runId>.json`
   (a crash-safe write-ahead record, gitignored).
2. `npm run experiment:analyze` — reads those raw results back and prints statistical analysis
   (confidence intervals, effect sizes, failure clustering, per-component ablation contribution) to
   the console.
3. `npm run report:generate` — reads the same raw results and builds the canonical, self-contained
   `ReportGraph`, written to `reports/<experimentId>/report.json` (gitignored). This is the citable
   artifact: every metric in it resolves back to a run, trace, and piece of evidence within that
   one file.
4. `npm run dashboard:generate` — reads `report.json` and renders it into a single offline-readable
   HTML page at `dashboard/<experimentId>/index.html` (gitignored).

## Publishing a result

There is no separate "publish" command. The file `dashboard/<experimentId>/index.html` produced by
step 4 above is already a complete, self-contained, offline-readable page with no external
resource references — copy it anywhere (a gist, a GitHub Pages branch, attached to a release) to
share it. `report.json` is the underlying data if a reader wants to verify or re-derive a number
themselves.

## Cross-user comparison

Once you and another EEP user each have your own raw results
(`experiment-results/<experimentId>/` from `npm run experiment:run`, or
`experiment-results-smoke/<experimentId>/` from `npm run reproduce:smoke`), you can diff them
entirely offline — nothing is uploaded to EEP or any third party. Exchange the
`<resultsDir>/<experimentId>/` directory with the other user however you like (email, a shared
drive, a git branch), then run:

```
npm run report:compare -- --a-dir experiment-results --a-experiment <your-experiment-id> \
                          --b-dir <path-to-their-copy> --b-experiment <their-experiment-id> \
                          --out comparison.md
```

Both `--a-experiment`/`--b-experiment` are optional and default to the most recently written
experiment under the given directory. This is a **peer comparison**, not a check against ground
truth: it reports matched entries, entries that differ (with the exact field-level detail), and
entries present on only one side — with no pass/fail verdict, unlike `reproduce:smoke`'s comparison
against the fixed Phase 12 reference. `--out` writes a self-contained Markdown summary you can drop
into `docs/` and publish (see below); omit it to just print a summary to the console.

## Publishing to GitHub Pages

`docs/` (this guide, `BENCHMARK.md`, `sample-dashboard.html`, and `index.html`) can be published as
a static GitHub Pages site via `.github/workflows/pages.yml`. This is a one-time, manual opt-in per
repository, not something that happens automatically:

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. From the **Actions** tab, select **Publish docs to GitHub Pages** and run it manually
   (`workflow_dispatch`) — it stays manual-trigger-only by default so an unconfigured repository
   never gets a loud, repeated failed run on every push. If you want it to redeploy automatically
   whenever `docs/` changes, add a `push` trigger scoped to `paths: ['docs/**']` once step 1 above
   is done.

Nothing published this way is a real benchmark finding — it is exactly the same labeled-synthetic
demo and documentation already in this repository (plus, optionally, a Markdown comparison summary
you generate yourself and choose to copy into `docs/`).

## Required run metadata

Every run records: task id and task version, repository SHA, agent name and version, model name
and version (see limitation below), context provider name and version, EEP version, evaluator
version, benchmark version, experiment configuration, execution environment, tool configuration,
timestamp, and random seed where applicable. This is what makes a result interpretable purely from
its own recorded metadata, independent of any live system state — see
`src/domain/run/run.schema.ts`'s `runMetadataSchema`.

## Independent versioning axes

EEP itself, the benchmark, the evaluator, metrics, schemas, experiments, and reports are each
versioned independently. Changing one (e.g. bumping the benchmark version after editing a fixture)
does not silently invalidate results recorded under the others — but it does mean a result should
always be read together with the versions it was recorded against, not compared blindly across a
version change.

## Immutability policy

A finalized run is never silently modified after the fact. If a result needs correcting, the
original is retained, correction metadata is recorded, and the correction is associated with a new
evaluator version — so the full lineage from any published number back to its original run stays
traceable.

## Current limitations

1. **Only 3 of the 30 benchmark tasks have real, runnable fixtures** (`debugging-01`,
   `feature-01`, `refactoring-01`). The other 27 have task definitions but no fixture source code
   yet, so a comparison run today only exercises those 3.
2. **No live comparison run against a real, paid LLM has been executed by this project's
   maintainer as of this writing.** The free `npm run reproduce:smoke` path (Step 0 above) verifies
   the pipeline mechanics — real harness, verifiers, metrics, and reporting, genuinely executed —
   but with a deterministic fake agent that never attempts to solve a task. Combined with the
   explicitly-labeled synthetic demo at `docs/sample-dashboard.html`, every result artifact
   currently in this repository is a test fixture, a mechanism-verification run, or a labeled
   demo — none is a real benchmark finding. `.github/workflows/ci.yml` now runs this smoke
   reproduction on every push/PR, so it is continuously re-verified on independent machines — this
   strengthens confidence in the pipeline's mechanics, not in any performance claim.
3. **`Run.metadata.modelName`/`modelVersion` are not yet populated** for LLM-backed runs — this is
   a known, currently open gap (tracked in this project's internal risk register), not something
   this guide's publication has resolved. As a partial stopgap, the agent name recorded on a run
   embeds the provider and model (e.g. `llm-solving-agent:anthropic:claude-sonnet-5`), so runs are
   still distinguishable by backend even though the dedicated metadata fields are empty.
4. **Reproducing a real run requires your own LLM provider credentials and incurs real API cost**
   (see the privacy/cost note above) unless you use a local model.
5. **`npm run report:compare` (see "Cross-user comparison" above) has not yet been exercised
   between two genuinely independent real users** — only against fixtures/synthetic data in this
   project's own test suite so far.
6. **The GitHub Pages workflow (`pages.yml`) is untested against a real deployment** — it has been
   reviewed for structural correctness but not yet run, since that requires the repository owner to
   first enable Pages in Settings (see "Publishing to GitHub Pages" above), a deliberately manual,
   unautomated step.
