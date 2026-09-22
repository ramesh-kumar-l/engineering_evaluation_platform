import { describe, expect, it } from 'vitest';
import { compareReferenceEntries } from './compareRunResults.js';
import type { ReferenceEntry } from './reproductionReference.js';

function entry(taskId: string, conditionName: string, outcomeStatus: string, metrics: Record<string, number> = {}): ReferenceEntry {
  return { taskId, conditionName, outcomeStatus, metrics };
}

describe('compareReferenceEntries', () => {
  it('passes when reference and actual are identical', () => {
    const reference = [entry('debugging-01', 'native', 'TASK_FAILURE', { 'task-success': 0 })];
    const result = compareReferenceEntries(reference, reference, { eccCliAvailable: false });

    expect(result.passed).toBe(true);
    expect(result.matchedKeys).toEqual(['debugging-01::native']);
    expect(result.hardMismatches).toEqual([]);
  });

  it('reports a hard mismatch on the native condition regardless of ECC availability', () => {
    const reference = [entry('debugging-01', 'native', 'TASK_FAILURE', { 'task-success': 0 })];
    const actual = [entry('debugging-01', 'native', 'SUCCESS', { 'task-success': 1 })];

    const result = compareReferenceEntries(reference, actual, { eccCliAvailable: true });

    expect(result.passed).toBe(false);
    expect(result.hardMismatches).toHaveLength(2); // outcomeStatus + the metric
    expect(result.hardMismatches.every((m) => !m.informational)).toBe(true);
  });

  it('downgrades an ECC-condition mismatch to informational only when a local ECC CLI is available', () => {
    const reference = [entry('debugging-01', 'ecc', 'AGENT_FAILURE')];
    const actual = [entry('debugging-01', 'ecc', 'SUCCESS')];

    const withoutEcc = compareReferenceEntries(reference, actual, { eccCliAvailable: false });
    expect(withoutEcc.passed).toBe(false);
    expect(withoutEcc.hardMismatches).toHaveLength(1);

    const withEcc = compareReferenceEntries(reference, actual, { eccCliAvailable: true });
    expect(withEcc.passed).toBe(true);
    expect(withEcc.hardMismatches).toEqual([]);
    expect(withEcc.informationalMismatches).toHaveLength(1);
    expect(withEcc.informationalMismatches[0]?.informational).toBe(true);
  });

  it('reports an entry present in the reference but absent from actual as always-hard missing, regardless of condition', () => {
    const reference = [entry('debugging-01', 'ecc', 'AGENT_FAILURE')];
    const result = compareReferenceEntries(reference, [], { eccCliAvailable: true });

    expect(result.passed).toBe(false);
    expect(result.missingInActual).toEqual(['debugging-01::ecc']);
  });

  it('reports an entry present in actual but not the reference as extra, not a failure', () => {
    const reference = [entry('debugging-01', 'native', 'TASK_FAILURE')];
    const actual = [entry('debugging-01', 'native', 'TASK_FAILURE'), entry('feature-01', 'native', 'TASK_FAILURE')];

    const result = compareReferenceEntries(reference, actual, { eccCliAvailable: false });

    expect(result.passed).toBe(true);
    expect(result.extraInActual).toEqual(['feature-01::native']);
  });
});
