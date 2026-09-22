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
2. **No live comparison run has been executed by this project's maintainer as of this writing.**
   Every artifact currently in this repository is either an automated-test fixture or the
   explicitly-labeled synthetic demo at `docs/sample-dashboard.html` — not a real benchmark result.
3. **`Run.metadata.modelName`/`modelVersion` are not yet populated** for LLM-backed runs — this is
   a known, currently open gap (tracked in this project's internal risk register), not something
   this guide's publication has resolved. As a partial stopgap, the agent name recorded on a run
   embeds the provider and model (e.g. `llm-solving-agent:anthropic:claude-sonnet-5`), so runs are
   still distinguishable by backend even though the dedicated metadata fields are empty.
4. **Reproducing a real run requires your own LLM provider credentials and incurs real API cost**
   (see the privacy/cost note above) unless you use a local model.
