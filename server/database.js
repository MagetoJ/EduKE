const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { nowIso } = require('./utils');
const {
  SALT_ROUNDS,
  SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_PASSWORD,
  isProduction,
  USE_POSTGRES,
  USE_SQLITE
} = require('./config');

const usingPostgres = USE_POSTGRES;
const useSQLite = USE_SQLITE;

// Database configuration
const getDbConfig = () => {
  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;
    const sslConnectionString = connectionString.includes('?') ?
      connectionString + '&sslmode=require' :
      connectionString + '?sslmode=require';

    return {
      connectionString: sslConnectionString,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'eduke',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };
};

// Database connection
let db;
if (useSQLite) {
  const dbPath = path.join(__dirname, 'eduke.db');
  db = new sqlite3.Database(dbPath);
  console.log('✓ Using SQLite database for local development.');
} else {
  db = new Pool(getDbConfig());
  console.log('✓ Using PostgreSQL database.');
}

// Test connection
if (usingPostgres) {
  db.on('connect', () => {
    console.log('Connected to PostgreSQL database.');
  });

  db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
}

const schemaPath = useSQLite
  ? path.join(__dirname, '..', 'database', 'schema_sqlite.sql')
  : path.join(__dirname, '..', 'database', 'schema.sql');

let schemaInitialized = false;
let schemaInitializationPromise = null;

const initializeSchema = async () => {
  if (schemaInitialized) return Promise.resolve();
  if (schemaInitializationPromise) return schemaInitializationPromise;
  
  schemaInitializationPromise = (async () => {
    try {
      if (!fs.existsSync(schemaPath)) {
        console.error(`✗ Schema file not found: ${schemaPath}`);
        return;
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf-8').trim();
      if (usingPostgres) {
        const statements = schema
          .replace(/--.*$/gm, '') // Remove single-line comments
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        console.log(`Executing ${statements.length} schema statements...`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          try {
            await db.query(statement);
          } catch (err) {
            // Ignore table/index already exists errors
            if (err.code && (err.code === '42P07' || err.code === '42P16' || err.code === '23505' || err.code === '23514')) {
              continue;
            }
            console.error(`Schema error on statement ${i + 1}:`, err.message);
            throw err;
          }
        }
      } else {
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
      console.log('✓ Database schema successfully initialized.');
      schemaInitialized = true;
    } catch (schemaError) {
      console.error('✗ Failed to execute schema:', schemaError.message);
      schemaInitialized = false;
      throw schemaError;
    }
  })();
  
  return schemaInitializationPromise;
};

// Store the promise for waiting
const schemaInitPromise = initializeSchema();

const convertPlaceholders = (sql, isPostgres) => {
  if (!isPostgres) return sql;
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
};

const dbRun = async (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
      const convertedSql = convertPlaceholders(sql, true);
      db.query(convertedSql, params, (err, result) => {
        if (err) reject(err);
        else resolve({ lastID: result.rows.length > 0 ? result.rows[0].id : null, changes: result.rowCount });
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
};

const dbGet = async (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
      const convertedSql = convertPlaceholders(sql, true);
      db.query(convertedSql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result.rows[0] || null);
      });
    } else {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    }
  });
};

const dbAll = async (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
      const convertedSql = convertPlaceholders(sql, true);
      db.query(convertedSql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result.rows);
      });
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
};

