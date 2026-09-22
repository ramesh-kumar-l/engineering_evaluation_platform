import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RunResultBundle } from './resultsWriter.js';

/** Built from `Date.now()`-derived timestamps — never reproducible across runs, so it must never be part of a reference comparison. */
const NON_REPRODUCIBLE_METRIC_NAMES: ReadonlySet<string> = new Set(['time-to-correct-outcome']);

/**
 * The stable, comparable slice of one run's result — deliberately excludes random ids, timestamps,
 * and `time-to-correct-outcome` (wall-clock, never reproducible). Keyed externally by
 * `(taskId, conditionName)`, never by `conditionId` — see ADR-017 in
 * project-memory-bank/14-decisions.md for why `Condition.id` is a fresh random id on every
 * `buildExperimentConditions()` call and can never be a stable cross-run join key.
 */
export interface ReferenceEntry {
  readonly taskId: string;
  readonly conditionName: string;
  readonly outcomeStatus: string;
  readonly metrics: Record<string, number>;
}

export function defaultReferencePath(): string {
  return join(process.cwd(), 'docs', 'reproduction-reference', 'smoke-reference.json');
}

/** Pulls the stable, comparable fields out of a set of raw run bundles, sorted for a stable diff-friendly file. */
export function extractReferenceEntries(bundles: readonly RunResultBundle[]): ReferenceEntry[] {
  const entries = bundles.map((bundle) => {
    const metrics: Record<string, number> = {};
    for (const metric of bundle.metrics) {
      if (!NON_REPRODUCIBLE_METRIC_NAMES.has(metric.name)) {
        metrics[metric.name] = metric.value;
      }
    }
    return {
      taskId: bundle.taskId,
      conditionName: bundle.conditionName,
      outcomeStatus: bundle.outcome.status,
      metrics,
    };
  });

  return entries.sort((a, b) => `${a.taskId}::${a.conditionName}`.localeCompare(`${b.taskId}::${b.conditionName}`));
}

/**
 * Reads the checked-in reference. Throws a plain, actionable `Error` (never silently regenerates
 * it) if it's missing — the reference must be a fixed, committed artifact, not something a user's
 * own run can quietly replace, or the comparison it exists to provide is meaningless. See
 * `runSmokeReproduction.ts`.
 */
export async function readReferenceEntries(path: string = defaultReferencePath()): Promise<ReferenceEntry[]> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (error) {
    throw new Error(
      `Reference artifact missing at ${path} — it must be checked into the repository. ` +
        'Do not regenerate it from your own local run; that would silently disable the comparison it exists to provide.',
      { cause: error },
    );
  }
  return JSON.parse(raw) as ReferenceEntry[];
}

/** Used once, manually, during implementation to produce the checked-in reference — never called from the shipped orchestration path. */
export async function writeReferenceEntries(
  entries: readonly ReferenceEntry[],
  path: string = defaultReferencePath(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');
}
