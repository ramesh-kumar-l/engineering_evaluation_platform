import { describe, expect, it } from 'vitest';
import { outcomeSchema } from '../domain/outcome/outcome.schema.js';
import { runSchema } from '../domain/run/run.schema.js';
import { demoRunRecords } from './demoRunRecords.js';

describe('demoRunRecords', () => {
  it('returns exactly two schema-valid records', () => {
    const records = demoRunRecords();

    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(() => runSchema.parse(record.run)).not.toThrow();
      expect(() => outcomeSchema.parse(record.outcome)).not.toThrow();
    }
  });

  it('uses a different conditionId per record (native vs full ECC)', () => {
    const [first, second] = demoRunRecords();

    expect(first!.run.conditionId).toBe('condition-native');
    expect(second!.run.conditionId).toBe('condition-ecc-full');
    expect(first!.run.conditionId).not.toBe(second!.run.conditionId);
  });
});
