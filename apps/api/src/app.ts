import express from 'express';
import type { Pool } from 'pg';
import { experiments, findExperiment } from './experiments/registry.js';
import { runExperiment } from './experiments/run.js';

const DEFAULT_TRIALS = 20;
const MAX_TRIALS = 100;

export function createApp(pool: Pick<Pool, 'connect'>) {
  const app = express();
  app.use(express.json());

  // Two experiments running at once would compete for CPU and cache and ruin each other's
  // timings, so only one runs at a time.
  let running = false;

  app.get('/api/experiments', (_req, res) => {
    res.json(
      experiments.map(({ id, title, description, conditions }) => ({
        id,
        title,
        description,
        conditions: conditions.map(({ id, label }) => ({ id, label })),
      })),
    );
  });

  app.post('/api/experiments/:id/run', async (req, res) => {
    const experiment = findExperiment(req.params.id);
    if (!experiment) {
      res.status(404).json({ error: 'unknown experiment' });
      return;
    }

    // Only a missing value gets the default; an explicit null or string is invalid input.
    const trials: unknown = req.body?.trials === undefined ? DEFAULT_TRIALS : req.body.trials;
    if (typeof trials !== 'number' || !Number.isInteger(trials) || trials < 1 || trials > MAX_TRIALS) {
      res.status(400).json({ error: `trials must be an integer from 1 to ${MAX_TRIALS}` });
      return;
    }

    if (running) {
      res.status(409).json({ error: 'another experiment is already running' });
      return;
    }
    running = true;

    const client = await pool.connect();
    try {
      res.json(await runExperiment(client, experiment, trials));
    } finally {
      client.release();
      running = false;
    }
  });

  return app;
}
