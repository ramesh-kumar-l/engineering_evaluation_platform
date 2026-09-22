import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ExperimentId } from '../domain/common/ids.js';
import { compareReferenceEntries, type RunComparisonMismatch, type RunComparisonSummary } from './compareRunResults.js';
import { isEccCliAvailable } from './eccAvailabilityCheck.js';
import { generateDashboard } from './generateDashboard.js';
import { generateReport } from './generateReport.js';
import { extractReferenceEntries, readReferenceEntries } from './reproductionReference.js';
import { readAllRunResults } from './resultsWriter.js';
import { runComparisonExperiment } from './runComparisonExperiment.js';

const SMOKE_LIMITATIONS = [
  'SMOKE REPRODUCTION: the solving agent never attempts to fix anything (see DeterministicFakeLlmClient) — ' +
    'this proves the pipeline reproduces identically across machines, not that any context provider improves outcomes.',
  'Not a performance benchmark and not a substitute for a real, live comparison run against a paid LLM backend.',
];

export function smokeResultsDir(): string {
  return join(process.cwd(), 'experiment-results-smoke');
}

export function smokeReportsDir(): string {
  return join(process.cwd(), 'reports-smoke');
}

export function smokeDashboardDir(): string {
  return join(process.cwd(), 'dashboard-smoke');
}

export interface SmokeReproductionResult {
  readonly experimentId: ExperimentId;
  readonly runCount: number;
  readonly reportPath: string;
  readonly dashboardPath: string;
  readonly eccCliAvailable: boolean;
  readonly comparison: RunComparisonSummary;
}

/**
 * Phase 12 entry point (`npm run reproduce:smoke`): a zero-cost, zero-credential reproduction of
 * the real harness → verifier → metrics → Phase 7/8 analysis → Phase 9 report → Phase 10
 * dashboard pipeline, using the deterministic fake LLM provider instead of a paid backend. Never
 * touches `process.env`/`EEP_LLM_*` — `llmProviderConfig` is passed explicitly, bypassing
 * `llmProviderConfigFromEnv()` entirely, so this can never accidentally reach a real vendor
 * regardless of what the caller's shell already has configured. See ADR-017 in
 * project-memory-bank/14-decisions.md and project-memory-bank/phases/phase-12.md.
 */
export async function runSmokeReproduction(): Promise<SmokeReproductionResult> {
  const resultsDir = smokeResultsDir();
  const { experimentId, runCount } = await runComparisonExperiment({
    resultsDir,
    repetitions: 1,
    environment: 'smoke-reproduction',
    llmProviderConfig: { provider: 'fake-deterministic' },
  });

  const { filePath: reportPath } = await generateReport(experimentId, {
    resultsDir,
    reportsDir: smokeReportsDir(),
    title: `Smoke reproduction — experiment ${experimentId}`,
    limitations: SMOKE_LIMITATIONS,
  });

  const { filePath: dashboardPath } = await generateDashboard(experimentId, {
    reportsDir: smokeReportsDir(),
    dashboardDir: smokeDashboardDir(),
  });

  const bundles = await readAllRunResults(experimentId, resultsDir);
  const actualEntries = extractReferenceEntries(bundles);
  const referenceEntries = await readReferenceEntries();
  const eccCliAvailable = isEccCliAvailable();
  const comparison = compareReferenceEntries(referenceEntries, actualEntries, { eccCliAvailable });

  return { experimentId, runCount, reportPath, dashboardPath, eccCliAvailable, comparison };
}

function formatMismatch(mismatch: RunComparisonMismatch): string {
  const suffix = mismatch.informational ? ' (informational — local ECC CLI detected)' : '';
  return `  - [${mismatch.key}] ${mismatch.field}: expected ${JSON.stringify(mismatch.expected)}, got ${JSON.stringify(mismatch.actual)}${suffix}`;
}

function printSummary(result: SmokeReproductionResult): void {
  const { comparison } = result;
  console.log(`Smoke reproduction: experiment ${result.experimentId}, ${String(result.runCount)} run(s).`);
  console.log(`Report: ${result.reportPath}`);
  console.log(`Dashboard: ${result.dashboardPath}`);
  console.log(`Local ECC CLI detected: ${result.eccCliAvailable ? 'yes' : 'no'}`);
  console.log(`Matched reference exactly: ${String(comparison.matchedKeys.length)}`);

  if (comparison.informationalMismatches.length > 0) {
    console.log("Informational divergence (expected — you have a local ECC CLI the reference wasn't generated against):");
    for (const mismatch of comparison.informationalMismatches) console.log(formatMismatch(mismatch));
  }
  if (comparison.missingInActual.length > 0) {
    console.error(`Missing from your run (present in reference): ${comparison.missingInActual.join(', ')}`);
  }
  if (comparison.hardMismatches.length > 0) {
    console.error('The following must match the reference exactly but did not:');
    for (const mismatch of comparison.hardMismatches) console.error(formatMismatch(mismatch));
  }

  console.log(comparison.passed ? 'Reproduction PASSED.' : 'Reproduction FAILED.');
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runSmokeReproduction()
    .then((result) => {
      printSummary(result);
      if (!result.comparison.passed) process.exitCode = 1;
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
