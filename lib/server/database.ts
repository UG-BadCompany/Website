import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { readConfig } from './config';

export type DbAdapterName = 'netlify_database' | 'postgres_url' | 'supabase_postgres';
export type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
};

export function detectDatabaseAdapter(env = process.env): DbAdapterName {
  if (env.NETLIFY_DATABASE_URL || env.NETLIFY_DATABASE_URL_UNPOOLED || env.NETLIFY) return 'netlify_database';
  if (env.SUPABASE_DB_URL || env.SUPABASE_URL) return 'supabase_postgres';
  return 'postgres_url';
}

export function createDatabase(env = process.env): Queryable {
  const config = readConfig(env);
  const connectionString = env.NETLIFY_DATABASE_URL || env.NETLIFY_DATABASE_URL_UNPOOLED || config.databaseUrl;
  const pool = new Pool({ connectionString });
  return {
    query: <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) =>
      pool.query<T>(text, params),
  };
}
