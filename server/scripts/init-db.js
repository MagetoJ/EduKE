const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Get database configuration
const getDbConfig = () => {
  const useProduction = process.argv.includes('--production') ||
                        process.env.USE_PRODUCTION_DB === 'true';

  if (useProduction) {
    log('\n🌐 Using PRODUCTION database (Render)', colors.yellow);
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  log('\n💻 Using LOCAL SQLite database', colors.cyan);
  return path.join(__dirname, '..', 'eduke.db');
};

// Initialize database
async function initializeDatabase() {
  const useProduction = process.argv.includes('--production') ||
                        process.env.USE_PRODUCTION_DB === 'true';

  let db;
  if (useProduction) {
    const config = typeof getDbConfig() === 'string' ? { connectionString: getDbConfig() } : getDbConfig();
    db = new Pool(config);
    log('\n📊 Connecting to database...', colors.cyan);
    await db.query('SELECT NOW()');
    log('✓ Connected successfully!', colors.green);
  } else {
    const dbPath = getDbConfig();
    db = new sqlite3.Database(dbPath);
    log('\n📊 Opening SQLite database...', colors.cyan);
    log('✓ SQLite database opened successfully!', colors.green);
  }

  try {
    // Read schema file
    const schemaPath = useProduction
      ? path.join(__dirname, '../../database/schema.sql')
      : path.join(__dirname, '../../database/schema_sqlite.sql');
    log('\n📄 Reading schema file...', colors.cyan);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    log('✓ Schema file loaded', colors.green);

    // Execute schema
    log('\n🔨 Creating tables and indexes...', colors.cyan);
    if (useProduction) {
      await db.query(schema);
    } else {
      // For SQLite, execute statements one by one
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await new Promise((resolve, reject) => {
            db.run(statement.trim(), (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
    }
    log('✓ Database schema created successfully!', colors.green);
    
    // Check created tables
    let tablesResult;
    if (useProduction) {
      tablesResult = await db.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      log(`\n✓ Created ${tablesResult.rows.length} tables:`, colors.green);
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      tablesResult = await new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
      log(`\n✓ Created ${tablesResult.rows.length} tables:`, colors.green);
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.name}`);
      });
    }

    // Check subscription plans
    let plansResult;
    if (useProduction) {
      plansResult = await db.query('SELECT * FROM subscription_plans');
      log(`\n✓ Seeded ${plansResult.rows.length} subscription plans`, colors.green);
    } else {
      plansResult = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM subscription_plans', (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
      log(`\n✓ Seeded ${plansResult.rows.length} subscription plans`, colors.green);
    }
    
    log('\n🎉 Database initialization completed successfully!', colors.bright + colors.green);
    log('\nYou can now start the server with: npm start\n', colors.cyan);
    
  } catch (error) {
    log('\n❌ Error initializing database:', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    if (useProduction && db) {
      await db.end();
    } else if (!useProduction && db) {
      db.close();
    }
  }
}

// Run initialization
log('\n' + '='.repeat(60), colors.bright);
log('  EduKE Database Initialization', colors.bright + colors.cyan);
log('='.repeat(60) + '\n', colors.bright);

initializeDatabase().catch(err => {
  log('\n❌ Fatal error:', colors.red);
  console.error(err);
  process.exit(1);
});
