# Building for Reproducibility: CI, Deterministic Fakes, and Honest Engineering

### How to prove a benchmark pipeline works without spending money or cherry-picking a run

---

A benchmark is only as trustworthy as its reproducibility. If I claim the Engineering Evaluation
Platform (EEP)'s pipeline — harness, agent, verifiers, metrics, statistical analysis, report
generation, dashboard rendering — actually works end-to-end, that claim should be checkable by
someone who isn't me, on a machine that isn't mine, without needing my API keys or my trust. This
post is about the engineering that makes that true, and about a couple of decisions I made
specifically *not* to automate, because automating them would have been dishonest.

## The problem: proving a pipeline works without a live LLM

EEP's real comparison run needs an LLM actually attempting each benchmark task — that costs real
money and real time, and it's not something that should ever happen silently, automatically, or on
every commit. But that creates a gap: how do you continuously verify that the *pipeline itself* —
the part that isn't the LLM — hasn't regressed, without a live LLM in the loop?

The answer I built is a deterministic fake LLM client. It implements the same interface as a real
provider, but instead of calling out to a model, it returns fixed, deterministic responses — it
lists the files in a task's fixture, then stops. It never attempts to actually solve anything. What
it does do is flow through the *entire real pipeline*: the real harness, the real agent
orchestration, the real deterministic verifiers, the real metrics engine, the real statistical
analysis code, the real report builder, the real dashboard renderer — all genuinely executed, none
of it mocked out at the pipeline level. The only thing that's fake is the one component that costs
money and isn't deterministic.

Running this (`npm run reproduce:smoke`, a name chosen to be honest about what it is — a smoke
test, not a benchmark) produces a real, freshly-generated run, which then gets compared against a
reference file checked into the repository. If every entry matches — keyed by task and condition,
not by an internally generated random id, which would make the comparison meaningless — you have
strong evidence the pipeline mechanics reproduce identically across machines and over time. That's
a real, falsifiable claim, and it costs nothing to check.

## Wiring it into CI

Once that smoke pipeline existed, the natural next step was making it run automatically, on every
push and pull request, on a matrix of Node versions. That's a small addition mechanically — a
GitHub Actions workflow that builds, lints, runs the test suite, and then runs the smoke
reproduction directly — but it changes what the check *means*. Every CI run becomes an independent
machine, with no shared state with mine, re-proving the pipeline reproduces. It's also safe to run
on pull requests from forks with no special handling, because the smoke path never reads API keys
and never makes a network call — there's nothing sensitive for a malicious PR to exfiltrate by
triggering it.

## The decision to *not* automate two things

Two things came up during this work that I deliberately left manual, and I think the reasoning
matters as much as the CI wiring itself.

**A code-formatting check.** Adding a `prettier --check` gate to CI seemed like an obvious,
low-risk addition — until I actually ran it against the existing codebase and found roughly a
hundred files with pre-existing formatting drift, because the project's `format` script had always
been write-only and nothing had ever enforced it. Adding the gate that same day would have failed
CI immediately, on a purely cosmetic diff, bundled invisibly into an unrelated change. I deferred
it, documented exactly why, and left it as its own explicit, disclosed future commit. The easy
thing — add the gate, let it fail loudly and quietly demand a separate fix later — would have
technically been "more automated" and a worse decision.

**Actually enabling GitHub Pages.** The workflow that publishes documentation to a public URL is
built and reviewed, but I didn't flip the switch that makes it live, and I didn't make it trigger
automatically on push. Publishing something to a public-facing URL is a visible, hard-to-fully-
reverse action, and it belongs to a deliberate decision, not a side effect of an unrelated commit.
The workflow is `workflow_dispatch`-only — manually triggered — specifically so that adding it to
the repository doesn't itself change anything a visitor could see.

## What "honest engineering" means in practice, here

None of this is exotic. It's the ordinary discipline of not letting automation quietly do more than
you actually intended: don't gate CI on a check you haven't verified passes today; don't wire a
public-facing action to run without an explicit human decision each time it matters; don't call a
mechanics-only smoke test a "benchmark result," even in a commit message, even when it would read
better that way. Individually these are small choices. Collectively, they're the difference between
a project whose claims you can check and one you have to take on faith — and a project built to
answer "does this actually help" with evidence isn't allowed to ask for that kind of faith about
its own infrastructure either.

## Closing

This is the last post in this series, and it ends the same way the first one started: the honest
status of this project today is that a real comparison run hasn't happened yet. What exists is a
benchmark I'm confident is correctly designed, a pipeline I have concrete, reproducible evidence
works end-to-end, and a discipline for reporting results — whatever they turn out to be — without
adjusting the scoreboard afterward. That's the whole point of building it this way.

---

*Repository: [Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-).
Previous: [Two Golden Examples](04-two-golden-examples.md).
Series index: [`blogs/README.md`](README.md).*
