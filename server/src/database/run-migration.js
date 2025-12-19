import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in environment');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      join(__dirname, 'migrations/add-rate-limiting.sql'),
      'utf8'
    );

    console.log('Running rate limiting migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully');

    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('post_count', 'week_start', 'subscription_tier')
    `);

    console.log('\nAdded columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
