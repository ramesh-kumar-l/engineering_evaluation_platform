import type { ReferenceEntry } from './reproductionReference.js';

export interface RunComparisonMismatch {
  readonly key: string;
  readonly taskId: string;
  readonly conditionName: string;
  readonly field: string;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly informational: boolean;
}

export interface RunComparisonSummary {
  readonly matchedKeys: readonly string[];
  readonly hardMismatches: readonly RunComparisonMismatch[];
  readonly informationalMismatches: readonly RunComparisonMismatch[];
  readonly missingInActual: readonly string[];
  readonly extraInActual: readonly string[];
  /** True only when there are zero hard mismatches and nothing from the reference is missing. */
  readonly passed: boolean;
}

function keyOf(entry: Pick<ReferenceEntry, 'taskId' | 'conditionName'>): string {
  return `${entry.taskId}::${entry.conditionName}`;
}

export interface FieldDifference {
  readonly field: string;
  readonly expected: unknown;
  readonly actual: unknown;
}

/**
 * Pure, symmetric per-field comparison of two entries (outcomeStatus + every metric key present on
 * either side) — no reference/actual asymmetry, no verdict. Shared by `compareReferenceEntries`
 * below (which layers its own reference-vs-actual/ECC-informational verdict on top) and
 * `independentRunDiff.ts`'s peer-comparison `diffEntrySets` (which does not).
 */
export function diffEntryFields(a: ReferenceEntry, b: ReferenceEntry): FieldDifference[] {
  const differences: FieldDifference[] = [];

  if (a.outcomeStatus !== b.outcomeStatus) {
    differences.push({ field: 'outcomeStatus', expected: a.outcomeStatus, actual: b.outcomeStatus });
  }

  const metricNames = new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)]);
  for (const name of metricNames) {
    if (a.metrics[name] !== b.metrics[name]) {
      differences.push({ field: `metric:${name}`, expected: a.metrics[name], actual: b.metrics[name] });
    }
  }

  return differences;
}

type UnratedMismatch = Omit<RunComparisonMismatch, 'informational'>;

function diffEntry(reference: ReferenceEntry, actual: ReferenceEntry): UnratedMismatch[] {
  const base = { key: keyOf(reference), taskId: reference.taskId, conditionName: reference.conditionName };
  return diffEntryFields(reference, actual).map((difference) => ({ ...base, ...difference }));
}

/**
 * Pure comparison of a freshly-produced smoke reproduction against the checked-in reference,
 * keyed by `(taskId, conditionName)` (never `conditionId` — see ADR-017 in
 * project-memory-bank/14-decisions.md). A mismatch on the `'native'` condition is always hard
 * (native has no external dependency, so it must reproduce identically everywhere). A mismatch on
 * any other (ECC-based) condition is downgraded to informational only when `eccCliAvailable` is
 * true — the reader has a local ECC CLI the reference wasn't generated against, so divergence
 * there is expected, not a regression. An entry present in the reference but entirely absent from
 * `actual` is always a hard problem (the pipeline failed to produce that run at all), regardless
 * of condition.
 */
export function compareReferenceEntries(
  reference: readonly ReferenceEntry[],
  actual: readonly ReferenceEntry[],
  options: { readonly eccCliAvailable: boolean },
): RunComparisonSummary {
  const actualByKey = new Map(actual.map((entry) => [keyOf(entry), entry]));
  const referenceByKey = new Map(reference.map((entry) => [keyOf(entry), entry]));

  const matchedKeys: string[] = [];
  const hardMismatches: RunComparisonMismatch[] = [];
  const informationalMismatches: RunComparisonMismatch[] = [];
  const missingInActual: string[] = [];

  for (const [key, referenceEntry] of referenceByKey) {
    const actualEntry = actualByKey.get(key);
    if (!actualEntry) {
      missingInActual.push(key);
      continue;
    }

    const fieldMismatches = diffEntry(referenceEntry, actualEntry);
    if (fieldMismatches.length === 0) {
      matchedKeys.push(key);
      continue;
    }

    const informational = referenceEntry.conditionName !== 'native' && options.eccCliAvailable;
    const bucket = informational ? informationalMismatches : hardMismatches;
    for (const mismatch of fieldMismatches) {
      bucket.push({ ...mismatch, informational });
    }
  }

  const extraInActual = [...actualByKey.keys()].filter((key) => !referenceByKey.has(key));

  return {
    matchedKeys,
    hardMismatches,
    informationalMismatches,
    missingInActual,
    extraInActual,
    passed: hardMismatches.length === 0 && missingInActual.length === 0,
  };
}
