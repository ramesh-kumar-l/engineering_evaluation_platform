import { describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));

const { spawnSync } = await import('node:child_process');
const { isEccCliAvailable } = await import('./eccAvailabilityCheck.js');

describe('isEccCliAvailable', () => {
  it('returns true when the probe exits 0', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, error: undefined } as ReturnType<typeof spawnSync>);
    expect(isEccCliAvailable()).toBe(true);
  });

  it('returns false when the probe exits non-zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, error: undefined } as ReturnType<typeof spawnSync>);
    expect(isEccCliAvailable()).toBe(false);
  });

  it('returns false when the command cannot be spawned at all (e.g. ENOENT)', () => {
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
      error: new Error('spawnSync ecc ENOENT'),
    } as ReturnType<typeof spawnSync>);
    expect(isEccCliAvailable()).toBe(false);
  });

  it('passes command/commandArgs through to the probe, mirroring EccCliInvokerOptions', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, error: undefined } as ReturnType<typeof spawnSync>);
    isEccCliAvailable({ command: 'node', commandArgs: ['dist/cli/index.js'] });
    expect(spawnSync).toHaveBeenCalledWith(
      'node',
      ['dist/cli/index.js', '--version'],
      expect.objectContaining({ timeout: expect.any(Number) as number }),
    );
  });
});
