import type { ExperimentId, RunId } from '../domain/common/ids.js';
import type { Metric } from '../domain/metric/metric.schema.js';
import type { Outcome } from '../domain/outcome/outcome.schema.js';
import type { Run } from '../domain/run/run.schema.js';
import type { EvaluatedRunRecord } from '../reporting/evaluatedRunInput.js';

export const DEMO_EXPERIMENT_ID = 'demo-experiment-sample' as ExperimentId;

// SYNTHETIC DEMO DATA ONLY. Every value below is hand-authored fiction illustrating the
// dashboard renderer (project-memory-bank/phases/phase-11.md) — never read from an environment
// variable, the filesystem, or a real run. Do not wire this to real data.
function metric(runId: RunId, name: Metric['name'], value: number, unit?: string): Metric {
  return {
    schemaVersion: '1.0.0',
    id: `metric-${runId}-${name}` as Metric['id'],
    runId,
    name,
    value,
    unit,
    computedAt: '2026-09-19T00:03:00Z',
  };
}

function record(options: {
  readonly runId: RunId;
  readonly conditionId: string;
  readonly contextProviderName: string;
  readonly status: Outcome['status'];
  readonly summary: string;
  readonly metrics: readonly Metric[];
}): EvaluatedRunRecord {
  const run: Run = {
    schemaVersion: '1.0.0',
    id: options.runId,
    experimentId: DEMO_EXPERIMENT_ID,
    conditionId: options.conditionId as Run['conditionId'],
    taskId: 'debugging-01' as Run['taskId'],
    metadata: {
      taskVersion: '1.0.0',
      repositorySha: 'f3518a14',
      agentName: 'llm-solving-agent',
      agentVersion: '0.1.0',
      contextProviderName: options.contextProviderName,
      contextProviderVersion: '0.1.0',
      eepVersion: '0.1.0',
      evaluatorVersion: '0.1.0',
      benchmarkVersion: '1.0.0',
      environment: 'demo',
    },
    startedAt: '2026-09-19T00:00:00Z',
    finishedAt: '2026-09-19T00:02:00Z',
  };
  const outcome: Outcome = {
    schemaVersion: '1.0.0',
    id: `outcome-${options.runId}` as Outcome['id'],
    runId: options.runId,
    status: options.status,
    summary: options.summary,
    verificationIds: [],
    evidenceIds: [],
    finalizedAt: '2026-09-19T00:02:00Z',
  };
  return { run, outcome, metrics: options.metrics, verifications: [], evidence: [] };
}

/**
 * Two literal, schema-valid, explicitly-synthetic evaluated runs — the regenerable replacement
 * for the hand-copied `docs/sample-dashboard.html` (see ADR-016). Illustrates one native-baseline
 * failure and one full-ECC success on the same task, purely to demonstrate the dashboard
 * renderer; never cite these numbers as an evaluation result.
 */
export function demoRunRecords(): readonly EvaluatedRunRecord[] {
  const nativeRunId = 'run-native-1' as RunId;
  const eccRunId = 'run-ecc-1' as RunId;
  return [
    record({
      runId: nativeRunId,
      conditionId: 'condition-native',
      contextProviderName: 'native',
      status: 'TASK_FAILURE',
      summary: 'Agent could not locate the root cause within the token budget.',
      metrics: [
        metric(nativeRunId, 'task-success', 0),
        metric(nativeRunId, 'context-tokens', 5210, 'tokens'),
        metric(nativeRunId, 'agent-turns', 9),
      ],
    }),
    record({
      runId: eccRunId,
      conditionId: 'condition-ecc-full',
      contextProviderName: 'ecc',
      status: 'SUCCESS',
      summary: 'Agent identified the root cause and applied a correct fix using ECC-compiled context.',
      metrics: [
        metric(eccRunId, 'task-success', 1),
        metric(eccRunId, 'context-tokens', 3120, 'tokens'),
        metric(eccRunId, 'agent-turns', 4),
        metric(eccRunId, 'evidence-precision', 0.91),
      ],
    }),
  ];
}
