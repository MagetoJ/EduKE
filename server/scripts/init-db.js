const fs = require('fs');
const path = require('path');
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
  
  log('\n💻 Using LOCAL database', colors.cyan);
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'eduke_local',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };
};

// Initialize database
async function initializeDatabase() {
  const config = getDbConfig();
  const pool = new Pool(config);
  
  try {
    log('\n📊 Connecting to database...', colors.cyan);
    await pool.query('SELECT NOW()');
    log('✓ Connected successfully!', colors.green);
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    log('\n📄 Reading schema file...', colors.cyan);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    log('✓ Schema file loaded', colors.green);
    
    // Execute schema
    log('\n🔨 Creating tables and indexes...', colors.cyan);
    await pool.query(schema);
    log('✓ Database schema created successfully!', colors.green);
    
    // Check created tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    log(`\n✓ Created ${tablesResult.rows.length} tables:`, colors.green);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check subscription plans
    const plansResult = await pool.query('SELECT * FROM subscription_plans');
    log(`\n✓ Seeded ${plansResult.rows.length} subscription plans`, colors.green);
    
    log('\n🎉 Database initialization completed successfully!', colors.bright + colors.green);
    log('\nYou can now start the server with: npm start\n', colors.cyan);
    
  } catch (error) {
    log('\n❌ Error initializing database:', colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
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
