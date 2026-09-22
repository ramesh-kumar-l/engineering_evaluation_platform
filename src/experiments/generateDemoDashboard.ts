import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderDashboardPage } from '../dashboard/renderDashboardPage.js';
import { buildReport } from '../reporting/buildReport.js';
import { DEMO_EXPERIMENT_ID, demoRunRecords } from './demoRunRecords.js';

const SYNTHETIC_DATA_LIMITATIONS = [
  'SYNTHETIC DEMO DATA: these two runs were fabricated to illustrate dashboard rendering, not produced by a real experiment run.',
  'Do not cite these numbers as evidence of ECC (or any context provider) performance.',
];

export function defaultDemoDashboardPath(): string {
  return join(process.cwd(), 'docs', 'sample-dashboard.html');
}

/**
 * Phase 11 entry point: regenerates the one committed public "result" artifact
 * (`docs/sample-dashboard.html`) from literal synthetic data via the same real
 * `buildReport` -> `renderDashboardPage` pipeline `dashboard:generate` uses, so it is a
 * reproducible build output instead of a hand-copied file (ADR-016).
 */
export async function generateDemoDashboard(outputPath: string = defaultDemoDashboardPath()): Promise<string> {
  const graph = buildReport(demoRunRecords(), DEMO_EXPERIMENT_ID, {
    title: 'Sample dashboard — synthetic data (not a real evaluation run)',
    limitations: SYNTHETIC_DATA_LIMITATIONS,
    generatedAt: '2026-09-19T00:03:00Z',
  });
  await writeFile(outputPath, renderDashboardPage(graph), 'utf-8');
  return outputPath;
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  generateDemoDashboard()
    .then((filePath) => {
      console.log(`Wrote demo dashboard to ${filePath}`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
