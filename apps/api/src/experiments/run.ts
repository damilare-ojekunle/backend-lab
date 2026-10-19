import type { ClientBase } from 'pg';
import { explainWithPlan, summarize, type Summary } from '../runner.js';
import type { ParsedPlan } from '../plan.js';
import type { Condition, Experiment } from './registry.js';

const WARMUP = 2;

export type ConditionResult = {
  id: string;
  label: string;
  sql: string;
  summary: Summary;
  /** The raw EXPLAIN JSON from the last trial, for the "show raw plan" view. */
  samplePlan: unknown;
};

export type ExperimentResult = {
  experimentId: string;
  trials: number;
  warmupDiscarded: number;
  conditions: ConditionResult[];
};

async function runOnce(client: ClientBase, exp: Experiment, cond: Condition) {
  const sql = exp.buildSql(cond.table);
  if (!cond.forceSeqScan) {
    return explainWithPlan(client, sql);
  }
  // Session-only switches, always reset so they cannot leak into the next trial.
  await client.query('SET enable_indexscan = off; SET enable_bitmapscan = off');
  try {
    return await explainWithPlan(client, sql);
  } finally {
    await client.query('RESET enable_indexscan; RESET enable_bitmapscan');
  }
}

// Trials alternate between conditions (A, B, A, B, ...) so cache state and machine
// drift affect every condition equally. Warm-up runs are discarded.
export async function runExperiment(
  client: ClientBase,
  exp: Experiment,
  trials: number,
): Promise<ExperimentResult> {
  for (let i = 0; i < WARMUP; i++) {
    for (const cond of exp.conditions) await runOnce(client, exp, cond);
  }

  const parsed = new Map<string, ParsedPlan[]>();
  const lastRaw = new Map<string, unknown>();
  for (const cond of exp.conditions) parsed.set(cond.id, []);

  for (let i = 0; i < trials; i++) {
    for (const cond of exp.conditions) {
      const { parsed: p, raw } = await runOnce(client, exp, cond);
      parsed.get(cond.id)!.push(p);
      lastRaw.set(cond.id, raw);
    }
  }

  return {
    experimentId: exp.id,
    trials,
    warmupDiscarded: WARMUP,
    conditions: exp.conditions.map((cond) => ({
      id: cond.id,
      label: cond.label,
      sql: exp.buildSql(cond.table),
      summary: summarize(parsed.get(cond.id)!),
      samplePlan: lastRaw.get(cond.id),
    })),
  };
}
