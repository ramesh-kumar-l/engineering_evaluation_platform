# Statistical Rigor in AI Benchmarking: Confidence Intervals, Effect Sizes, and Ablation

### Why "it passed 2 out of 3 times" is not a result

---

LLM completions are not deterministic. Run the same agent against the same task twice, and you can
get two different outcomes — different code, different reasoning path, sometimes a different
pass/fail verdict. That single fact quietly breaks the most common way people evaluate AI coding
tools: run the task once, see if it worked, and report that as "the" result. This post is about
the statistical layer I built into the Engineering Evaluation Platform (EEP) specifically to stop
doing that.

## The problem with a single run

If an agent solves a task once with a context-compilation system and doesn't solve it once without,
that is exactly one success and one failure — not evidence that the context system caused the
difference. It could just as easily have gone the other way on a different sampling temperature, a
different random seed, or a different day. Treating a single run as "the" outcome is how
benchmarks end up reporting effects that vanish the moment someone else tries to reproduce them.

EEP's answer is unglamorous but disciplined: every task runs multiple repetitions (three, by
default) under every condition, and the statistics layer is built to treat that repeated,
noisy data honestly rather than collapsing it into one number too early.

## Confidence intervals, not point estimates

A success rate of "2 out of 3" and a success rate of "200 out of 300" can both round to "67%," but
they represent wildly different amounts of certainty. EEP computes confidence intervals (using the
Wilson score interval, which behaves better than a naive normal approximation at small sample
sizes and extreme proportions — exactly the regime a 3-repetition benchmark run lives in) around
every success-rate metric, rather than reporting a bare percentage. A reported "67%, 95% CI roughly
[21%, 94%]" is honest about how little three repetitions actually tells you; a bare "67%" is not.

## Effect size, not just "did it improve"

Even with confidence intervals, "condition A succeeded more often than condition B" doesn't say
how *much* more, or whether the difference is large enough to matter versus large enough to be
sampling noise. EEP's analysis layer computes effect sizes across categories and complexity levels
— not to produce a single "ECC is X% better" headline number, but so a reader can see where an
effect is concentrated (does context help more on higher-complexity tasks? on refactoring versus
debugging?) instead of only a single aggregate that could be hiding the real pattern underneath it.

## Failure clustering: not all failures are the same failure

A raw failure count treats every failed run as interchangeable. EEP instead clusters failures by
`verificationMethod`, condition, category, and complexity, using the same interval machinery built
for success rates. This matters because a context-compilation system that reduces failures
overall but concentrates its remaining failures in one specific task category is telling you
something different than one whose failures are spread evenly — and a single aggregate number
can't distinguish the two.

## Ablation: isolating which piece of context actually matters

This is the part of the design I'm most attached to. A context-compilation system doesn't hand an
agent one undifferentiated blob — it hands over several distinct kinds of information at once:
historical context, memory-sourced evidence, a relevance ranking, provenance metadata, conflict/risk
flags, a token budget with an excluded-items list, and verification hints. If an agent does better
with the full package than with nothing, which of those seven things actually did the work? Without
answering that, "context helps" is a claim you can't act on — you don't know what to build more of.

EEP measures this by running seven additional conditions, each identical to the full-context
condition except that exactly one field has been deterministically stripped or neutralized after
the context provider returns its (real, validated) output — holding every other field constant.
The resulting difference in outcome, attributable to that one field's absence, is the field's
estimated marginal contribution.

It's worth being explicit about the limits of this technique, because overstating it would be
exactly the kind of dishonesty this whole project exists to avoid: this measures the marginal
contribution of a *field of content*, not necessarily of an internal architectural *component* of
the system producing that content. If one component's effect leaks into a field this ablation
scheme doesn't touch, the isolation is imperfect — a documented, known limitation, not a claim the
methodology can fully back.

## Why this is more work, and why it's worth it

None of this — Wilson intervals, effect sizes split by category and complexity, seven separate
ablation conditions per task instead of one before/after comparison — is necessary if you're
willing to report "it seemed to work better" and move on. It's necessary if the goal is a result
someone else could look at, disagree with on specific, falsifiable grounds, and reproduce
themselves. That's a much higher bar, and it's the only bar that makes a benchmark worth trusting
more than an anecdote.

## Where this stands today

This entire statistics layer has been built and tested against synthetic fixtures, and exercised
end-to-end through the project's free, deterministic pipeline check — but, consistent with every
other post in this series, it has not yet been run against a real, live LLM comparison. The
methodology is ready; the finding isn't written yet, and I'd rather say that plainly than imply
otherwise.

---

*Repository: [Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-).
Previous: [Designing an Evaluation Contract](02-designing-an-evaluation-contract.md).
Next: [Two Golden Examples](04-two-golden-examples.md).*
