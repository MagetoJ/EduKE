const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const getDbConfig = () => {
  // If USE_PRODUCTION_DB is true or DATABASE_URL is set, use production
  if (process.env.USE_PRODUCTION_DB === 'true' || (process.env.DATABASE_URL && !process.env.DB_HOST)) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Render and most cloud providers
      }
    };
  }
  
  // Use local database configuration
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'eduke_local',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };
};

// Create connection pool
const pool = new Pool(getDbConfig());

// Test connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  // Monkey patch the query method to track queries
  client.query = (...args) => {
    return originalQuery(...args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };
  
  return client;
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Helper function to check if table exists
const tableExists = async (tableName) => {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
};

// Helper function to get database info
const getDatabaseInfo = async () => {
  try {
    const config = getDbConfig();
    const dbName = config.database || (config.connectionString ? 'production' : 'unknown');
    const isProduction = !!config.connectionString;
    
    // Get table count
    const tableCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    return {
      database: dbName,
      isProduction,
      tableCount: parseInt(tableCountResult.rows[0].count),
      config: isProduction ? 'Production (Render)' : 'Local PostgreSQL'
    };
  } catch (error) {
    console.error('Error getting database info:', error);
    return {
      database: 'unknown',
      error: error.message
    };
  }
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  tableExists,
  getDatabaseInfo
};
