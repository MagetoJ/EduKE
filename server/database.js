const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { nowIso } = require('./utils');
const {
  SALT_ROUNDS,
  SUPER_ADMIN_USERNAME,
  SUPER_ADMIN_PASSWORD
} = require('./config');

const isProductionEnv = process.env.NODE_ENV === 'production'
  || process.env.RENDER === 'true'
  || process.env.RENDER === '1'
  || process.env.RAILWAY_ENVIRONMENT
  || process.env.FLY_APP_NAME
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
if (!useSQLite && !hasPostgresConfig) {
  throw new Error('PostgreSQL configuration is required. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.');
}

let db;
if (useSQLite) {
  const dbPath = path.join(__dirname, 'eduke.db');
  db = new sqlite3.Database(dbPath);
  console.log('Using SQLite database for local development.');
} else {
  db = new Pool(getDbConfig());
}

// Test connection
if (!useSQLite) {
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
const usingPostgres = !useSQLite;
const initializeSchema = async () => {
  try {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    if (usingPostgres) {
      await db.query(schema);
    } else {
      // For SQLite, we need to execute statements one by one
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
    console.log('Database schema ensured.');
  } catch (schemaError) {
    console.error('Failed to execute schema:', schemaError);
  }
};

// Initialize schema on startup
initializeSchema();

const dbRun = async (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (usingPostgres) {
      db.query(sql, params, (err, result) => {
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
      db.query(sql, params, (err, result) => {
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
      db.query(sql, params, (err, result) => {
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

const ensureSchemaUpgrades = async () => {
  try {
    // Check users table columns
    let userColumnNames = [];
    if (usingPostgres) {
      const userColumns = await dbAll(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = 'public'
      `);
      userColumnNames = userColumns.map((column) => column.column_name);
    } else {
      // For SQLite, use PRAGMA table_info
      const userColumns = await dbAll(`PRAGMA table_info(users)`);
      userColumnNames = userColumns.map((column) => column.name);
    }

    if (!userColumnNames.includes('department')) {
      await dbRun('ALTER TABLE users ADD COLUMN department TEXT');
    }
    if (!userColumnNames.includes('class_assigned')) {
      await dbRun('ALTER TABLE users ADD COLUMN class_assigned TEXT');
    }
    if (!userColumnNames.includes('subject')) {
      await dbRun('ALTER TABLE users ADD COLUMN subject TEXT');
    }
    if (!userColumnNames.includes('status')) {
      await dbRun("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Active'");
    }
    if (!userColumnNames.includes('is_verified')) {
      await dbRun('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0');
    }
    if (!userColumnNames.includes('email_verified_at')) {
      await dbRun('ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP');
    }

    await dbRun(
      `UPDATE users
       SET is_verified = 1,
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           status = COALESCE(status, 'Active')
       WHERE (is_verified IS NULL OR is_verified = 0)
         AND id NOT IN (SELECT user_id FROM email_verification_tokens)`
    );

    // Check students table columns
    let studentColumnNames = [];
    if (usingPostgres) {
      const studentColumns = await dbAll(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'students' AND table_schema = 'public'
      `);
      studentColumnNames = studentColumns.map((column) => column.column_name);
    } else {
      const studentColumns = await dbAll(`PRAGMA table_info(students)`);
      studentColumnNames = studentColumns.map((column) => column.name);
    }
    if (!studentColumnNames.includes('class_section')) {
      await dbRun('ALTER TABLE students ADD COLUMN class_section TEXT');
    }

    // Check schools table columns
    let schoolColumnNames = [];
    if (usingPostgres) {
      const schoolColumns = await dbAll(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'schools' AND table_schema = 'public'
      `);
      schoolColumnNames = schoolColumns.map((column) => column.column_name);
    } else {
      const schoolColumns = await dbAll(`PRAGMA table_info(schools)`);
      schoolColumnNames = schoolColumns.map((column) => column.name);
    }
    if (!schoolColumnNames.includes('primary_color')) {
      await dbRun('ALTER TABLE schools ADD COLUMN primary_color TEXT');
    }
    if (!schoolColumnNames.includes('accent_color')) {
      await dbRun('ALTER TABLE schools ADD COLUMN accent_color TEXT');
    }
    if (!schoolColumnNames.includes('grade_levels')) {
      await dbRun('ALTER TABLE schools ADD COLUMN grade_levels TEXT');
    }

    // Check if subscriptions table exists and create trigger
    const subscriptionsTable = await dbAll(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'subscriptions' AND table_schema = 'public'
    `);
    if (subscriptionsTable.length > 0) {
      await dbRun(`
        CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
          BEFORE UPDATE ON subscriptions
          FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();
      `);
    }
  } catch (schemaUpgradeError) {
    console.error('Failed to ensure schema upgrades', schemaUpgradeError);
  }
};

const ensureSubscriptionPlans = async () => {
  const plans = [
    {
      name: 'Trial',
      slug: 'trial',
      description: 'Full access for evaluation with limited usage.',
      student_limit: 25,
      staff_limit: 5,
      trial_duration_days: 14,
      include_parent_portal: 1,
      include_student_portal: 1,
      include_messaging: 1,
      include_finance: 1,
      include_advanced_reports: 1,
      include_leave_management: 1,
      include_ai_analytics: 1,
      is_trial: 1
    },
    {
      name: 'Basic',
      slug: 'basic',
      description: 'Core academic operations for smaller schools.',
      student_limit: 100,
      staff_limit: 10,
      trial_duration_days: null,
      include_parent_portal: 0,
      include_student_portal: 0,
      include_messaging: 0,
      include_finance: 0,
      include_advanced_reports: 0,
      include_leave_management: 0,
      include_ai_analytics: 0,
      is_trial: 0
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'Comprehensive operations, finance, and engagement suite.',
      student_limit: null,
      staff_limit: null,
      trial_duration_days: null,
      include_parent_portal: 1,
      include_student_portal: 1,
      include_messaging: 1,
      include_finance: 1,
      include_advanced_reports: 1,
      include_leave_management: 1,
      include_ai_analytics: 1,
      is_trial: 0
    }
  ];

  for (const plan of plans) {
    const existingPlan = await dbGet('SELECT id FROM subscription_plans WHERE slug = ?', [plan.slug]);
    if (existingPlan) {
      await dbRun(
        `UPDATE subscription_plans
           SET name = ?,
               description = ?,
               student_limit = ?,
               staff_limit = ?,
               trial_duration_days = ?,
               include_parent_portal = ?,
               include_student_portal = ?,
               include_messaging = ?,
               include_finance = ?,
               include_advanced_reports = ?,
               include_leave_management = ?,
               include_ai_analytics = ?,
               is_trial = ?
         WHERE id = ?`,
        [
          plan.name,
          plan.description,
          plan.student_limit,
          plan.staff_limit,
          plan.trial_duration_days,
          plan.include_parent_portal,
          plan.include_student_portal,
          plan.include_messaging,
          plan.include_finance,
          plan.include_advanced_reports,
          plan.include_leave_management,
          plan.include_ai_analytics,
          plan.is_trial,
          existingPlan.id
        ]
      );
      continue;
    }

    await dbRun(
      `INSERT INTO subscription_plans (
         name,
         slug,
         description,
         student_limit,
         staff_limit,
         trial_duration_days,
         include_parent_portal,
         include_student_portal,
         include_messaging,
         include_finance,
         include_advanced_reports,
         include_leave_management,
         include_ai_analytics,
         is_trial
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.name,
        plan.slug,
        plan.description,
        plan.student_limit,
        plan.staff_limit,
        plan.trial_duration_days,
        plan.include_parent_portal,
        plan.include_student_portal,
        plan.include_messaging,
        plan.include_finance,
        plan.include_advanced_reports,
        plan.include_leave_management,
        plan.include_ai_analytics,
        plan.is_trial
      ]
    );
  }
};

const ensureSchoolSubscriptions = async () => {
  try {
    const trialPlan = await dbGet(
      'SELECT id, trial_duration_days FROM subscription_plans WHERE slug = ? LIMIT 1',
      ['trial']
    );
    if (!trialPlan) {
      return;
    }

    const schoolsWithoutSubscriptions = await dbAll(
      `SELECT s.id, s.created_at
         FROM schools s
         LEFT JOIN subscriptions sub ON sub.school_id = s.id
         WHERE sub.id IS NULL`
    );

    for (const school of schoolsWithoutSubscriptions) {
      const startDate = nowIso();
      const trialEnds =
        typeof trialPlan.trial_duration_days === 'number'
          ? new Date(Date.now() + trialPlan.trial_duration_days * 86400000).toISOString()
          : null;

      await dbRun(
        `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
         VALUES (?, ?, ?, ?, ?)`
          ,
        [school.id, trialPlan.id, 'active', startDate, trialEnds]
      );
    }
  } catch (subscriptionError) {
    console.error('Failed to ensure school subscriptions', subscriptionError);
  }
};

const ensureSuperAdmin = async () => {
  try {
    const normalizedEmail = SUPER_ADMIN_USERNAME.trim().toLowerCase();
    const existingAdmin = await dbGet(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);

    if (existingAdmin) {
      await dbRun(
        `UPDATE users
           SET name = ?,
               password_hash = ?,
               role = ?,
               is_verified = 1,
               email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
               status = COALESCE(status, 'Active')
         WHERE id = ?`,
        ['Super Admin', passwordHash, 'super_admin', existingAdmin.id]
      );
      return;
    }

    await dbRun(
      `INSERT INTO users (name, email, password_hash, role, is_verified, email_verified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Super Admin', normalizedEmail, passwordHash, 'super_admin', 1, nowIso(), 'Active']
    );
  } catch (error) {
    console.error('Failed to ensure super admin account', error);
  }
};

// Run schema upgrades and ensure baseline data
const initializeDatabase = async () => {
  // Schema is already initialized at module level
  await ensureSchemaUpgrades();
  await ensureSubscriptionPlans();
  await ensureSuperAdmin();
  await ensureSchoolSubscriptions();
};

initializeDatabase().catch((error) => {
  console.error('Database initialization error', error);
});

module.exports = {
  pool: db,
  dbRun,
  dbGet,
  dbAll
};