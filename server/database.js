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

const dbType = (process.env.DB_TYPE || '').toLowerCase();
const prefersSQLite = dbType === 'sqlite' || dbType === 'sqlite3';

const hasPostgresConfig = Boolean(
  process.env.DATABASE_URL
    || process.env.DB_HOST
    || process.env.DB_NAME
    || process.env.DB_USER
    || process.env.DB_PASSWORD
);

const useSQLite = !isProductionEnv && prefersSQLite && !hasPostgresConfig;

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
let schemaInitialized = false;
let schemaInitializationPromise = null;

const initializeSchema = async () => {
  if (schemaInitialized) return Promise.resolve();
  if (schemaInitializationPromise) return schemaInitializationPromise;
  
  schemaInitializationPromise = (async () => {
    try {
      const schema = fs.readFileSync(schemaPath, 'utf-8').trim();
      if (usingPostgres) {
        const statements = schema.split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.match(/^\s*--/));
        
        console.log(`Executing ${statements.length} schema statements...`);
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          try {
            await db.query(statement);
          } catch (err) {
            // Ignore table/index already exists errors (42P07, 42P16)
            // Ignore duplicate key value errors (23505)
            // Ignore constraint errors (23514)
            if (err.code && (err.code === '42P07' || err.code === '42P16' || err.code === '23505' || err.code === '23514')) {
              continue;
            }
            console.error(`Schema error on statement ${i + 1}:`, err.message);
            console.error('Statement:', statement.substring(0, 150));
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

const ensureSchemaUpgrades = async () => {
  try {
    // Check if users table exists first
    let usersTableExists = false;
    if (usingPostgres) {
      const result = await dbAll(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        )
      `);
      usersTableExists = result && result[0] && result[0].exists === true;
    } else {
      const result = await dbAll(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`);
      usersTableExists = result && result.length > 0;
    }
    
    if (!usersTableExists) {
      console.warn('⚠ Users table does not exist yet. Schema initialization may still be in progress. Skipping upgrades.');
      return;
    }
    
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
      await dbRun("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
    }
    if (!userColumnNames.includes('is_verified')) {
      await dbRun('ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0');
    }
    if (!userColumnNames.includes('email_verified_at')) {
      await dbRun('ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP');
    }
    if (!userColumnNames.includes('must_change_password')) {
      if (usingPostgres) {
        await dbRun('ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false');
      } else {
        await dbRun('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0');
      }
    }

    if (usingPostgres) {
      await dbRun(
        `UPDATE users
         SET is_verified = TRUE,
             email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             status = COALESCE(status, 'active')
         WHERE (is_verified IS NULL OR is_verified = FALSE)
           AND id NOT IN (SELECT user_id FROM email_verification_tokens)`
      );
    } else {
      await dbRun(
        `UPDATE users
         SET is_verified = 1,
             email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
             status = COALESCE(status, 'active')
         WHERE (is_verified IS NULL OR is_verified = 0)
           AND id NOT IN (SELECT user_id FROM email_verification_tokens)`
      );
    }

    // Check if students table exists
    let studentsTableExists = false;
    if (usingPostgres) {
      const result = await dbAll(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'students'
        )
      `);
      studentsTableExists = result && result[0] && result[0].exists === true;
    } else {
      const result = await dbAll(`SELECT name FROM sqlite_master WHERE type='table' AND name='students'`);
      studentsTableExists = result && result.length > 0;
    }
    
    if (!studentsTableExists) {
      console.warn('⚠ Students table does not exist yet. Skipping student column upgrades.');
    } else {
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
    }

    // Check schools table columns
    let schoolsTableExists = false;
    if (usingPostgres) {
      const result = await dbAll(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schools'
        )
      `);
      schoolsTableExists = result && result[0] && result[0].exists === true;
    } else {
      const result = await dbAll(`SELECT name FROM sqlite_master WHERE type='table' AND name='schools'`);
      schoolsTableExists = result && result.length > 0;
    }
    
    if (schoolsTableExists) {
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
    }

    // Check if subscriptions table exists and create trigger (PostgreSQL only)
    if (usingPostgres) {
      try {
        const subscriptionsTable = await dbAll(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_name = 'subscriptions' AND table_schema = 'public'
        `);
        if (subscriptionsTable.length > 0) {
          // Create function
          await dbRun(`
            CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
          `);
          
          // Create trigger
          await dbRun(`
            DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions
          `);
          
          await dbRun(`
            CREATE TRIGGER subscriptions_updated_at
              BEFORE UPDATE ON subscriptions
              FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at()
          `);
        }
      } catch (triggerError) {
        console.warn('Warning: Could not create subscriptions trigger:', triggerError.message);
      }
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
      include_parent_portal: true,
      include_student_portal: true,
      include_messaging: true,
      include_finance: true,
      include_advanced_reports: true,
      include_leave_management: true,
      include_ai_analytics: true,
      is_trial: true
    },
    {
      name: 'Basic',
      slug: 'basic',
      description: 'Core academic operations for smaller schools.',
      student_limit: 100,
      staff_limit: 10,
      trial_duration_days: null,
      include_parent_portal: false,
      include_student_portal: false,
      include_messaging: false,
      include_finance: false,
      include_advanced_reports: false,
      include_leave_management: false,
      include_ai_analytics: false,
      is_trial: false
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'Comprehensive operations, finance, and engagement suite.',
      student_limit: null,
      staff_limit: null,
      trial_duration_days: null,
      include_parent_portal: true,
      include_student_portal: true,
      include_messaging: true,
      include_finance: true,
      include_advanced_reports: true,
      include_leave_management: true,
      include_ai_analytics: true,
      is_trial: false
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
               is_verified = ?,
               email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
               status = COALESCE(status, 'active')
         WHERE id = ?`,
        ['Super Admin', passwordHash, 'super_admin', true, existingAdmin.id]
      );
      return;
    }

    await dbRun(
      `INSERT INTO users (name, email, password_hash, role, is_verified, email_verified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Super Admin', normalizedEmail, passwordHash, 'super_admin', true, nowIso(), 'active']
    );
  } catch (error) {
    console.error('Failed to ensure super admin account', error);
  }
};

// Run schema upgrades and ensure baseline data
const initializeDatabase = async () => {
  try {
    // CRITICAL: Wait for base schema to be fully created first
    console.log('Waiting for schema initialization...');
    await schemaInitPromise;
    console.log('Schema initialization complete. Starting data setup...');
    
    // Only run upgrades after schema is guaranteed to exist
    await ensureSchemaUpgrades();
    console.log('✓ Schema upgrades complete');
    
    await ensureSubscriptionPlans();
    console.log('✓ Subscription plans configured');
    
    await ensureSuperAdmin();
    console.log('✓ Super admin account created');
    
    await ensureSchoolSubscriptions();
    console.log('✓ Database initialization complete!');
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    // Don't exit - allow server to start so we can debug
  }
};

// Initialize database asynchronously
initializeDatabase();

module.exports = {
  pool: db,
  dbRun,
  dbGet,
  dbAll
};