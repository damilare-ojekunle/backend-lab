# Project Status

_Last updated: 2026-10-19_

## Environment
- Node 24.20.0 (nvm, `.nvmrc`), TypeScript strict, Vitest, `pg`.
- Lab Postgres 17 in Docker: `backend-lab-postgres`, localhost:5434, database `backend_lab`.
- Git repo on `main`, pushed to `damilare-ojekunle/backend-lab` (first commit includes the 3 known typecheck errors below).

## Verified
- Manual Index Lab experiments in psql (reads, bulk-insert write cost, low-selectivity index). Results in `LEARNING_LOG.md`.
- `median()` in `apps/api/src/stats.ts`: all 5 Vitest tests pass.

## Known issues
- None known. `npm test` (5/5) and `npm run typecheck` are clean. `stats.ts` uses `!` on indexed access; the empty-array guard makes it safe (a comment explaining this is still to add).

## Not started
- Runner (N trials, median/min/max of EXPLAIN ANALYZE JSON), API, UI, ESLint, first commit.
- Reflection questions on the `status` experiment; the `LIKE '%suffix'` experiment; update/delete write cost.

## Next precise action
Inspect the EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) output in psql and decide which fields the runner extracts; then write a parser for it (test first).
