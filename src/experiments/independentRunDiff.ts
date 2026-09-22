import { diffEntryFields, type FieldDifference } from './compareRunResults.js';
import type { ReferenceEntry } from './reproductionReference.js';

export interface EntryDiff {
  readonly key: string;
  readonly taskId: string;
  readonly conditionName: string;
  readonly differences: readonly FieldDifference[];
}

export interface RunSetDiff {
  readonly matched: readonly string[];
  readonly differing: readonly EntryDiff[];
  readonly onlyInA: readonly string[];
  readonly onlyInB: readonly string[];
}

function keyOf(entry: Pick<ReferenceEntry, 'taskId' | 'conditionName'>): string {
  return `${entry.taskId}::${entry.conditionName}`;
}

/**
 * Symmetric diff of two independently-produced result sets — e.g. two users' own
 * `npm run experiment:run` (or `reproduce:smoke`) output, exchanged out-of-band. Unlike
 * `compareReferenceEntries` (`compareRunResults.ts`), neither side is authoritative: there is no
 * reference/actual asymmetry, no ECC-availability-gated informational downgrade, and no pass/fail
 * verdict — this is a peer comparison, not a regression check against a fixed ground truth. See
 * `docs/REPRODUCING.md`'s "Cross-user comparison" section.
 */
export function diffEntrySets(a: readonly ReferenceEntry[], b: readonly ReferenceEntry[]): RunSetDiff {
  const byKeyA = new Map(a.map((entry) => [keyOf(entry), entry]));
  const byKeyB = new Map(b.map((entry) => [keyOf(entry), entry]));

  const matched: string[] = [];
  const differing: EntryDiff[] = [];

  for (const [key, entryA] of byKeyA) {
    const entryB = byKeyB.get(key);
    if (!entryB) continue;

    const differences = diffEntryFields(entryA, entryB);
    if (differences.length === 0) {
      matched.push(key);
    } else {
      differing.push({ key, taskId: entryA.taskId, conditionName: entryA.conditionName, differences });
    }
  }

  const onlyInA = [...byKeyA.keys()].filter((key) => !byKeyB.has(key));
  const onlyInB = [...byKeyB.keys()].filter((key) => !byKeyA.has(key));

  return { matched, differing, onlyInA, onlyInB };
}

function formatDifference(difference: FieldDifference): string {
  return `${difference.field}: \`${JSON.stringify(difference.expected)}\` vs \`${JSON.stringify(difference.actual)}\``;
}

/** Renders a `RunSetDiff` as a small, self-contained Markdown summary — for `--out`, or to paste anywhere. */
export function formatDiffMarkdown(diff: RunSetDiff, labelA: string, labelB: string): string {
  const lines: string[] = [
    '# Cross-user comparison',
    '',
    `Comparing **${labelA}** against **${labelB}**.`,
    '',
    'This is a peer comparison between two independently-produced result sets — neither side is ' +
      'treated as ground truth. See `docs/REPRODUCING.md`’s "Cross-user comparison" section.',
    '',
    `- Matched: ${String(diff.matched.length)}`,
    `- Differing: ${String(diff.differing.length)}`,
    `- Only in ${labelA}: ${String(diff.onlyInA.length)}`,
    `- Only in ${labelB}: ${String(diff.onlyInB.length)}`,
    '',
  ];

  if (diff.differing.length > 0) {
    lines.push('## Differing entries', '');
    for (const entry of diff.differing) {
      lines.push(`### ${entry.key}`);
      for (const difference of entry.differences) lines.push(`- ${formatDifference(difference)}`);
      lines.push('');
    }
  }

  if (diff.onlyInA.length > 0) {
    lines.push(`## Only in ${labelA}`, '');
    for (const key of diff.onlyInA) lines.push(`- ${key}`);
    lines.push('');
  }

  if (diff.onlyInB.length > 0) {
    lines.push(`## Only in ${labelB}`, '');
    for (const key of diff.onlyInB) lines.push(`- ${key}`);
    lines.push('');
  }

  return lines.join('\n');
}
