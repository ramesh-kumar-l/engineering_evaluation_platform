# Designing an Evaluation Contract: Schemas, Traceability, and Deterministic Verification

### How a 14-entity domain model keeps every number in a benchmark honest

---

The first thing I built for the Engineering Evaluation Platform (EEP) wasn't the benchmark tasks,
the LLM integration, or the dashboard. It was a schema. Before any code ran an experiment, I wanted
a precise, written-down answer to: what does it even mean for a run to "succeed," and what has to
be recorded for that claim to be checkable later by someone who wasn't in the room?

## Why start with a contract instead of a pipeline

It's tempting to start building an evaluation system by writing the part that runs an agent against
a task and prints "pass" or "fail." I've built versions of that before, and they all eventually run
into the same problem: six months later, someone (often me) asks "wait, what exactly counted as a
pass here?" and the honest answer is "whatever the code happened to check at the time," which isn't
an answer you can defend or reproduce.

The fix is to treat the evaluation's data model as a contract, specified before the pipeline that
fills it in — schema-first, not code-first. If a `Run` doesn't have a place to record which
`ContextArtifact`s it was given, that information doesn't exist later. If an `Outcome` doesn't
have a mandatory `Verification` reference, nothing stops a future version of the pipeline from
recording "success" without ever actually checking.

## The shape of the contract

EEP's domain model has roughly fourteen entities, and they form a traceability chain rather than a
flat table of results:

- An **`Evaluation`** groups everything measured for one task — one task, multiple conditions,
  multiple repetitions.
- Each **`Run`** is one execution: one task, one condition, one repetition. It carries required
  metadata — task id and version, repository commit SHA, agent name and version, context provider
  name and version, evaluator version, benchmark version, timestamp, random seed where applicable.
  The intent is that a `Run` should be interpretable on its own, purely from its recorded metadata,
  without needing any live system state to still exist.
- A **`Trace`** records what the agent actually did — not what it claims it did.
- A **`Verification`**, produced by an independent, deterministic **`Verifier`**, decides whether
  the run counts as a success. This is the one step I was least willing to compromise on: the
  agent's own summary of its work is never the verdict. A `Verifier` for a debugging task runs the
  fixture's actual test suite. A `Verifier` for a refactoring task diffs the repository to confirm
  duplicated logic actually left the file it was supposed to leave, in addition to running tests —
  because a test pass alone can't tell you whether the duplication was really removed or just
  happened to still pass by coincidence.
- An **`Outcome`** records the verified result — including a specific status for infrastructure
  failure, distinct from task failure, so a timeout or environment error is never silently
  recorded as "the agent failed the task."
- **`Metric`**s are computed values — but never bare numbers. Each one references the
  **`Evidence`** that produced it, so "context efficiency was 0.7" is always accompanied by a path
  back to the trace data that 0.7 was actually computed from.
- A **`Report`** and its **`ReportGraph`** are the final, citable output: a report plus every
  entity it references — every `Evaluation`, `Run`, `Trace`, `Outcome`, `Metric`, `Verification`,
  `Evidence`, and `ContextArtifact` — deduplicated, in one self-contained file. No number in a
  report requires trusting a database that might not exist anymore by the time someone reads it.

## Deterministic verification over LLM judges

A design choice I kept returning to, and kept rejecting, was using an LLM to judge whether another
LLM's output was correct — an "LLM-as-judge" pattern that's common in this space because it's easy
to set up and handles fuzzy, open-ended tasks gracefully. I didn't use it, for a specific reason:
an LLM judge inherits all the same non-determinism and potential bias as the system it's judging,
and it makes "did this succeed" a matter of another model's opinion rather than a checkable fact.
For a benchmark whose entire purpose is producing evidence instead of anecdote, that trade felt
backwards.

Instead, `verificationMethod` on each task names a concrete, deterministic check: `test-suite`
(run the fixture's tests, require them to pass), `diff-analysis` (confirm specific code actually
changed or was removed, independent of whether tests happen to still pass), and others suited to
different task shapes. This costs more up-front work — every task needs a real, verifiable ground
truth, not just a prompt — but it means a "success" in EEP's data always means something a human
could re-check by running the same commands themselves.

## What this buys, concretely

The payoff of building the contract first shows up later, in ways that are easy to take for
granted once they exist:

- A report generated a year from now, read with no other context, still says exactly which agent,
  which model, which context provider, and which verifier produced every number in it.
- Ablation — measuring the effect of removing one field of context — is possible at all only
  because `ContextArtifact`s are recorded as structured, addressable data, not an opaque blob
  handed to the agent and then discarded.
- Cross-user comparison (two people independently reproducing a run and diffing their results) is
  possible because a `Run`'s identity — its task id and condition, not some randomly generated
  internal id — is stable and comparable across two completely separate executions on two separate
  machines.

None of this required a database, a service, or any infrastructure beyond structured files on
disk. The rigor is in the schema and the discipline of always populating it honestly, not in the
storage technology underneath it.

## What's next

A contract this strict doesn't mean much without a statistical layer that treats the resulting
data honestly too — a single run passing or failing tells you almost nothing about whether context
actually helped, once you account for how noisy a single LLM completion can be. That's the subject
of the next post.

---

*Repository: [Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-).
Previous: [Why I Built an Evaluation Platform](01-why-i-built-eep.md).
Next: [Statistical Rigor in AI Benchmarking](03-statistical-rigor-in-ai-benchmarking.md).*
