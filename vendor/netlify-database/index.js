import pg from 'pg';

export function getConnectionString() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

export function getDatabase(options = {}) {
  const connectionString = options.connectionString || getConnectionString();
  if (!connectionString) {
    const error = new Error('NETLIFY_DATABASE_URL is not configured. Provision Netlify Database, then retry bootstrap.');
    return {
      sql: Object.assign(() => Promise.reject(error), {
        unsafe: () => Promise.reject(error),
        raw: (value) => ({ raw: String(value) }),
        identifier: (value) => ({ identifier: value }),
        values: (value) => ({ values: value }),
        default: { default: true }
      }),
      pool: { connect: () => Promise.reject(error), query: () => Promise.reject(error) }
    };
  }
  const pool = new pg.Pool({ connectionString });
  return {
    sql: Object.assign(() => Promise.reject(new Error('Tagged SQL is unavailable in the local @netlify/database shim. Use sql.unsafe().')), {
      unsafe: async (text, params = []) => (await pool.query(text, params)).rows,
      raw: (value) => ({ raw: String(value) }),
      identifier: (value) => ({ identifier: value }),
      values: (value) => ({ values: value }),
      default: { default: true }
    }),
    pool
  };
}

export const sql = (...args) => getDatabase().sql(...args);
export const pool = getDatabase().pool;
