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

    const schoolColumns = await dbAll('PRAGMA table_info(schools)');
    const schoolColumnNames = schoolColumns.map((column) => column.name);
    if (!schoolColumnNames.includes('primary_color')) {
      await dbRun('ALTER TABLE schools ADD COLUMN primary_color TEXT');
    }
    if (!schoolColumnNames.includes('accent_color')) {
      await dbRun('ALTER TABLE schools ADD COLUMN accent_color TEXT');
    }
    if (!schoolColumnNames.includes('grade_levels')) {
      await dbRun('ALTER TABLE schools ADD COLUMN grade_levels TEXT');
    }

    const subscriptionsTable = await dbAll(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'subscriptions'"
    );
    if (subscriptionsTable.length > 0) {
      await dbRun(
        `CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at
           AFTER UPDATE ON subscriptions
           BEGIN
             UPDATE subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
           END`
      );
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
  await ensureSchemaUpgrades();
  await ensureSubscriptionPlans();
  await ensureSuperAdmin();
  await ensureSchoolSubscriptions();
};

initializeDatabase().catch((error) => {
  console.error('Database initialization error', error);
});

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll
};