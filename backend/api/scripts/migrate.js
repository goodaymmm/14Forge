const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'lol_stats',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Migrations directory
const migrationsDir = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

// Create migrations tracking table if it doesn't exist
async function createMigrationsTable() {
  try {
    // First, check if migrations table exists with wrong schema
    const tableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'migrations'
    `);
    
    if (tableCheck.rows.length > 0) {
      // Check if it has the filename column
      const hasFilename = tableCheck.rows.some(row => row.column_name === 'filename');
      
      if (!hasFilename) {
        console.log('⚠ Existing migrations table has incorrect schema. Dropping and recreating...');
        await pool.query('DROP TABLE IF EXISTS migrations CASCADE');
      }
    }
    
    // Create the table with correct schema
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(query);
    console.log('✓ Migrations table ready');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

// Get list of executed migrations
async function getExecutedMigrations() {
  try {
    const result = await pool.query('SELECT filename FROM migrations ORDER BY filename');
    return result.rows.map(row => row.filename);
  } catch (error) {
    console.error('Error fetching executed migrations:', error);
    return [];
  }
}

// Execute a single migration file
async function executeMigration(filename) {
  const filepath = path.join(migrationsDir, filename);
  
  try {
    // Read SQL file
    const sql = fs.readFileSync(filepath, 'utf8');
    
    console.log(`\nExecuting migration: ${filename}`);
    
    // Begin transaction
    await pool.query('BEGIN');
    
    try {
      // Execute the SQL
      await pool.query(sql);
      
      // Record the migration
      await pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      // Commit transaction
      await pool.query('COMMIT');
      
      console.log(`✓ Migration ${filename} executed successfully`);
      return true;
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error(`✗ Error executing migration ${filename}:`, error.message);
    return false;
  }
}

// Main migration function
async function runMigrations() {
  console.log('Starting database migrations...\n');
  console.log('Database configuration:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'lol_stats'}`);
  console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
  console.log('');
  
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful\n');
    
    // Create migrations table if needed
    await createMigrationsTable();
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log(`Migrations directory not found: ${migrationsDir}`);
      console.log('Creating directory...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Get list of migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (files.length === 0) {
      console.log('No migration files found.');
      process.exit(0);
    }
    
    console.log(`Found ${files.length} migration file(s)\n`);
    
    // Get already executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`Already executed: ${executedMigrations.length} migration(s)\n`);
    
    // Filter out already executed migrations
    const pendingMigrations = files.filter(file => !executedMigrations.includes(file));
    
    if (pendingMigrations.length === 0) {
      console.log('All migrations are up to date!');
      process.exit(0);
    }
    
    console.log(`Pending migrations: ${pendingMigrations.length}`);
    pendingMigrations.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    // Execute pending migrations
    let successCount = 0;
    let failCount = 0;
    
    for (const file of pendingMigrations) {
      const success = await executeMigration(file);
      if (success) {
        successCount++;
      } else {
        failCount++;
        // Stop on first failure
        break;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Migration Summary:');
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${failCount}`);
    console.log(`  Total: ${pendingMigrations.length}`);
    console.log('='.repeat(50));
    
    if (failCount > 0) {
      console.error('\n⚠ Some migrations failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n✓ All migrations completed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});