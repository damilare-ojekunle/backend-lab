import type { ClientBase } from 'pg';
import { parsePlan, type ParsedPlan } from './plan.js';
import { median } from './stats.js';

// EXPLAIN ANALYZE really executes the statement, so only plain SELECTs are allowed.
// The SQL is built by our own experiment code, never from user input.
export function assertSelectOnly(sql: string): void {
  if (!/^\s*select\b/i.test(sql) || sql.includes(';')) {
    throw new Error('runner only accepts a single SELECT statement');
  }
}

// Refuse anything that is not a local database: these experiments are never for production.
export function assertLocalDatabase(connectionString: string): void {
  const host = new URL(connectionString).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(`refusing to run experiments against non-local host "${host}"`);
  }
}

export async function explainWithPlan(
  client: ClientBase,
  sql: string,
): Promise<{ parsed: ParsedPlan; raw: unknown }> {
  assertSelectOnly(sql);
  const result = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
  const raw: unknown = result.rows[0]['QUERY PLAN'];
  return { parsed: parsePlan(raw), raw };
}

export async function explainOnce(client: ClientBase, sql: string): Promise<ParsedPlan> {
  return (await explainWithPlan(client, sql)).parsed;
}

export type Summary = {
  trials: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  pagesTouched: number[];
  scanTypes: string[];
};

export function summarize(trials: ParsedPlan[]): Summary {
  const times = trials.map((t) => t.executionMs);
  return {
    trials: trials.length,
    medianMs: median(times),
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    pagesTouched: [...new Set(trials.map((t) => t.pagesTouched))].sort((a, b) => a - b),
    scanTypes: [...new Set(trials.map((t) => t.scanType))],
  };
}
