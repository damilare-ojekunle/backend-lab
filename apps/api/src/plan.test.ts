import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePlan } from './plan.js';

// Real output captured from `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` on the lab database.
const indexScanPlan: unknown = JSON.parse(
  readFileSync(new URL('./fixtures/index-scan.plan.json', import.meta.url), 'utf8'),
);

const parallelSeqScanPlan: unknown = JSON.parse(
  readFileSync(new URL('./fixtures/parallel-seq-scan.plan.json', import.meta.url), 'utf8'),
);

describe('parsePlan', () => {
  it('reports the underlying scan, not Gather, for a parallel plan', () => {
    const result = parsePlan(parallelSeqScanPlan);
    expect(result.scanType).toBe('Seq Scan');
    expect(result.pagesTouched).toBe(18870);
  });

  it('extracts scan type, execution time and pages touched from an index scan', () => {
    expect(parsePlan(indexScanPlan)).toEqual({
      scanType: 'Index Scan',
      executionMs: 5.896,
      pagesTouched: 4,
    });
  });
});
