# Blog Series — Building the Engineering Evaluation Platform

Five posts on designing and building EEP, a reproducible evaluation harness for AI-assisted
software engineering. Each is a standalone Markdown file, written for direct copy-paste into
Medium (or any platform) — a title/subtitle header, then the post body.

**Every post in this series honors the same constraint the project's own docs do: no live LLM
comparison run has ever been executed against this benchmark.** Nothing here reports a performance
result. Where a post needs illustrative data to explain how something works, it says explicitly
that the data is synthetic or that the run is a mechanics-only smoke test — never a benchmark
finding. See [`docs/BENCHMARK.md`](../docs/BENCHMARK.md) for the project's own framing of this.

## Reading order

1. [**Why I Built an Evaluation Platform for AI Coding Tools**](01-why-i-built-eep.md) — the
   problem this project exists to solve, and why "does context help?" is harder to answer honestly
   than it looks.
2. [**Designing an Evaluation Contract: Schemas, Traceability, and Deterministic Verification**](02-designing-an-evaluation-contract.md) —
   the domain model and why an agent's own claim of success is never trusted.
3. [**Statistical Rigor in AI Benchmarking: Confidence Intervals, Effect Sizes, and Ablation**](03-statistical-rigor-in-ai-benchmarking.md) —
   why point estimates alone mislead, and how per-component ablation isolates what's actually
   contributing.
4. [**Two Golden Examples: Reading a Benchmark Task Like an Engineer**](04-two-golden-examples.md) —
   a narrative walkthrough of two real benchmark tasks and what makes each one a good test.
5. [**Building for Reproducibility: CI, Deterministic Fakes, and Honest Engineering**](05-building-for-reproducibility.md) —
   how the project proves its own pipeline works without spending money or cherry-picking results.

## Source repository

[Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-) —
Apache 2.0. See the root [`README.md`](../README.md) for current status, and
[`NewbieQuickStarterGuide.md`](../NewbieQuickStarterGuide.md) if you want to run it yourself.
