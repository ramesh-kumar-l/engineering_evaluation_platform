import { beforeEach, describe, expect, it, vi } from 'vitest';

const readAllRunResults = vi.fn();
const latestExperimentId = vi.fn();
const writeFile = vi.fn();

vi.mock('node:fs/promises', () => ({ writeFile }));
vi.mock('./resultsWriter.js', () => ({ readAllRunResults, latestExperimentId }));

const { compareIndependentRuns } = await import('./compareIndependentRuns.js');

function bundle(taskId: string, conditionName: string, outcomeStatus: string) {
  return { taskId, conditionName, outcome: { status: outcomeStatus }, metrics: [] };
}

describe('compareIndependentRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestExperimentId.mockResolvedValue('experiment-1');
  });

  it('diffs two result sets identified by explicit experiment ids, never calling latestExperimentId', async () => {
    readAllRunResults.mockImplementation(async (_experimentId: string, dir: string) => {
      return dir === 'dirA'
        ? [bundle('t1', 'native', 'TASK_FAILURE')]
        : [bundle('t1', 'native', 'SUCCESS')];
    });

    const result = await compareIndependentRuns({
      aDir: 'dirA',
      aExperimentId: 'exp-a' as never,
      bDir: 'dirB',
      bExperimentId: 'exp-b' as never,
    });

    expect(result.diff.differing).toHaveLength(1);
    expect(latestExperimentId).not.toHaveBeenCalled();
  });

  it('falls back to the latest experiment id on each side when none is given', async () => {
    readAllRunResults.mockResolvedValue([]);

    await compareIndependentRuns({ aDir: 'dirA', bDir: 'dirB' });

    expect(latestExperimentId).toHaveBeenCalledWith('dirA');
    expect(latestExperimentId).toHaveBeenCalledWith('dirB');
  });

  it('writes a markdown summary only when outPath is given', async () => {
    readAllRunResults.mockResolvedValue([]);

    const withoutOut = await compareIndependentRuns({ aDir: 'dirA', bDir: 'dirB' });
    expect(withoutOut.writtenTo).toBeUndefined();
    expect(writeFile).not.toHaveBeenCalled();

    const withOut = await compareIndependentRuns({ aDir: 'dirA', bDir: 'dirB', outPath: 'out.md' });
    expect(withOut.writtenTo).toBe('out.md');
    expect(writeFile).toHaveBeenCalledWith('out.md', expect.stringContaining('Cross-user comparison'), 'utf-8');
  });
});
