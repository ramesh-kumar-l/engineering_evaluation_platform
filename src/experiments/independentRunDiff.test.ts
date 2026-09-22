import { describe, expect, it } from 'vitest';
import { diffEntrySets, formatDiffMarkdown } from './independentRunDiff.js';
import type { ReferenceEntry } from './reproductionReference.js';

function entry(
  taskId: string,
  conditionName: string,
  outcomeStatus: string,
  metrics: Record<string, number> = {},
): ReferenceEntry {
  return { taskId, conditionName, outcomeStatus, metrics };
}

describe('diffEntrySets', () => {
  it('reports identical entries as matched', () => {
    const a = [entry('debugging-01', 'native', 'TASK_FAILURE', { 'task-success': 0 })];

    const result = diffEntrySets(a, a);

    expect(result.matched).toEqual(['debugging-01::native']);
    expect(result.differing).toEqual([]);
    expect(result.onlyInA).toEqual([]);
    expect(result.onlyInB).toEqual([]);
  });

  it('reports a shared key with different fields as differing, symmetrically either way', () => {
    const a = [entry('debugging-01', 'native', 'TASK_FAILURE', { 'task-success': 0 })];
    const b = [entry('debugging-01', 'native', 'SUCCESS', { 'task-success': 1 })];

    const ab = diffEntrySets(a, b);
    expect(ab.matched).toEqual([]);
    expect(ab.differing).toHaveLength(1);
    expect(ab.differing[0]?.differences).toHaveLength(2);

    const ba = diffEntrySets(b, a);
    expect(ba.differing).toHaveLength(1);
  });

  it('reports a key present only in one side under onlyInA/onlyInB, never as a mismatch', () => {
    const a = [entry('debugging-01', 'native', 'TASK_FAILURE')];
    const b = [entry('feature-01', 'native', 'TASK_FAILURE')];

    const result = diffEntrySets(a, b);

    expect(result.onlyInA).toEqual(['debugging-01::native']);
    expect(result.onlyInB).toEqual(['feature-01::native']);
    expect(result.differing).toEqual([]);
  });
});

describe('formatDiffMarkdown', () => {
  it('renders a self-contained markdown summary including both labels, counts, and per-field detail', () => {
    const diff = diffEntrySets(
      [entry('debugging-01', 'native', 'TASK_FAILURE', { m: 0 })],
      [entry('debugging-01', 'native', 'SUCCESS', { m: 1 })],
    );

    const markdown = formatDiffMarkdown(diff, 'alice', 'bob');

    expect(markdown).toContain('# Cross-user comparison');
    expect(markdown).toContain('alice');
    expect(markdown).toContain('bob');
    expect(markdown).toContain('debugging-01::native');
    expect(markdown).toContain('Differing: 1');
    expect(markdown).toContain('outcomeStatus');
  });

  it('omits the differing/only-in sections entirely when there is nothing to report', () => {
    const diff = diffEntrySets(
      [entry('debugging-01', 'native', 'TASK_FAILURE')],
      [entry('debugging-01', 'native', 'TASK_FAILURE')],
    );

    const markdown = formatDiffMarkdown(diff, 'alice', 'bob');

    expect(markdown).not.toContain('## Differing entries');
    expect(markdown).not.toContain('## Only in');
  });
});
