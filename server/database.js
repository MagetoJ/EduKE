const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { nowIso } = require('./utils');
const {
  SALT_ROUNDS,
  SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_PASSWORD
} = require('./config');

const DB_PATH = path.join(__dirname, 'eduke.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

const schemaPath = path.join(__dirname, '..', 'schema.sql');
try {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error executing schema:', err.message);
    } else {
      console.log('Database schema ensured.');
    }
  });
} catch (schemaError) {
  console.error('Failed to read schema.sql', schemaError);
}

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

const ensureSchemaUpgrades = async () => {
  try {
    const userColumns = await dbAll('PRAGMA table_info(users)');
    const columnNames = userColumns.map((column) => column.name);
    if (!columnNames.includes('is_verified')) {
      await dbRun('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0');
    }
    if (!columnNames.includes('email_verified_at')) {
      await dbRun('ALTER TABLE users ADD COLUMN email_verified_at TEXT');
    }

    await dbRun(
      `UPDATE users
       SET is_verified = 1,
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
       WHERE (is_verified IS NULL OR is_verified = 0)
         AND id NOT IN (SELECT user_id FROM email_verification_tokens)`
    );
  } catch (schemaUpgradeError) {
    console.error('Failed to ensure schema upgrades', schemaUpgradeError);
  }
};

const ensureSuperAdmin = async () => {
  try {
    const existing = await dbGet(
      'SELECT id, email FROM users WHERE role = ? ORDER BY id LIMIT 1',
      ['super_admin']
    );

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);

    if (existing) {
      await dbRun(
        'UPDATE users SET name = ?, email = ?, password_hash = ?, is_verified = 1, email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE id = ?',
        ['Super Admin', SUPER_ADMIN_USERNAME, passwordHash, existing.id]
      );
      return;
    }

    await dbRun(
      'INSERT INTO users (name, email, password_hash, role, is_verified, email_verified_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['Super Admin', SUPER_ADMIN_USERNAME, passwordHash, 'super_admin', 1, nowIso()]
    );
  } catch (superAdminError) {
    console.error('Failed to ensure super admin account', superAdminError);
  }
};

ensureSchemaUpgrades();
ensureSuperAdmin();

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};