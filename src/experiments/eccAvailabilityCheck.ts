import { spawnSync } from 'node:child_process';
import type { EccCliInvokerOptions } from '../harness/providers/eccCliInvoker.js';

const DEFAULT_COMMAND = 'ecc';
const PROBE_TIMEOUT_MS = 3_000;

/**
 * Quick, best-effort probe for whether a real `ecc` CLI is reachable — same command-resolution
 * convention `ProcessEccCliInvoker` uses (`options.command` / `ECC_CLI_COMMAND` env var / `"ecc"`
 * on PATH), but never used to decide what runs. It exists only so Phase 12's smoke-reproduction
 * comparison (`compareRunResults.ts`) can tell an expected divergence (the reader has ECC
 * installed, so the 8 ECC-based conditions legitimately differ from a reference generated without
 * it) from a real regression — see ADR-017 in project-memory-bank/14-decisions.md. Never throws;
 * any spawn failure (ENOENT, non-zero exit, timeout) is treated as "not available."
 */
export function isEccCliAvailable(options: Pick<EccCliInvokerOptions, 'command' | 'commandArgs'> = {}): boolean {
  const command = options.command ?? process.env.ECC_CLI_COMMAND ?? DEFAULT_COMMAND;
  const args = [...(options.commandArgs ?? []), '--version'];

  const result = spawnSync(command, args, { timeout: PROBE_TIMEOUT_MS, windowsHide: true });
  return !result.error && result.status === 0;
}
