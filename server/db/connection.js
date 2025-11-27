const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const isProductionEnv = process.env.NODE_ENV === 'production'
  || process.env.RENDER === 'true'
  || process.env.RENDER === '1'
  || process.env.RAILWAY_ENVIRONMENT
  || process.env.FLY_APP_NAME
  || process.env.VERCEL === '1'
  || Boolean(process.env.DATABASE_URL);

const prefersSQLite = (() => {
  const type = (process.env.DB_TYPE || '').toLowerCase();
  if (type === 'sqlite' || type === 'sqlite3') {
    return true;
  }
  const flag = (process.env.USE_SQLITE || '').toLowerCase();
  return flag === 'true' || flag === '1';
})();

const hasPostgresConfig = Boolean(
  process.env.DATABASE_URL
    || process.env.DB_HOST
    || process.env.DB_NAME
    || process.env.DB_USER
    || process.env.DB_PASSWORD
);

const useSQLite = !isProductionEnv && (prefersSQLite || !hasPostgresConfig);

if (isProductionEnv && prefersSQLite) {
  console.warn('SQLite is disabled in production; using PostgreSQL instead.');
}

const getDbConfig = () => {
  if (process.env.DATABASE_URL) {
    const needsSsl = process.env.DATABASE_URL.includes('render.com');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : false
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'eduke_local',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };
};

if (!useSQLite && !hasPostgresConfig) {
  throw new Error('PostgreSQL configuration is required. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
}

let db;
if (useSQLite) {
  const dbPath = path.join(__dirname, '..', 'eduke.db');
  db = new sqlite3.Database(dbPath);
  console.log('✓ Using SQLite database for local development');
} else {
  db = new Pool(getDbConfig());
}

if (!useSQLite) {
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
}

const usingPostgres = !useSQLite;

const query = async (text, params) => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
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
      const statement = text.trim().toUpperCase();
      if (statement.startsWith('SELECT') || statement.startsWith('PRAGMA')) {
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

const getClient = async () => {
  if (usingPostgres) {
    const client = await db.connect();
    return client;
  }
  return db;
};

const transaction = async (callback) => {
  if (usingPostgres) {
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
  }
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
};

const tableExists = async (tableName) => {
  if (useSQLite) {
    const result = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
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

const getDatabaseInfo = async () => {
  try {
    let dbName = 'sqlite';
    let configLabel = 'Local SQLite';
    if (usingPostgres) {
      const config = getDbConfig();
      dbName = config.database || (config.connectionString ? 'production' : 'unknown');
      configLabel = config.connectionString ? 'PostgreSQL (URL)' : 'PostgreSQL (env)';
    }

    let count = 0;
    if (usingPostgres) {
      const res = await query(`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`);
      count = parseInt(res.rows[0].count);
    } else {
      const res = await query(`SELECT count(*) as count FROM sqlite_master WHERE type='table'`);
      count = res.rows[0].count;
    }

    return {
      database: dbName,
      isProduction: usingPostgres,
      tableCount: count,
      config: configLabel
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
