# Golden Example: `debugging-01` — Off-by-one error in pagination utility

> **Status up front, so this is never misread:** this document walks through a real, runnable
> benchmark task and its real, deterministic verification. It does **not** describe a completed
> comparison run — no live LLM has ever attempted this task inside EEP yet. Anywhere this document
> talks about what a "native" or "ECC-assisted" attempt *would likely* do, that is analysis of the
> task design, not a reported result. See [`docs/BENCHMARK.md`](../BENCHMARK.md) and
> [`docs/REPRODUCING.md`](../REPRODUCING.md) for the project-wide framing this inherits.

## Why this task

`debugging-01` is the simplest of EEP's three real-fixture tasks (complexity `L1`), and that
simplicity is the point. A good "golden example" for explaining a benchmark's *verification* rigor
should have almost no surface area for debate about whether the fix is correct — so the interesting
question isn't "is the diagnosis right," it's "how does the agent get there, and how confidently
can EEP judge it."

## The task

Full definition: [`benchmark/tasks/debugging-01.json`](../../benchmark/tasks/debugging-01.json).
Fixture source: [`benchmark/fixtures/debugging-01/`](../../benchmark/fixtures/debugging-01/).

The fixture ships one function:

```js
function paginate(items, pageSize, pageNumber) {
  const start = (pageNumber - 1) * pageSize;
  const end = start + pageSize - 1; // BUG: inclusive upper bound drops/omits boundary items
  return items.slice(start, end);
}
```

`Array.prototype.slice(start, end)` treats `end` as **exclusive**. Computing `end` as
`start + pageSize - 1` makes it one short — so `slice` reads `[start, end)`, which is really
`[start, start + pageSize - 1)`, one element short of a full page. Two concrete failure shapes:

- A full page of `pageSize` items comes back with only `pageSize - 1` items.
- When `totalItems` is an exact multiple of `pageSize`, the very last item is dropped entirely,
  since no later page ever recovers it.

The task's four acceptance criteria (see the JSON) are written to make all of this unambiguous:
every full page must have exactly `pageSize` items, the final partial page must keep everything
remaining, no phantom empty page on an exact multiple, and — importantly — **the function's public
signature must not change**. That last constraint rules out a lazy fix like adding a new parameter
instead of correcting the boundary math.

## Why a plain ("native") attempt can still go wrong

This bug is genuinely easy to *find* — reading the one-line function body is enough. Where a
context-free attempt is more likely to slip is at the **fix**, not the diagnosis:

- Changing `end` to `start + pageSize` is correct. Changing it to `start + pageSize + 1`
  "over-corrects" and silently pulls one extra item from the next page — a fix that looks plausible,
  passes a casual manual check, but fails the exact-multiple acceptance criterion.
- A fix that clamps `end` to `items.length` is necessary for the last page to behave correctly, but
  is easy to omit if the agent only tests against inputs where `totalItems` happens to divide evenly
  — which is exactly why the task's `groundTruth` calls out clamping explicitly, and why
  `verificationMethod` requires the *added* edge-case tests, not just the pre-existing suite.
- Without being told the acceptance criteria carry a hard constraint on the function signature, a
  context-free attempt has no signal that a broader "refactor the pagination API" response would be
  penalized even if it happens to compute correct results — EEP's verification would still fail it,
  because `paginate()`'s existing callers are part of what's being checked.

None of this requires deep codebase context to solve correctly — this is deliberately the easiest
of the three real tasks. But it's a clean illustration of what curated context is *for*: not
finding a bug a human couldn't find on their own, but reliably supplying the constraints
(signature stability, the exact edge cases that matter, which tests are authoritative) that turn
"a plausible-looking fix" into "a fix that actually satisfies every acceptance criterion."

## What ECC-style context would add

An `EccContextProvider` implementing EEP's [`ContextProvider`](../../src/domain/providers/context-provider.ts)
interface would supply, alongside the task text: the fixture's existing test file
(`pagination.test.js`) so the agent knows exactly which boundary cases are already covered and
which the acceptance criteria say must be *added*; any prior history of similar off-by-one fixes in
the project (the `history` field EEP's ablation deliberately neutralizes in one condition, to
measure whether it matters); and explicit provenance tying "clamp to `items.length`" back to the
task's own `groundTruth`, rather than leaving it to be inferred. EEP's 9-condition design
(`native` vs. `ecc` vs. 7 single-field ablations of `ecc` — see
[`docs/BENCHMARK.md#experiment-design`](../BENCHMARK.md#experiment-design)) exists precisely so a
claim like "context helped here" is measured per field, not asserted.

## How EEP verifies it

`verificationMethod` is `test-suite`: run the fixture's existing tests plus the edge-case tests the
task requires adding (exact-multiple and single-item-remainder inputs), and require every test to
pass. This is a deterministic, independent `Verifier`
(`src/evaluation/verifiers/verifier.types.ts` defines the contract every verifier implements) — an
agent's own claim of success is never taken at face value; see
[`docs/BENCHMARK.md#verification-methodology`](../BENCHMARK.md#verification-methodology).

## What's real here today

- **Real:** the task definition, the fixture source and its existing test suite, and the
  verification logic that would judge any attempt at this task. You can run
  `cd benchmark/fixtures/debugging-01 && npm test` yourself right now.
- **Real, but mechanics-only:** `npm run reproduce:smoke` runs this exact task through the real
  harness, verifier, and metrics pipeline — but with a deterministic fake LLM client that never
  attempts to solve it. It proves the pipeline reproduces, not that any approach solves the bug.
- **Not yet real:** an actual LLM attempting this task, under any condition, and the resulting
  pass/fail/metric data. That requires an approved live comparison run — see
  [`docs/REPRODUCING.md`](../REPRODUCING.md).
