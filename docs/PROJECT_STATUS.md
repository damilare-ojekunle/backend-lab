# Project Status

_Last updated: 2026-10-19_

## Environment
- Node 24.20.0 (nvm, `.nvmrc`), TypeScript strict, Vitest, `pg`.
- Lab Postgres 17 in Docker: `backend-lab-postgres`, localhost:5434, database `backend_lab`.
- Git repo initialised on `main`; no commits yet.

## Verified
- Manual Index Lab experiments in psql (reads, bulk-insert write cost, low-selectivity index). Results in `LEARNING_LOG.md`.
- `median()` in `apps/api/src/stats.ts`: all 5 Vitest tests pass.

## Known issues
- `npm run typecheck` fails with 3 errors in `stats.ts` (`noUncheckedIndexedAccess`: indexing returns `number | undefined`). Fix agreed: non-null assertion `!` with a comment, since the empty-array guard makes it safe.

## Not started
- Runner (N trials, median/min/max of EXPLAIN ANALYZE JSON), API, UI, ESLint, first commit.
- Reflection questions on the `status` experiment; the `LIKE '%suffix'` experiment; update/delete write cost.

## Next precise action
Fix the 3 typecheck errors in `stats.ts`, run `npm test` and `npm run typecheck`, then make the first commit.
