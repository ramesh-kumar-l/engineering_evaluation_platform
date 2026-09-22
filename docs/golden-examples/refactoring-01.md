# Golden Example: `refactoring-01` — Extract duplicated validation logic into shared module

> **Status up front, so this is never misread:** this document walks through a real, runnable
> benchmark task and its real, deterministic verification. It does **not** describe a completed
> comparison run — no live LLM has ever attempted this task inside EEP yet. Anywhere this document
> talks about what a "native" or "ECC-assisted" attempt *would likely* do, that is analysis of the
> task design, not a reported result. See [`docs/BENCHMARK.md`](../BENCHMARK.md) and
> [`docs/REPRODUCING.md`](../REPRODUCING.md) for the project-wide framing this inherits.

## Why this task

`refactoring-01` is the most architecturally interesting of EEP's three real-fixture tasks
(complexity `L2`, `diff-analysis` verification rather than a plain test run). Where `debugging-01`
is a single-file, single-line fix chosen for verification clarity, this task is chosen for the
opposite reason: it can't be solved correctly by looking at any one file in isolation, and its
fixture contains a trap that a shallow, unify-and-move refactor will walk straight into.

## The task

Full definition: [`benchmark/tasks/refactoring-01.json`](../../benchmark/tasks/refactoring-01.json).
Fixture source: [`benchmark/fixtures/refactoring-01/`](../../benchmark/fixtures/refactoring-01/).

Three independent modules — `userModule.js`, `orderModule.js`, `contactModule.js` — each
re-implement `isValidEmail`, `isValidPhone`, and `isValidPostalCode`. On the surface these look like
one duplicated block that should obviously collapse into a shared module. They are not identical:

```js
// userModule.js
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}
function isValidPostalCode(value) {
  return /^\d{5}$/.test(String(value).trim());
}

// orderModule.js — does NOT trim before the email regex; accepts ZIP+4 postal codes
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function isValidPostalCode(value) {
  return /^\d{5}(-\d{4})?$/.test(String(value).trim());
}

// contactModule.js — strips ALL non-digits from phone, not just separators like ()-
function isValidPhone(value) {
  return /^\d{10}$/.test(String(value).replace(/\D/g, ''));
}
```

Each module's own test file locks in *that module's* current behavior — including the
inconsistency. `orderModule.test.js` presumably asserts a ZIP+4 postal code is valid;
`contactModule.test.js` presumably asserts a phone number containing letters still extracts to a
valid 10-digit run. That's the trap: **a naive refactor that just picks one implementation and
deletes the other two will break the tests of whichever module didn't use the implementation it
picked** — and a refactor that keeps three subtly different functions "shared" in name only hasn't
actually removed the duplication the task asks for.

The task's `groundTruth` names the actual resolution EEP will accept: **one** shared module,
`isValidEmail`/`isValidPhone`/`isValidPostalCode`, "with any previously-inconsistent behavior
reconciled to match whichever behavior the existing tests actually assert." In other words: the
existing tests are the source of truth for what "correct" means here, not the task author's
regexes and not majority vote across the three modules. Where the three implementations agree
(all three trim before validating postal codes, roughly), there's no conflict. Where they
genuinely disagree (does `isValidEmail` require pre-trimmed input?), the refactor has to look at
what each module's *tests* actually assert and reconcile from there — sometimes that means one
module's current behavior wins, sometimes it means the tests themselves reveal the "inconsistency"
doesn't actually matter for any asserted input.

## Why a plain ("native") attempt can plausibly get this wrong

- **Picking one file as "the" canonical implementation without diffing all three.** If an attempt
  reads only `userModule.js`, copies its three functions into a new shared module, and repoints all
  three call sites at it, `orderModule.test.js`'s ZIP+4 assertion and `contactModule.test.js`'s
  strip-all-non-digits assertion both break — a regression the task explicitly forbids ("all
  pre-existing tests... continue to pass unchanged").
- **Averaging or merging the three regexes "to be safe."** A shared implementation that accepts
  everything all three modules ever accepted (trimmed or not, ZIP+4 or not, letters-stripped or
  not) satisfies every existing test, but silently makes every module's validation looser than that
  module's own test suite is actually pinning down — the kind of change that looks harmless in a
  diff but isn't what the task, read carefully, asked for.
- **Missing the requirement for the shared module's own direct tests.** All three
  acceptance criteria about the call sites can be satisfied while still failing the fourth
  ("the shared module has its own direct unit tests independent of the three call sites") — a
  constraint that's easy to lose when working file-by-file instead of holding the whole task in
  view.

This is exactly the shape of task where lacking context isn't about missing a hard-to-find fact —
it's about not reliably holding *three files' worth of subtly conflicting existing behavior* in
view at once while making one coherent decision.

## What ECC-style context would add

An `EccContextProvider` (implementing EEP's [`ContextProvider`](../../src/domain/providers/context-provider.ts)
interface) would supply, alongside the task text: all three modules and all three test files
together — not just whichever one the agent happens to open first — with provenance tying each
regex difference back to the specific test assertion that depends on it, and a relevance ranking
that surfaces the inconsistency itself as something to reconcile rather than something to average
away. This is the kind of task EEP's `ecc-ablated:ranking` and `ecc-ablated:provenance` conditions
are designed to isolate: does the *ordering/salience* of "here are the three conflicting
implementations, and here's exactly why they conflict" change the outcome, independent of whether
the raw files were available at all? See
[`docs/BENCHMARK.md#experiment-design`](../BENCHMARK.md#experiment-design) for the full 9-condition
list this task would run under.

## How EEP verifies it

`verificationMethod` is `diff-analysis` combined with a test-suite run: EEP independently confirms
the three original modules no longer contain the duplicated validation logic (a diff-level check,
not something a test suite alone can catch — three files could each still hide a local copy while
happening to pass every test), *and* that both the pre-existing tests and new direct tests for the
shared module pass. Neither check alone is sufficient; together they rule out both "duplication
removed but behavior broken" and "behavior preserved but duplication never actually removed."

## What's real here today

- **Real:** the task definition, all three fixture modules and their test suites (including the
  three deliberate inconsistencies documented above), and the diff-analysis + test-suite
  verification logic that would judge any attempt at this task. You can run
  `cd benchmark/fixtures/refactoring-01 && npm test` yourself right now.
- **Real, but mechanics-only:** `npm run reproduce:smoke` runs this exact task through the real
  harness, verifier, and metrics pipeline — but with a deterministic fake LLM client that never
  attempts the refactor. It proves the pipeline reproduces, not that any approach solves the task.
- **Not yet real:** an actual LLM attempting this task, under any condition, and the resulting
  pass/fail/metric data. That requires an approved live comparison run — see
  [`docs/REPRODUCING.md`](../REPRODUCING.md).
