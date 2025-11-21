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
const useProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.DATABASE_URL);

if (useProduction) {
  db = new Pool(getDbConfig());
} else {
  // Use SQLite for local development
  const dbPath = path.join(__dirname, '..', 'eduke.db');
  db = new sqlite3.Database(dbPath);
}

// Test connection
if (useProduction) {
  db.connect().then(client => {
    console.log('✓ Connected to PostgreSQL database');
    client.release();
  }).catch(err => {
    console.error('Unable to connect to PostgreSQL:', err);
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
          resolve(res);
        }
      });
    } else {
      if (text.trim().toUpperCase().startsWith('SELECT') || text.trim().toUpperCase().startsWith('PRAGMA')) {
        db.all(text, params, (err, rows) => {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      } else {
        db.run(text, params, function(err) {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            resolve({ rowCount: this.changes, lastID: this.lastID, rows: [] }); 
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
    return client;
  } else {
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
  if (!useProduction) {
     const result = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name=$1`, [tableName]);
     return result.rows.length > 0;
  }
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
    
    // Get table count
    let count = 0;
    if (useProduction) {
      const res = await query(`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`);
      count = parseInt(res.rows[0].count);
    } else {
      const res = await query(`SELECT count(*) as count FROM sqlite_master WHERE type='table'`);
      count = res.rows[0].count;
    }
    
    return {
      database: dbName,
      isProduction: useProduction,
      tableCount: count,
      config: useProduction ? 'Production (Render)' : 'Local SQLite'
    };
  } catch (error) {
    console.error('Error getting database info:', error);
    return { database: 'unknown', error: error.message };
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
