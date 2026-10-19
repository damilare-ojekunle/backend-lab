# Learning Log

## Session 1: Index Lab, manual read experiment (psql)

**Setup:** Postgres 17 in Docker (`backend-lab-postgres`, localhost:5434). `users` table, 2,000,000 rows (id PK, email, status, created_at). Seeded with `generate_series` in 2.0 s (single run, only PK index present).

**Measurements (single dev machine, small sample, noisy):**

| Condition      | Plan              | Pages touched      | Execution time                      |
| -------------- | ----------------- | ------------------ | ----------------------------------- |
| No email index | Parallel Seq Scan | 18,870 (every run) | 43.9 ms, 135.9 ms (identical query) |

| Email index
| Index Scan | 4 | 0.394 ms (1 run) |

- Table size 147 MB; email index 77 MB.
- Same query varied about 3x in time without any change, so timings need repeated trials; page counts are stable.
- `hit` means found in shared_buffers; `read` means it was not, but may still be served from the OS cache, so it does not prove disk I/O.

**Concepts covered:** sequential scan vs index scan, B-tree lookup, estimated cost vs actual execution, EXPLAIN (ANALYZE, BUFFERS), index storage cost.

**Misconceptions / corrections:**

- "B-tree" was given as a plan; B-tree is the index structure, the plan node is `Index Scan`.
- Pasting `\timing on` together with SQL: psql meta-commands consume the rest of the line.

**Not yet done:** CREATE INDEX time recorded; predictions for `status` experiment; write experiments (insert/update/delete with vs without index); LIKE '%suffix' question; reflection questions.

**Environment notes:** another container `pg-lab` already uses port 5433, so the lab uses 5434. Node 20.20.2 in use (Node 20 is EOL as of April 2026; upgrade to 22/24 LTS pending a decision).

**Write experiment (bulk insert of 2M rows via INSERT ... SELECT FROM users, single transaction, PK on both tables):**

| Run | users_idx (email index) | users_noidx |
| --- | ----------------------- | ----------- |
| 1   | 6.15 s                  | 1.84 s      |
| 2   | 5.95 s                  | 1.37 s      |
| 3   | 5.36 s                  | 1.25 s      |
| 4   | 5.89 s                  | 1.37 s      |

- First comparison (6.15 s vs the 2.0 s generate_series load) was unfair: different data source. Fixed by loading both tables with the identical INSERT ... SELECT and alternating order.
- Indexed table was slower in every run, about 4x on average (about 5.7 s vs 1.3 s). Valid only for this machine and this bulk-insert workload; updates, deletes and single-row inserts not yet measured.

**Low-selectivity experiment (idx_users_status; status cycles with id so every table page holds every status):**

| Query | Plan | Pages | Execution time |
|---|---|---|---|
| status = 'active' (60%) | Seq Scan (index exists, not used) | 18,870 | 97.9 ms |
| status = 'banned' (20%) | Bitmap Heap Scan | 18,870 heap + 339 index | 172.7 ms, 153.0 ms |
| status = 'banned', index scans forced off | Seq Scan | 18,870 | 169.7 ms, 71.5 ms |

- Planner chose Seq Scan for 'active' correctly; its row estimate (1,196,333) matched actual (1,200,000).
- For 'banned' the index did not let Postgres skip any table pages, since matching rows are spread across all pages. Seq Scan touches fewer pages, but timings overlap (71-170 ms vs 153-173 ms), so inconclusive with 2 runs each. Planner's estimated cost favored the bitmap plan (28,369 vs 43,870), so the estimate and the measurement may disagree; needs more trials to tell.
- Forced-plan settings (enable_indexscan/enable_bitmapscan off) are session-only diagnostics and were reset.

**Next precise action:** choose the next experiment (update/delete cost, `status` low-selectivity index, or `LIKE '%suffix'`) and answer the open question: why is writing slower with the index?
