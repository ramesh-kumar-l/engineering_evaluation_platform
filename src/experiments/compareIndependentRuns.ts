import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { ExperimentId } from '../domain/common/ids.js';
import { diffEntrySets, formatDiffMarkdown, type RunSetDiff } from './independentRunDiff.js';
import { extractReferenceEntries } from './reproductionReference.js';
import { latestExperimentId, readAllRunResults } from './resultsWriter.js';

export interface CompareIndependentRunsOptions {
  readonly aDir: string;
  readonly aExperimentId?: ExperimentId;
  readonly bDir: string;
  readonly bExperimentId?: ExperimentId;
  readonly outPath?: string;
}

export interface CompareIndependentRunsResult {
  readonly aLabel: string;
  readonly bLabel: string;
  readonly diff: RunSetDiff;
  readonly writtenTo?: string;
}

const USAGE =
  'Usage: report:compare --a-dir <dir> [--a-experiment <id>] --b-dir <dir> [--b-experiment <id>] [--out <path>]';

/**
 * Phase 13 entry point (`npm run report:compare`): a purely local, offline diff between two
 * independently-produced result sets — e.g. two users' own `experiment-results/` dumps. Neither
 * user uploads anything to EEP or any third party; they exchange their
 * `<resultsDir>/<experimentId>/` directory out-of-band (email, a shared drive, a git branch) and
 * either can run this against their own copy plus the other's. See `docs/REPRODUCING.md`'s
 * "Cross-user comparison" section and ADR-018 in project-memory-bank/14-decisions.md.
 */
export async function compareIndependentRuns(
  options: CompareIndependentRunsOptions,
): Promise<CompareIndependentRunsResult> {
  const aExperimentId = options.aExperimentId ?? (await latestExperimentId(options.aDir));
  const bExperimentId = options.bExperimentId ?? (await latestExperimentId(options.bDir));

  const [aBundles, bBundles] = await Promise.all([
    readAllRunResults(aExperimentId, options.aDir),
    readAllRunResults(bExperimentId, options.bDir),
  ]);

  const diff = diffEntrySets(extractReferenceEntries(aBundles), extractReferenceEntries(bBundles));
  const aLabel = `${options.aDir}/${aExperimentId}`;
  const bLabel = `${options.bDir}/${bExperimentId}`;

  let writtenTo: string | undefined;
  if (options.outPath) {
    await writeFile(options.outPath, formatDiffMarkdown(diff, aLabel, bLabel), 'utf-8');
    writtenTo = options.outPath;
  }

  return { aLabel, bLabel, diff, writtenTo };
}

function printSummary(result: CompareIndependentRunsResult): void {
  const { diff } = result;
  console.log(`Comparing ${result.aLabel} against ${result.bLabel}`);
  console.log(`Matched: ${String(diff.matched.length)}`);
  console.log(`Differing: ${String(diff.differing.length)}`);
  console.log(`Only in A: ${String(diff.onlyInA.length)}`);
  console.log(`Only in B: ${String(diff.onlyInB.length)}`);
  if (result.writtenTo) console.log(`Markdown summary written to: ${result.writtenTo}`);

  if (diff.differing.length > 0) {
    console.log('Differing entries:');
    for (const entry of diff.differing) {
      console.log(`  - [${entry.key}] ${entry.differences.map((d) => d.field).join(', ')}`);
    }
  }
}

interface CliArgs {
  readonly aDir: string;
  readonly aExperimentId?: string;
  readonly bDir: string;
  readonly bExperimentId?: string;
  readonly outPath?: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === undefined || value === undefined || !flag.startsWith('--')) {
      throw new Error(USAGE);
    }
    flags.set(flag.slice(2), value);
  }

  const aDir = flags.get('a-dir');
  const bDir = flags.get('b-dir');
  if (!aDir || !bDir) {
    throw new Error(USAGE);
  }

  return {
    aDir,
    aExperimentId: flags.get('a-experiment'),
    bDir,
    bExperimentId: flags.get('b-experiment'),
    outPath: flags.get('out'),
  };
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  try {
    const args = parseArgs(process.argv.slice(2));
    compareIndependentRuns({
      aDir: args.aDir,
      aExperimentId: args.aExperimentId as ExperimentId | undefined,
      bDir: args.bDir,
      bExperimentId: args.bExperimentId as ExperimentId | undefined,
      outPath: args.outPath,
    })
      .then(printSummary)
      .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
      });
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
