# Why I Built an Evaluation Platform for AI Coding Tools

### Or: why "does this context tool actually help?" is a harder question than it sounds

---

Every few weeks another tool promises to make AI coding agents smarter by giving them better
context — better retrieval, better memory, better project understanding. The pitch is usually
backed by a demo, a handful of glowing anecdotes, and sometimes a benchmark number the tool's own
authors computed, on a benchmark the tool's own authors chose. I don't say that cynically — I've
built tools like this myself. But somewhere in that process I ran into a question I couldn't
honestly answer with the tools I had: **if I hand an LLM coding agent a compiled context package
instead of nothing, does it actually solve more engineering tasks correctly — and by how much, and
under what conditions, and is the effect real or just noise from LLM non-determinism?**

That question turned out to need its own piece of infrastructure to answer honestly. That's what
the Engineering Evaluation Platform (EEP) is.

## The trap of "vibes-based" evaluation

The easy way to evaluate a context tool is to try it on a few tasks, notice it seems to help, and
call it a day. This fails in a few specific, predictable ways:

- **Small samples look like signal when they're noise.** LLMs are not deterministic. If you run a
  task once with context and once without, and the "with context" run happens to succeed, you have
  one data point, not a result. You need repeated runs and an honest statistical treatment —
  confidence intervals, not a single before/after screenshot.
- **You can't isolate what actually helped.** A context-compilation system doesn't hand the agent
  one thing — it hands over ranked evidence, historical context, provenance metadata, risk flags,
  a token budget, verification hints. If the agent does better, which of those mattered? Without
  deliberately testing each field's removal, "context helped" is an unfalsifiable claim.
- **Self-reported success isn't success.** An agent that says "I fixed the bug" and an agent that
  actually fixed the bug are different agents. Trusting the model's own summary of its own work is
  the single easiest way to produce a benchmark that flatters whatever system generated the
  summary.
- **Public benchmarks leak into training data.** If your benchmark tasks are well-known open-source
  repositories, there's no way to be confident a model hasn't already seen the fix during training
  — which would make "solving" the task trivial and meaningless as a measure of the context tool's
  contribution.

None of these are exotic failure modes. They're the default outcome of skipping the boring
infrastructure work and going straight to "let's just try it and see."

## What I decided EEP had to be

I set a few hard constraints before writing any code, and kept them even when they made the system
slower to build:

**A benchmark self-hosted inside the evaluation repository, not scraped from public GitHub repos.**
Every task's fixture — source code, tests, a pinned commit — lives inside the project itself. That
rules out training-data contamination and keeps every task fully offline and reproducible on any
machine, forever, regardless of what happens to some third-party repository.

**Verification that never trusts the agent.** Every run's outcome is decided by an independent,
deterministic `Verifier` — running the fixture's real test suite, or checking that specific
duplicated logic was actually removed from a diff. If the agent claims success and the verifier
disagrees, the verifier wins. Infrastructure failures (timeouts, environment errors) are always
reported as infrastructure failures, never miscategorized as a task failure just because the run
didn't finish.

**Ablation, not a single before/after comparison.** Instead of "context on" vs. "context off," EEP
runs nine conditions per task: no context, full context from the system under test, and seven
variants with exactly one field of that context neutralized — history, memory-sourced evidence,
relevance ranking, provenance, risk flags, budgeting, verification data. That turns "does context
help" into "which specific piece of context is doing the work," which is a far more useful and far
more falsifiable question.

**Full traceability, no black-box composite score.** Every metric EEP computes resolves back to the
exact run, trace, and evidence that produced it. There's no single "quality score" that hides how
it was computed — if a number looks surprising, you can always walk backward to the raw evidence.

**A scientific-integrity commitment that costs the project under test nothing to violate — and
costs it everything if it's ever caught doing so.** EEP and the context-compilation system it
evaluates (a separate project, the Engineering Context Compiler, ECC) share no code. EEP never
modifies ECC's source, never adjusts a task or a metric based on which system performs better, and
reports negative or mixed results exactly as measured. This isn't a nice-to-have; a benchmark that
can be quietly tuned to favor its own subject isn't a benchmark, it's a demo with extra steps.

## What this project is, concretely

Under the hood, EEP is: a 30-task benchmark of realistic engineering work (debugging, feature
work, refactoring, and more, with a complexity rating from trivial to architectural); an isolated
experiment harness that runs the same LLM-backed agent under all nine conditions per task; a suite
of deterministic verifiers; a metrics engine; a statistics layer built for small, noisy samples
(confidence intervals and effect sizes, not just point estimates); and a canonical, fully
traceable report format with a static, offline dashboard on top. It's local-first by design — no
database, no server, no cloud infrastructure, until a concrete requirement demonstrates the need
for one. Every file it produces is meant to be something you can hand someone, or drop in a gist,
and have it mean something entirely on its own.

## Where it stands today, honestly

Here's the part a lot of project write-ups skip: **I have not yet run a real comparison against a
paid LLM.** Everything currently in the repository is a test fixture, a free deterministic
mechanics-only pipeline check (a "smoke reproduction" that proves the pipeline itself reproduces
identically across machines, using a fake LLM client that never actually attempts a task), or a
demo dashboard built from explicitly-labeled synthetic data. I could have filled this post with a
fabricated chart. I didn't, because the entire point of building this system was to stop accepting
claims I couldn't verify — including my own. The next post in this series goes into how the
evaluation contract itself is built to make that kind of honesty structurally hard to avoid.

---

*Repository: [Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-).
Next: [Designing an Evaluation Contract](02-designing-an-evaluation-contract.md).*
