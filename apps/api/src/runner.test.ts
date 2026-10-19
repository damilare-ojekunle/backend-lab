import { describe, expect, it } from 'vitest';
import { assertLocalDatabase, assertSelectOnly, summarize } from './runner.js';

describe('assertSelectOnly', () => {
  it('accepts a SELECT', () => {
    expect(() => assertSelectOnly('SELECT * FROM users WHERE id = 1')).not.toThrow();
  });

  it.each([
    'DELETE FROM users',
    'UPDATE users SET status = 1',
    'DROP TABLE users',
    'SELECT 1; DROP TABLE users',
  ])('rejects %s', (sql) => {
    expect(() => assertSelectOnly(sql)).toThrow();
  });
});

describe('assertLocalDatabase', () => {
  it('allows localhost and 127.0.0.1', () => {
    expect(() => assertLocalDatabase('postgres://u:p@127.0.0.1:5434/db')).not.toThrow();
    expect(() => assertLocalDatabase('postgres://u:p@localhost:5434/db')).not.toThrow();
  });

  it('rejects a remote host', () => {
    expect(() => assertLocalDatabase('postgres://u:p@db.example.com:5432/db')).toThrow();
  });
});

describe('summarize', () => {
  it('reports median, min, max and the distinct page counts', () => {
    const trials = [70, 70, 400].map((executionMs) => ({
      scanType: 'Seq Scan',
      executionMs,
      pagesTouched: 18870,
    }));
    expect(summarize(trials)).toEqual({
      trials: 3,
      medianMs: 70,
      minMs: 70,
      maxMs: 400,
      pagesTouched: [18870],
      scanTypes: ['Seq Scan'],
    });
  });
});
