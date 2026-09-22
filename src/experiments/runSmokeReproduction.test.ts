import { beforeEach, describe, expect, it, vi } from 'vitest';

const runComparisonExperiment = vi.fn();
const generateReport = vi.fn();
const generateDashboard = vi.fn();
const readAllRunResults = vi.fn();
const readReferenceEntries = vi.fn();
const isEccCliAvailable = vi.fn();

vi.mock('./runComparisonExperiment.js', () => ({ runComparisonExperiment }));
vi.mock('./generateReport.js', () => ({ generateReport }));
vi.mock('./generateDashboard.js', () => ({ generateDashboard }));
vi.mock('./resultsWriter.js', () => ({ readAllRunResults }));
vi.mock('./reproductionReference.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./reproductionReference.js')>();
  return { ...actual, readReferenceEntries };
});
vi.mock('./eccAvailabilityCheck.js', () => ({ isEccCliAvailable }));

const { runSmokeReproduction, smokeResultsDir, smokeReportsDir, smokeDashboardDir } = await import(
  './runSmokeReproduction.js'
);

describe('runSmokeReproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runComparisonExperiment.mockResolvedValue({ experimentId: 'experiment-1', runCount: 27 });
    generateReport.mockResolvedValue({ filePath: 'reports-smoke/experiment-1/report.json' });
    generateDashboard.mockResolvedValue({ filePath: 'dashboard-smoke/experiment-1/index.html' });
    readAllRunResults.mockResolvedValue([]);
    readReferenceEntries.mockResolvedValue([]);
    isEccCliAvailable.mockReturnValue(false);
  });

  it('forces the fake-deterministic provider and 1 repetition, never reading EEP_LLM_* env vars', async () => {
    await runSmokeReproduction();

    expect(runComparisonExperiment).toHaveBeenCalledWith({
      resultsDir: smokeResultsDir(),
      repetitions: 1,
      environment: 'smoke-reproduction',
      llmProviderConfig: { provider: 'fake-deterministic' },
    });
  });

  it('generates a report and dashboard into the smoke-specific directories', async () => {
    await runSmokeReproduction();

    expect(generateReport).toHaveBeenCalledWith(
      'experiment-1',
      expect.objectContaining({ resultsDir: smokeResultsDir(), reportsDir: smokeReportsDir() }),
    );
    expect(generateDashboard).toHaveBeenCalledWith(
      'experiment-1',
      expect.objectContaining({ reportsDir: smokeReportsDir(), dashboardDir: smokeDashboardDir() }),
    );
  });

  it('reports the reproduction as passed when the actual run matches the reference exactly', async () => {
    readReferenceEntries.mockResolvedValue([
      { taskId: 'debugging-01', conditionName: 'native', outcomeStatus: 'TASK_FAILURE', metrics: {} },
    ]);
    readAllRunResults.mockResolvedValue([
      { taskId: 'debugging-01', conditionName: 'native', outcome: { status: 'TASK_FAILURE' }, metrics: [] },
    ]);

    const result = await runSmokeReproduction();

    expect(result.comparison.passed).toBe(true);
    expect(result.experimentId).toBe('experiment-1');
    expect(result.runCount).toBe(27);
  });

  it('reports the reproduction as failed when the native condition diverges from the reference', async () => {
    readReferenceEntries.mockResolvedValue([
      { taskId: 'debugging-01', conditionName: 'native', outcomeStatus: 'TASK_FAILURE', metrics: {} },
    ]);
    readAllRunResults.mockResolvedValue([
      { taskId: 'debugging-01', conditionName: 'native', outcome: { status: 'SUCCESS' }, metrics: [] },
    ]);

    const result = await runSmokeReproduction();

    expect(result.comparison.passed).toBe(false);
  });
});
