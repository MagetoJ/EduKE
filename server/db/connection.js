const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database configuration
const getDbConfig = () => {
  // If DATABASE_URL is set, use it (for Render database)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
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

// Create connection
let db;
const useProduction = process.env.USE_PRODUCTION_DB === 'true';

if (useProduction) {
  db = new Pool(getDbConfig());
} else {
  // Use SQLite for local development
  const dbPath = path.join(__dirname, '..', 'eduke.db');
  db = new sqlite3.Database(dbPath);
}

// Test connection
if (useProduction) {
  db.on('connect', () => {
    console.log('✓ Connected to PostgreSQL database');
  });

  db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
} else {
  console.log('✓ Using SQLite database for local development');
}

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    if (useProduction) {
      db.query(text, params, (err, res) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          const duration = Date.now() - start;
          console.log('Executed query', { text, duration, rows: res.rowCount });
          resolve(res);
        }
      });
    } else {
      // For SQLite, use appropriate method based on query type
      if (text.trim().toUpperCase().startsWith('SELECT') || text.trim().toUpperCase().startsWith('PRAGMA')) {
        db.all(text, params, (err, rows) => {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: rows.length });
            resolve({ rows });
          }
        });
      } else {
        db.run(text, params, function(err) {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: this.changes });
            resolve({ rowCount: this.changes, lastID: this.lastID });
          }
        });
      }
    }
  });
};

// Helper function to get a client from the pool
const getClient = async () => {
  if (useProduction) {
    const client = await db.connect();
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
  } else {
    // For SQLite, just return the database instance
    return db;
  }
};

// Transaction helper
const transaction = async (callback) => {
  if (useProduction) {
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
  } else {
    // For SQLite, transactions are simpler
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        try {
          const result = callback(db);
          db.run('COMMIT');
          resolve(result);
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
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
  pool: db,
  query,
  getClient,
  transaction,
  tableExists,
  getDatabaseInfo
};
