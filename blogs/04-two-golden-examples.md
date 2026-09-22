# Two Golden Examples: Reading a Benchmark Task Like an Engineer

### What makes a task actually worth putting in a benchmark

---

It's easy to write a benchmark task that looks reasonable and tests almost nothing. "Fix the bug
in this file" where the bug is one obvious typo doesn't discriminate between a careful attempt and
a careless one. "Refactor this code" with no concrete acceptance criteria can't be verified at all
— any diff can claim to be "cleaner." Designing a task that's genuinely useful for measuring
whether curated context helps means designing a task with a real trap in it, and a verification
method precise enough to catch whoever falls into it. Two of the Engineering Evaluation Platform
(EEP)'s three currently real-fixture benchmark tasks are good illustrations of what that looks
like in practice. Full technical write-ups of both live in the repository under
[`docs/golden-examples/`](../docs/golden-examples/); this post is the narrative version.

**Neither of these has been attempted by a real LLM yet inside EEP.** What follows is analysis of
the task design — what a context-free attempt is *likely* to get wrong, and what curated context
could plausibly supply — not a reported outcome.

## The simple one: an off-by-one in a pagination function

[`debugging-01`](../docs/golden-examples/debugging-01.md) hands over one function:

```js
function paginate(items, pageSize, pageNumber) {
  const start = (pageNumber - 1) * pageSize;
  const end = start + pageSize - 1; // BUG
  return items.slice(start, end);
}
```

`slice`'s second argument is exclusive, so computing it as `start + pageSize - 1` makes every page
one item short, and drops the final item entirely when the item count divides evenly by the page
size. Anyone who reads this function will spot the bug in seconds — that's deliberate. This task
isn't testing whether an agent can *find* an off-by-one error. It's testing whether the *fix* it
produces actually satisfies every constraint the task specifies, including ones that are easy to
miss: the fix must not change the function's public signature, must correctly clamp the final page
so it doesn't run past the array's end, and must be checked against the exact edge case (an exact
multiple of the page size) where a superficially-plausible fix is most likely to still be wrong.

A response that changes `end` to `start + pageSize + 1` "to be extra safe" looks like a fix,
compiles, and might even pass a quick manual check — while quietly pulling an extra item from the
next page on every request. That's exactly the kind of subtly-wrong fix a benchmark needs to be
able to catch, and the reason `debugging-01`'s verification requires running specific added
edge-case tests, not just eyeballing that the obvious bug is "gone."

## The hard one: three files that look identical and aren't

[`refactoring-01`](../docs/golden-examples/refactoring-01.md) is the opposite kind of trap. Three
separate modules each implement email, phone, and postal-code validation — and at a glance, they
look like the same code copy-pasted three times, which is exactly the kind of duplication a
refactoring task would ask you to consolidate. Look closer and each one has a small, deliberate
inconsistency:

- One module doesn't trim whitespace before validating an email address; the other two do.
- One module accepts a ZIP+4 postal code (`12345-6789`); the other two only accept a plain 5-digit
  code.
- One module strips *all* non-digit characters before checking a phone number's length; the others
  strip only common separator characters like parentheses and dashes.

Each module's own test suite locks in *that module's* current, slightly different behavior. This
is the trap: naively picking one implementation and deleting the other two breaks whichever
module's tests depended on the behavior that got deleted. Averaging the three into a maximally
permissive shared implementation avoids that specific failure but quietly makes every module's
validation looser than its own test suite actually requires — a change that looks harmless in a
diff review but isn't what "extract the shared logic, preserving existing behavior" actually asked
for.

The task's own ground truth is explicit about the resolution: reconcile the inconsistencies to
match whatever each module's *existing tests* actually assert, not the task author's preference and
not a majority vote across the three files. That's a task that can't be solved correctly by reading
any one file in isolation — it requires holding all three files' worth of subtly conflicting
behavior in view at once, which is precisely the kind of thing that curated, ranked, cross-file
context is supposed to help with.

## Why these two, specifically

I picked one nearly trivial task and one genuinely tricky one on purpose, because a benchmark that
only contains hard tasks can't tell you whether a context system helps with easy work too (or gets
in the way), and a benchmark that only contains easy tasks can't tell you anything about the cases
that actually matter in real engineering work. `debugging-01`'s value is in how cleanly its
verification can catch a plausible-but-wrong fix. `refactoring-01`'s value is in how much it
depends on synthesizing information spread across multiple files — exactly the kind of task where
"does the agent have the right context, ranked and reconciled correctly" is a meaningfully
different question from "does the agent have the raw files at all."

## The honest bottom line

Both of these tasks are real: real fixture code, real test suites, real deterministic verification
you can run yourself right now (`cd benchmark/fixtures/debugging-01 && npm test`, and the same for
`refactoring-01`). What isn't real yet is any attempt at solving them — by any agent, under any
condition. That's the next milestone for this project, and when it happens, it'll be reported with
the same confidence-interval-and-effect-size treatment described in the previous post in this
series, not a cherry-picked screenshot.

---

*Repository: [Engineering Evaluation Platform (EEP)](https://github.com/ramesh-kumar-l/Engineering-Evaluation-Platform-EEP-).
Full write-ups: [`docs/golden-examples/debugging-01.md`](../docs/golden-examples/debugging-01.md),
[`docs/golden-examples/refactoring-01.md`](../docs/golden-examples/refactoring-01.md).
Previous: [Statistical Rigor in AI Benchmarking](03-statistical-rigor-in-ai-benchmarking.md).
Next: [Building for Reproducibility](05-building-for-reproducibility.md).*
