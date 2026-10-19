// Local lab database only (see docker-compose.yml). Override with DATABASE_URL.
export const DEFAULT_DATABASE_URL = 'postgres://lab:lab_local_only@127.0.0.1:5434/backend_lab';

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
