// Experiment: does the status index help `status = 'banned'` (about 20% of rows)?
// Compares the planner's free choice against a forced sequential scan.
// Trials alternate A, B, A, B... so cache or machine drift hits both conditions equally.
import pg from 'pg';
import type { ParsedPlan } from '../plan.js';
import { assertLocalDatabase, explainOnce, summarize } from '../runner.js';

const TRIALS = 20;
const WARMUP = 2;
const SQL = "SELECT * FROM users WHERE status = 'banned'";

const url = process.env.DATABASE_URL ?? 'postgres://lab:lab_local_only@127.0.0.1:5434/backend_lab';
assertLocalDatabase(url);

const client = new pg.Client({ connectionString: url });
await client.connect();

async function runPlannerChoice(): Promise<ParsedPlan> {
  return explainOnce(client, SQL);
}

async function runForcedSeqScan(): Promise<ParsedPlan> {
  // Session-only diagnostic switches, always reset in `finally`.
  await client.query('SET enable_indexscan = off; SET enable_bitmapscan = off');
  try {
    return await explainOnce(client, SQL);
  } finally {
    await client.query('RESET enable_indexscan; RESET enable_bitmapscan');
  }
}

try {
  for (let i = 0; i < WARMUP; i++) {
    await runPlannerChoice();
    await runForcedSeqScan();
  }

  const planner: ParsedPlan[] = [];
  const forced: ParsedPlan[] = [];
  for (let i = 0; i < TRIALS; i++) {
    planner.push(await runPlannerChoice());
    forced.push(await runForcedSeqScan());
  }

  console.log(`Query: ${SQL}`);
  console.log(`Trials per condition: ${TRIALS} (after ${WARMUP} discarded warm-up runs)\n`);
  console.table({
    'planner choice (index allowed)': summarize(planner),
    'forced seq scan': summarize(forced),
  });
} finally {
  await client.end();
}
