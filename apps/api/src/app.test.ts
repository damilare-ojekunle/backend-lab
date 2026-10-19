// Integration tests: they talk to the real lab Postgres (`docker compose up -d`) and expect
// the users_idx / users_noidx tables from the Index Lab setup.
import pg from 'pg';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { databaseUrl } from './config.js';
import { assertLocalDatabase } from './runner.js';

assertLocalDatabase(databaseUrl());
const pool = new pg.Pool({ connectionString: databaseUrl(), max: 2 });
const app = createApp(pool);

afterAll(async () => {
  await pool.end();
});

describe('GET /api/experiments', () => {
  it('lists experiments with their conditions and without exposing SQL', async () => {
    const res = await request(app).get('/api/experiments');

    expect(res.status).toBe(200);
    const ids = res.body.map((e: { id: string }) => e.id);
    expect(ids).toEqual(['email-lookup', 'status-banned', 'status-active']);
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT\s+\*|FROM\s+users/i);
  });
});

describe('POST /api/experiments/:id/run validation', () => {
  it('returns 404 for an unknown experiment', async () => {
    const res = await request(app).post('/api/experiments/nope/run').send({ trials: 2 });
    expect(res.status).toBe(404);
  });

  it.each([0, -1, 1.5, 101, '5', null])('returns 400 for trials = %s', async (trials) => {
    const res = await request(app).post('/api/experiments/email-lookup/run').send({ trials });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/experiments/:id/run', () => {
  it('compares an indexed and a non-indexed email lookup on real data', async () => {
    const res = await request(app).post('/api/experiments/email-lookup/run').send({ trials: 2 });

    expect(res.status).toBe(200);
    const [without, withIndex] = res.body.conditions;
    expect(without.id).toBe('without-index');
    expect(withIndex.id).toBe('with-index');
    expect(without.summary.trials).toBe(2);

    // Page counts are stable; millisecond timings are not, so assert on pages and plan type.
    expect(withIndex.summary.scanTypes).toEqual(['Index Scan']);
    expect(without.summary.scanTypes).toEqual(['Seq Scan']);
    expect(withIndex.summary.pagesTouched[0]).toBeLessThan(without.summary.pagesTouched[0]);
    expect(withIndex.samplePlan).toBeDefined();
  });

  it('allows only one experiment at a time', async () => {
    const [a, b] = await Promise.all([
      request(app).post('/api/experiments/email-lookup/run').send({ trials: 1 }),
      request(app).post('/api/experiments/email-lookup/run').send({ trials: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
