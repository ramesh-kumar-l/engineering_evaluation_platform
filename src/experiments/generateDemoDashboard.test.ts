import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateDemoDashboard } from './generateDemoDashboard.js';

describe('generateDemoDashboard', () => {
  it('writes a self-contained, clearly-labeled synthetic dashboard to the given path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eep-demo-dash-'));
    const outputPath = join(dir, 'sample-dashboard.html');

    const returnedPath = await generateDemoDashboard(outputPath);

    expect(returnedPath).toBe(outputPath);
    const html = await readFile(outputPath, 'utf-8');
    expect(html).toContain('Sample dashboard — synthetic data (not a real evaluation run)');
    expect(html).toContain('SYNTHETIC DEMO DATA');
    expect(html).toContain('Do not cite these numbers as evidence of ECC');
    expect((html.match(/class="evaluation"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://');
  });
});
