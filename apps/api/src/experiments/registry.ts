// The server owns all SQL. The browser only ever sends an experiment id and a number of trials.
// Table names below are fixed constants from this file, never taken from a request.

export type Condition = {
  id: string;
  label: string;
  table: string;
  /** Session-only diagnostic: forbid index and bitmap scans so we can measure a seq scan. */
  forceSeqScan?: boolean;
};

export type Experiment = {
  id: string;
  title: string;
  description: string;
  conditions: Condition[];
  buildSql: (table: string) => string;
};

export const experiments: Experiment[] = [
  {
    id: 'email-lookup',
    title: 'Email lookup (1 row in 2M)',
    description:
      'Finds one user by email. users_noidx has no email index; users_idx is identical data with one.',
    conditions: [
      { id: 'without-index', label: 'Without email index', table: 'users_noidx' },
      { id: 'with-index', label: 'With email index', table: 'users_idx' },
    ],
    buildSql: (table) => `SELECT * FROM ${table} WHERE email = 'user1500000@contoso.com'`,
  },
  {
    id: 'status-banned',
    title: "Status = 'banned' (about 20% of rows)",
    description:
      'Same query on the same table: the planner free to use idx_users_status versus a forced sequential scan.',
    conditions: [
      { id: 'planner-choice', label: 'Planner choice (index allowed)', table: 'users' },
      { id: 'forced-seq-scan', label: 'Forced seq scan', table: 'users', forceSeqScan: true },
    ],
    buildSql: (table) => `SELECT * FROM ${table} WHERE status = 'banned'`,
  },
  {
    id: 'status-active',
    title: "Status = 'active' (about 60% of rows)",
    description:
      'Low selectivity: most of the table matches, so an index should not help.',
    conditions: [
      { id: 'planner-choice', label: 'Planner choice (index allowed)', table: 'users' },
      { id: 'forced-seq-scan', label: 'Forced seq scan', table: 'users', forceSeqScan: true },
    ],
    buildSql: (table) => `SELECT * FROM ${table} WHERE status = 'active'`,
  },
];

export function findExperiment(id: string): Experiment | undefined {
  return experiments.find((e) => e.id === id);
}
