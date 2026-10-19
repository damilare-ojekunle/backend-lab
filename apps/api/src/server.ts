import pg from 'pg';
import { createApp } from './app.js';
import { databaseUrl } from './config.js';
import { assertLocalDatabase } from './runner.js';

const url = databaseUrl();
assertLocalDatabase(url);

const pool = new pg.Pool({ connectionString: url, max: 2 });
const port = Number(process.env.PORT ?? 3001);

// Bound to localhost only: this lab API can run benchmarks and must not be reachable from the network.
createApp(pool).listen(port, '127.0.0.1', () => {
  console.log(`Backend Lab API listening on http://127.0.0.1:${port}`);
});
