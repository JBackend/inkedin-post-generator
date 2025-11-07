import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Get PostgreSQL connection pool (lazy initialization)
 */
export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    console.log('✅ PostgreSQL connection pool created');
  }

  return pool;
}

/**
 * Query helper function
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} - Query result
 */
export async function query(text, params) {
  const pool = getPool();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message });
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Initialize database schema
 * Run this once to set up the database
 */
export async function initializeDatabase() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    await query(schema);
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
    throw error;
  }
}

/**
 * Close database connection pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
}
