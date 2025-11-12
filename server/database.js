const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

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
    if (!columnNames.includes('department')) {
      await dbRun('ALTER TABLE users ADD COLUMN department TEXT');
    }
    if (!columnNames.includes('class_assigned')) {
      await dbRun('ALTER TABLE users ADD COLUMN class_assigned TEXT');
    }
    if (!columnNames.includes('subject')) {
      await dbRun('ALTER TABLE users ADD COLUMN subject TEXT');
    }
    if (!columnNames.includes('status')) {
      await dbRun("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Active'");
    }
    if (!columnNames.includes('is_verified')) {
      await dbRun('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0');
    }
    if (!columnNames.includes('email_verified_at')) {
      await dbRun('ALTER TABLE users ADD COLUMN email_verified_at TEXT');
    }

    await dbRun(
      `UPDATE users
       SET is_verified = 1,
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           status = COALESCE(status, 'Active')
       WHERE (is_verified IS NULL OR is_verified = 0)
         AND id NOT IN (SELECT user_id FROM email_verification_tokens)`
    );

    const studentColumns = await dbAll('PRAGMA table_info(students)');
    const studentColumnNames = studentColumns.map((column) => column.name);
    if (!studentColumnNames.includes('class_section')) {
      await dbRun('ALTER TABLE students ADD COLUMN class_section TEXT');
    }
  } catch (schemaUpgradeError) {
    console.error('Failed to ensure schema upgrades', schemaUpgradeError);
  }
};

// Add the ensureSuperAdmin function
const ensureSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingAdmin = await dbGet(
      'SELECT * FROM users WHERE email = ?',
      ['jabez@edu.ke']
    );

    if (existingAdmin) {
      console.log('Super admin account already exists.');
      return;
    }

    // Create super admin if it doesn't exist
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await dbRun(
      'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
      ['Super Admin', 'jabez@edu.ke', hashedPassword, 1]
    );
    console.log('Super admin account created successfully.');
  } catch (error) {
    console.error('Failed to ensure super admin account', error);
  }
};

// Run schema upgrades and ensure super admin
ensureSchemaUpgrades();
ensureSuperAdmin();

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};