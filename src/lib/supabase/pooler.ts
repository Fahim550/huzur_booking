/**
 * Supabase Connection Pooling & Supavisor Architecture Helper
 * 
 * SERVERLESS CONNECTION POOLING PRINCIPLE:
 * In serverless environments (Vercel Node.js & Edge functions), every function
 * invocation can run in a separate container. PostgreSQL maintains a hard
 * `max_connections` limit (e.g. 60-100 on standard tiers).
 * 
 * Direct connections (Port 5432, Session Mode) hold a database connection open
 * for the lifespan of the container. During a traffic burst (such as peak Waz
 * Mahfil season or Ramadan), hundreds of simultaneous requests trigger connection
 * exhaustion and HTTP 500 error cascades.
 * 
 * Supavisor in Transaction Mode (Port 6543):
 * Ties the Postgres backend connection ONLY for the duration of a single transaction
 * or query, instantly recycling it. Thousands of serverless instances can run
 * concurrently on a pool of 15-20 Postgres connections.
 */

export interface SupavisorConfig {
  connectionString: string;
  isTransactionMode: boolean;
  port: number;
  poolerHost: string;
}

export function getSupavisorConfig(): SupavisorConfig {
  const databaseUrl = process.env.DATABASE_URL || '';
  const isTransactionMode = databaseUrl.includes(':6543') || databaseUrl.includes('pgbouncer=true');
  const port = isTransactionMode ? 6543 : 5432;

  let poolerHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
  try {
    if (databaseUrl) {
      const parsed = new URL(databaseUrl.replace('postgres://', 'http://').replace('postgresql://', 'http://'));
      poolerHost = parsed.hostname;
    }
  } catch {
    // Fallback default
  }

  return {
    connectionString: databaseUrl,
    isTransactionMode,
    port,
    poolerHost,
  };
}

/**
 * Validates that serverless database connections do not bypass Supavisor transaction pooler.
 */
export function assertPoolerConfigured() {
  const config = getSupavisorConfig();
  if (process.env.NODE_ENV === 'production' && !config.isTransactionMode) {
    console.warn(
      '[Supavisor Warning]: DATABASE_URL is not using port 6543 (transaction mode). ' +
      'Serverless function concurrency may exceed Postgres connection limits.'
    );
  }
  return config;
}
