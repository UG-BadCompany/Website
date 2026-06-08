import postgres from 'postgres';

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
      pool: { connect: () => Promise.reject(error) }
    };
  }
  const sql = postgres(connectionString, { ssl: 'require', max: 3, idle_timeout: 20 });
  return {
    sql,
    pool: {
      async connect() {
        return {
          query(text, params) { return sql.unsafe(text, params || []); },
          release() {}
        };
      }
    }
  };
}

export const sql = (...args) => getDatabase().sql(...args);
export const pool = getDatabase().pool;