const query = async (text, params = []) => {
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
      const convertedSql = convertPlaceholders(text, true);
      db.query(convertedSql, params, (err, res) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          resolve(res);
        }
      });
    } else {
      const sqliteText = text.replace(/\s+RETURNING\s+\*/gi, '').replace(/\$\d+/g, '?');
      const statement = sqliteText.trim().toUpperCase();
      
      if (statement.startsWith('SELECT') || statement.startsWith('PRAGMA')) {
        db.all(sqliteText, params, (err, rows) => {
          if (err) {
            console.error('Query error:', err);
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      } else {
        db.run(sqliteText, params, function(err) {
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
    db.serialize(async () => {
      db.run('BEGIN TRANSACTION', async (err) => {
        if (err) return reject(err);
        try {
          const result = await callback(db);
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              db.run('ROLLBACK');
              return reject(commitErr);
            }
            resolve(result);
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  });
};

const tableExists = async (tableName) => {
  if (useSQLite) {
    const result = await dbAll(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
    return result.length > 0;
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

const ensureSchemaUpgrades = async () => {
  try {
    const usersExist = await tableExists('users');
    if (!usersExist) return;

    // Use query helper for upgrades
    const userColumns = usingPostgres 
      ? (await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).rows.map(c => c.column_name)
      : (await query("PRAGMA table_info(users)")).rows.map(c => c.name);

    const upgrades = [
      { col: 'department', type: 'TEXT' },
      { col: 'class_assigned', type: 'TEXT' },
      { col: 'subject', type: 'TEXT' },
      { col: 'status', type: 'TEXT', default: "'active'" },
      { col: 'is_verified', type: 'INTEGER', default: '0' },
      { col: 'email_verified_at', type: 'TIMESTAMP' },
      { col: 'must_change_password', type: usingPostgres ? 'BOOLEAN' : 'INTEGER', default: usingPostgres ? 'false' : '0' },
      { col: 'mfa_enabled', type: usingPostgres ? 'BOOLEAN' : 'INTEGER', default: usingPostgres ? 'false' : '0' },
      { col: 'mfa_secret', type: 'TEXT' },
      { col: 'failed_login_attempts', type: 'INTEGER', default: '0' },
      { col: 'last_failed_login_at', type: 'TIMESTAMP' },
      { col: 'account_locked_until', type: 'TIMESTAMP' }
    ];

    for (const up of upgrades) {
      if (!userColumns.includes(up.col)) {
        let sql = `ALTER TABLE users ADD COLUMN ${up.col} ${up.type}`;
        if (up.default !== undefined) sql += ` DEFAULT ${up.default}`;
        await dbRun(sql);
      }
    }
  } catch (err) {
    console.error('Failed to ensure schema upgrades:', err);
  }
};

const ensureSubscriptionPlans = async () => {
  const plans = [
    { name: 'Trial', slug: 'trial', student_limit: 25, staff_limit: 5, trial_duration_days: 14, is_trial: true },
    { name: 'Basic', slug: 'basic', student_limit: 100, staff_limit: 10, is_trial: false },
    { name: 'Pro', slug: 'pro', student_limit: null, staff_limit: null, is_trial: false }
  ];

  for (const plan of plans) {
    const existing = await dbGet('SELECT id FROM subscription_plans WHERE slug = ?', [plan.slug]);
    if (!existing) {
      await dbRun(
        `INSERT INTO subscription_plans (name, slug, student_limit, staff_limit, trial_duration_days, is_trial) VALUES (?, ?, ?, ?, ?, ?)`,
        [plan.name, plan.slug, plan.student_limit, plan.staff_limit, plan.trial_duration_days || null, plan.is_trial]
      );
    }
  }
};

const ensureSuperAdmin = async () => {
  try {
    const email = SUPER_ADMIN_USERNAME.trim().toLowerCase();
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);

    if (existing) {
      await dbRun(
        `UPDATE users SET password_hash = ?, role = 'super_admin', is_verified = 1, status = 'active' WHERE id = ?`,
        [hash, existing.id]
      );
    } else {
      await dbRun(
        `INSERT INTO users (name, email, password_hash, role, is_verified, status, email_verified_at) VALUES (?, ?, ?, ?, 1, 'active', ?)`,
        ['Super Admin', email, hash, 'super_admin', nowIso()]
      );
    }
  } catch (err) {
    console.error('Failed to ensure super admin:', err);
  }
};

const initializeDatabase = async () => {
  try {
    await schemaInitPromise;
    await ensureSchemaUpgrades();
    await ensureSubscriptionPlans();
    await ensureSuperAdmin();
    console.log('✓ Database initialization complete!');
  } catch (error) {
    console.error('✗ Database initialization error:', error);
  }
};

initializeDatabase();

module.exports = {
  pool: db,
  dbRun,
  dbGet,
  dbAll,
  query,
  getClient,
  transaction,
  tableExists,
  initializeDatabase,
  getDatabaseInfo: async () => {
    try {
      let count = 0;
      if (usingPostgres) {
        const res = await query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
        count = parseInt(res.rows[0].count);
      } else {
        const res = await query("SELECT count(*) as count FROM sqlite_master WHERE type='table'");
        count = res.rows[0].count;
      }
      return {
        database: usingPostgres ? 'PostgreSQL' : 'SQLite',
        tableCount: count,
        config: usingPostgres ? 'PostgreSQL (Unified)' : 'SQLite (Unified)'
      };
    } catch (e) {
      return { database: 'error', error: e.message };
    }
  }
};
