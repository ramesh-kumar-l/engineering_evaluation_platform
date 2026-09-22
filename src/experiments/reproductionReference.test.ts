import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractReferenceEntries,
  readReferenceEntries,
  writeReferenceEntries,
  type ReferenceEntry,
} from './reproductionReference.js';
import type { RunResultBundle } from './resultsWriter.js';

function bundle(taskId: string, conditionName: string, status: string, metrics: Record<string, number>): RunResultBundle {
  return {
    taskId,
    conditionName,
    outcome: { status },
    metrics: Object.entries(metrics).map(([name, value]) => ({ name, value })),
  } as unknown as RunResultBundle;
}

describe('extractReferenceEntries', () => {
  it('pulls the stable, comparable fields and drops time-to-correct-outcome', () => {
    const entries = extractReferenceEntries([
      bundle('debugging-01', 'native', 'TASK_FAILURE', { 'task-success': 0, 'time-to-correct-outcome': 1234 }),
    ]);

    expect(entries).toEqual([
      { taskId: 'debugging-01', conditionName: 'native', outcomeStatus: 'TASK_FAILURE', metrics: { 'task-success': 0 } },
    ]);
  });

  it('sorts entries by taskId then conditionName for a stable, diff-friendly file', () => {
    const entries = extractReferenceEntries([
      bundle('feature-01', 'native', 'TASK_FAILURE', {}),
      bundle('debugging-01', 'ecc', 'AGENT_FAILURE', {}),
      bundle('debugging-01', 'native', 'TASK_FAILURE', {}),
    ]);

    expect(entries.map((e) => `${e.taskId}::${e.conditionName}`)).toEqual([
      'debugging-01::ecc',
      'debugging-01::native',
      'feature-01::native',
    ]);
  });
});

describe('readReferenceEntries / writeReferenceEntries', () => {
  it('round-trips entries through disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'eep-reference-'));
    const path = join(dir, 'nested', 'smoke-reference.json');
    const entries: ReferenceEntry[] = [
      { taskId: 'debugging-01', conditionName: 'native', outcomeStatus: 'TASK_FAILURE', metrics: { x: 1 } },
    ];

    await writeReferenceEntries(entries, path);
    const readBack = await readReferenceEntries(path);

    expect(readBack).toEqual(entries);
    await rm(dir, { recursive: true, force: true });
  });

  it('throws a clear, actionable error when the reference is missing — never regenerates it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'eep-reference-'));
    const missingPath = join(dir, 'does-not-exist.json');

    await expect(readReferenceEntries(missingPath)).rejects.toThrow(/must be checked into the repository/);
    await rm(dir, { recursive: true, force: true });
  });
});
