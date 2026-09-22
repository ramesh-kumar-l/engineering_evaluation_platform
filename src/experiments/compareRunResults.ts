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

type UnratedMismatch = Omit<RunComparisonMismatch, 'informational'>;

function diffEntry(reference: ReferenceEntry, actual: ReferenceEntry): UnratedMismatch[] {
  const mismatches: UnratedMismatch[] = [];
  const base = { key: keyOf(reference), taskId: reference.taskId, conditionName: reference.conditionName };

  if (reference.outcomeStatus !== actual.outcomeStatus) {
    mismatches.push({
      ...base,
      field: 'outcomeStatus',
      expected: reference.outcomeStatus,
      actual: actual.outcomeStatus,
    });
  }

  const metricNames = new Set([...Object.keys(reference.metrics), ...Object.keys(actual.metrics)]);
  for (const name of metricNames) {
    if (reference.metrics[name] !== actual.metrics[name]) {
      mismatches.push({
        ...base,
        field: `metric:${name}`,
        expected: reference.metrics[name],
        actual: actual.metrics[name],
      });
    }
  }

  return mismatches;
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
