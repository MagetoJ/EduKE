const express = require('express');
const bcrypt = require('bcrypt');
const {
  SALT_ROUNDS,
  PROMOTION_THRESHOLD,
  DEFAULT_CURRICULUM
} = require('../config');
const {
  nowIso,
  getNextGrade,
  getMonthName
} = require('../utils');
const { query } = require('../db/connection');

const router = express.Router();

const PLAN_FEATURE_FLAGS = {
  parentPortal: 'include_parent_portal',
  studentPortal: 'include_student_portal',
  messaging: 'include_messaging',
  finance: 'include_finance',
  advancedReports: 'include_advanced_reports',
  leaveManagement: 'include_leave_management',
  aiAnalytics: 'include_ai_analytics'
};

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused', 'Not Marked'];
const VALID_ATTENDANCE_STATUSES = new Set(ATTENDANCE_STATUSES);

const normalizeDateOnly = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().split('T')[0];
};

// UPDATED: dbAll -> query, ? -> $1...
const getAttendanceRoster = async ({ schoolId, classSection, date }) => {
  let querySql = `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.grade,
      s.class_section,
      a.status AS attendance_status,
      a.recorded_at
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.date = $1
    WHERE s.school_id = $2
  `;
  const params = [date, schoolId];
  if (classSection) {
    querySql += ' AND s.class_section = $3';
    params.push(classSection);
  }
  querySql += ' ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC';
  const result = await query(querySql, params);
  return result.rows;
};

const formatAttendanceRows = (rows) =>
  rows.map((row) => {
    const firstName = row.first_name ?? '';
    const lastName = row.last_name ?? '';
    return {
      id: String(row.id),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      grade: row.grade,
      classSection: row.class_section,
      status: row.attendance_status ?? 'Not Marked',
      recordedAt: row.recorded_at
    };
  });

const formatCourseResourceRow = (row) => ({
  id: String(row.id),
  courseId: String(row.course_id),
  title: row.title,
  description: row.description,
  type: row.resource_type,
  url: row.url,
  createdAt: row.created_at,
  createdBy: row.created_by
    ? {
        id: String(row.created_by),
        name: row.created_by_name ?? null
      }
    : null
});

// UPDATED: dbGet -> query(...).rows[0]
const getCourseForAccess = async (courseId) =>
  (await query(
    'SELECT id, school_id, teacher_id FROM courses WHERE id = $1 LIMIT 1',
    [courseId]
  )).rows[0];

const parseGradeLevels = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  } catch (error) {
    return [];
  }
  return [];
};

const serializeGradeLevels = (levels) => {
  if (!Array.isArray(levels)) {
    return JSON.stringify([]);
  }
  const normalized = levels
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return JSON.stringify(normalized);
};

// UPDATED: dbGet -> query(...).rows[0]
const fetchSubscriptionForSchool = async (schoolId) => {
  if (!schoolId) {
    return null;
  }
  const row = (await query(
    `SELECT
       sub.id AS subscription_id,
       sub.school_id,
       sub.plan_id,
       sub.status,
       sub.start_date,
       sub.end_date,
       sub.trial_ends_at,
       sub.created_at AS subscription_created_at,
       sub.updated_at AS subscription_updated_at,
       sp.name AS plan_name,
       sp.slug AS plan_slug,
       sp.description AS plan_description,
       sp.student_limit,
       sp.staff_limit,
       sp.trial_duration_days,
       sp.include_parent_portal,
       sp.include_student_portal,
       sp.include_messaging,
       sp.include_finance,
       sp.include_advanced_reports,
       sp.include_leave_management,
       sp.include_ai_analytics,
       sp.is_trial
     FROM subscriptions sub
     JOIN subscription_plans sp ON sp.id = sub.plan_id
     WHERE sub.school_id = $1
     LIMIT 1`,
    [schoolId]
  )).rows[0];

  if (!row) {
    return null;
  }

  const features = Object.entries(PLAN_FEATURE_FLAGS).reduce((acc, [key, column]) => {
    acc[key] = Number(row[column]) === 1;
    return acc;
  }, {});

  return {
    id: row.subscription_id,
    schoolId: row.school_id,
    planId: row.plan_id,
    planName: row.plan_name,
    planSlug: row.plan_slug,
    planDescription: row.plan_description,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    trialEndsAt: row.trial_ends_at,
    trialDurationDays: row.trial_duration_days,
    studentLimit: typeof row.student_limit === 'number' ? row.student_limit : null,
    staffLimit: typeof row.staff_limit === 'number' ? row.staff_limit : null,
    isTrialPlan: Number(row.is_trial) === 1,
    features,
    createdAt: row.subscription_created_at,
    updatedAt: row.subscription_updated_at
  };
};

const hasPlanFeature = (subscription, featureKey) => {
  if (!subscription) {
    return false;
  }
  const column = PLAN_FEATURE_FLAGS[featureKey];
  if (!column) {
    return true;
  }
  return Boolean(subscription.features?.[featureKey]);
};

// UPDATED: dbGet -> query(...).rows[0]
const usageWithinLimit = async (subscription, { type }) => {
  if (!subscription) {
    return { allowed: false, reason: 'Subscription not found for school.' };
  }

  if (type === 'student' && typeof subscription.studentLimit === 'number') {
    const row = (await query(
      'SELECT COUNT(*) AS count FROM students WHERE school_id = $1 AND status != $2',
      [subscription.schoolId, 'Archived']
    )).rows[0];
    if (Number(row?.count || 0) >= subscription.studentLimit) {
      return {
        allowed: false,
        reason: 'Student limit reached for current subscription plan.'
      };
    }
  }

  if (type === 'staff' && typeof subscription.staffLimit === 'number') {
    const row = (await query(
      `SELECT COUNT(*) AS count
         FROM users
         WHERE school_id = $1
           AND "role" NOT IN ('student', 'parent', 'super_admin')
           AND status != $2`,
      [subscription.schoolId, 'Archived']
    )).rows[0];
    if (Number(row?.count || 0) >= subscription.staffLimit) {
      return {
        allowed: false,
        reason: 'Staff limit reached for current subscription plan.'
      };
    }
  }

  return { allowed: true };
};

const requireFeature = async (req, res, featureKey) => {
  if (req.user.role === 'super_admin') {
    return true;
  }
  const subscription = await fetchSubscriptionForSchool(req.user.schoolId);
  if (!subscription) {
    res.status(403).json({ error: 'Subscription not found for school.' });
    return false;
  }
  if (!hasPlanFeature(subscription, featureKey)) {
    res.status(403).json({ error: 'Feature not available on current subscription plan.' });
    return false;
  }
  req.subscription = subscription;
  return true;
};

const ensureSubscriptionLoaded = async (req) => {
  if (req.subscription) {
    return req.subscription;
  }
  if (!req.user.schoolId) {
    return null;
  }
  const subscription = await fetchSubscriptionForSchool(req.user.schoolId);
  if (subscription) {
    req.subscription = subscription;
  }
  return subscription;
};

// UPDATED: dbGet, dbRun, lastID
const assignDefaultSubscription = async (schoolId) => {
  if (!schoolId) {
    return null;
  }
  const existing = (await query('SELECT id FROM subscriptions WHERE school_id = $1 LIMIT 1', [schoolId])).rows[0];
  if (existing) {
    return existing.id;
  }
  const plan = (await query(
    'SELECT id, trial_duration_days FROM subscription_plans WHERE slug = $1 LIMIT 1',
    ['trial']
  )).rows[0];
  if (!plan) {
    return null;
  }
  const startDate = nowIso();
  const trialEnds =
    typeof plan.trial_duration_days === 'number'
      ? new Date(Date.now() + plan.trial_duration_days * 86400000).toISOString()
      : null;
  const result = await query(
    `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [schoolId, plan.id, 'active', startDate, trialEnds]
  );
  return result.rows[0].id;
};

// UPDATED: dbAll -> query(...).rows
router.get('/subscription/plans', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    try {
      const plans = (await query(
        `SELECT
           id,
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
         FROM subscription_plans
         ORDER BY CASE slug
           WHEN 'trial' THEN 0
           WHEN 'basic' THEN 1
           WHEN 'pro' THEN 2
           ELSE 3
         END`
      )).rows;
      const normalizedPlans = plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        studentLimit: plan.student_limit,
        staffLimit: plan.staff_limit,
        trialDurationDays: plan.trial_duration_days,
        isTrial: Number(plan.is_trial) === 1,
        features: Object.entries(PLAN_FEATURE_FLAGS).reduce((acc, [key, column]) => {
          acc[key] = Number(plan[column]) === 1;
          return acc;
        }, {})
      }));
      const subscription = await ensureSubscriptionLoaded(req);
      res.json({ plans: normalizedPlans, subscription });
    } catch (error) {
      res.status(500).json({ error: 'Failed to load subscription plans.' });
    }
    return;
  }

  try {
    const plans = (await query(
      `SELECT
         id,
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
       FROM subscription_plans
       ORDER BY CASE slug
         WHEN 'trial' THEN 0
         WHEN 'basic' THEN 1
         WHEN 'pro' THEN 2
         ELSE 3
       END`
    )).rows;

    const normalizedPlans = plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      studentLimit: plan.student_limit,
      staffLimit: plan.staff_limit,
      trialDurationDays: plan.trial_duration_days,
      isTrial: Number(plan.is_trial) === 1,
      features: Object.entries(PLAN_FEATURE_FLAGS).reduce((acc, [key, column]) => {
        acc[key] = Number(plan[column]) === 1;
        return acc;
      }, {})
    }));

    res.json({ plans: normalizedPlans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subscription plans.' });
  }
});

router.get('/schools/:id/subscription', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { id } = req.params;
    const subscription = await fetchSubscriptionForSchool(Number(id));
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found.' });
    }
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subscription.' });
  }
});

// UPDATED: dbGet, dbRun -> query
router.put('/schools/:id/subscription', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { id } = req.params;
    const { planSlug, planId, status } = req.body;
    if (!planSlug && !planId) {
      return res.status(400).json({ error: 'Plan identifier is required.' });
    }

    const plan = (await query(
      `SELECT
         id,
         slug,
         student_limit,
         staff_limit,
         trial_duration_days
       FROM subscription_plans
       WHERE ${planId ? `id = $1` : `slug = $1`}
       LIMIT 1`,
      [planId ?? planSlug]
    )).rows[0];

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }

    const usage = (await query(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE school_id = $1) AS student_count,
         (SELECT COUNT(*) FROM users WHERE school_id = $2 AND "role" NOT IN ('student', 'parent', 'super_admin')) AS staff_count`,
      [id, id]
    )).rows[0];

    if (
      typeof plan.student_limit === 'number' &&
      Number(usage?.student_count || 0) > plan.student_limit
    ) {
      return res.status(409).json({ error: 'Current student count exceeds the selected plan limit.' });
    }

    if (
      typeof plan.staff_limit === 'number' &&
      Number(usage?.staff_count || 0) > plan.staff_limit
    ) {
      return res.status(409).json({ error: 'Current staff count exceeds the selected plan limit.' });
    }

    const subscription = (await query(
      'SELECT id FROM subscriptions WHERE school_id = $1 LIMIT 1',
      [id]
    )).rows[0];

    const startDate = nowIso();
    const trialEnds =
      typeof plan.trial_duration_days === 'number'
        ? new Date(Date.now() + plan.trial_duration_days * 86400000).toISOString()
        : null;
    const normalizedStatus = typeof status === 'string' ? status : 'active';

    if (subscription) {
      await query(
        `UPDATE subscriptions
           SET plan_id = $1,
               status = $2,
               start_date = $3,
               end_date = NULL,
               trial_ends_at = $4
         WHERE id = $5`,
        [plan.id, normalizedStatus, startDate, trialEnds, subscription.id]
      );
    } else {
      await query(
        `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, plan.id, normalizedStatus, startDate, trialEnds]
      );
    }

    const updatedSubscription = await fetchSubscriptionForSchool(Number(id));
    res.json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
});

// UPDATED: dbRun -> query, .lastID -> .rows[0].id
router.post('/schools', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { name, address, phone, email, principal, logo } = req.body;
    const result = await query(
      'INSERT INTO schools (name, address, phone, email, principal, logo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, address, phone, email, principal, logo]
    );
    await assignDefaultSubscription(result.rows[0].id);
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/schools', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Note: Using "role" in SQL, which is fine for PostgreSQL if not quoted.
    const schools = (await query(`
      SELECT
        s.id,
        s.name,
        s.address,
        s.phone,
        s.email,
        s.principal,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id AND "role" != 'student' AND "role" != 'parent') AS staff,
        (SELECT SUM(sf.amount_paid) FROM student_fees sf JOIN students st ON sf.student_id = st.id WHERE st.school_id = s.id) AS revenue,
        sub.status AS subscription_status,
        sub.start_date AS subscription_start_date,
        sub.trial_ends_at AS subscription_trial_ends_at,
        sp.name AS subscription_plan_name,
        sp.slug AS subscription_plan_slug,
        sp.student_limit AS subscription_plan_student_limit,
        sp.staff_limit AS subscription_plan_staff_limit
      FROM schools s
      LEFT JOIN subscriptions sub ON sub.school_id = s.id
      LEFT JOIN subscription_plans sp ON sp.id = sub.plan_id
    `)).rows;

    const formattedSchools = schools.map((school) => ({
      ...school,
      id: school.id.toString(),
      revenue: `$${(school.revenue || 0).toLocaleString()}`,
      status: 'Active', // This status seems hardcoded, might need to review logic
      subscription: school.subscription_plan_name
        ? {
            planName: school.subscription_plan_name,
            planSlug: school.subscription_plan_slug,
            status: school.subscription_status || 'active',
            startDate: school.subscription_start_date,
            trialEndsAt: school.subscription_trial_ends_at,
            studentLimit:
              typeof school.subscription_plan_student_limit === 'number'
                ? school.subscription_plan_student_limit
                : null,
            staffLimit:
              typeof school.subscription_plan_staff_limit === 'number'
                ? school.subscription_plan_staff_limit
                : null
          }
        : null
    }));

    res.json(formattedSchools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbGet -> query(...).rows[0]
router.get('/schools/:id', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { id } = req.params;
    const school = (await query(
      `SELECT
        s.id,
        s.name,
        s.address,
        s.phone,
        s.email,
        s.principal,
        s.curriculum,
        s.level,
        s.created_at,
        s.grade_levels,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id AND "role" != 'student' AND "role" != 'parent') AS staff,
        sub.status AS subscription_status,
        sub.start_date AS subscription_start_date,
        sub.trial_ends_at AS subscription_trial_ends_at,
        sp.name AS subscription_plan_name,
        sp.slug AS subscription_plan_slug,
        sp.description AS subscription_plan_description,
        sp.student_limit AS subscription_plan_student_limit,
        sp.staff_limit AS subscription_plan_staff_limit,
        sp.trial_duration_days AS subscription_plan_trial_days
      FROM schools s
      LEFT JOIN subscriptions sub ON sub.school_id = s.id
      LEFT JOIN subscription_plans sp ON sp.id = sub.plan_id
      WHERE s.id = $1`,
      [id]
    )).rows[0];

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({
      ...school,
      id: school.id.toString(),
      students: Number(school.students || 0),
      staff: Number(school.staff || 0),
      gradeLevels: parseGradeLevels(school.grade_levels ?? null)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbGet -> query(...).rows[0]
router.get('/school/settings', async (req, res) => {
  try {
    let targetSchoolId;
    if (req.user.role === 'super_admin') {
      const querySchoolId = req.query.schoolId ?? req.query.school_id;
      const parsed = Number(querySchoolId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'schoolId is required for super admins.' });
      }
      targetSchoolId = parsed;
    } else {
      if (!req.user.schoolId) {
        return res.status(400).json({ error: 'User is not associated with a school.' });
      }
      targetSchoolId = Number(req.user.schoolId);
    }

    const school = (await query(
      `SELECT
         id,
         name,
         logo,
         primary_color,
         accent_color,
         grade_levels,
         curriculum,
         level,
         principal
       FROM schools
       WHERE id = $1
       LIMIT 1`,
      [targetSchoolId]
    )).rows[0];

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    res.json({
      schoolId: String(school.id),
      name: school.name,
      logo: school.logo ?? null,
      primaryColor: school.primary_color ?? null,
      accentColor: school.accent_color ?? null,
      gradeLevels: parseGradeLevels(school.grade_levels),
      curriculum: school.curriculum ?? null,
      level: school.level ?? null,
      principal: school.principal ?? null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load school settings.' });
  }
});

// UPDATED: dbRun -> query, dynamic params
router.put('/school/settings', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    let targetSchoolId;
    if (req.user.role === 'super_admin') {
      const bodySchoolId = req.body.schoolId ?? req.body.school_id ?? req.query.schoolId;
      const parsed = Number(bodySchoolId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'schoolId is required.' });
      }
      targetSchoolId = parsed;
    } else {
      if (!req.user.schoolId) {
        return res.status(400).json({ error: 'User is not associated with a school.' });
      }
      targetSchoolId = Number(req.user.schoolId);
    }

    const updates = [];
    const params = [];

    // Helper to build dynamic query
    const addUpdate = (key, value) => {
      // Use quotes for column names to be safe
      updates.push(`"${key}" = $${params.length + 1}`);
      params.push(value);
    };

    if (typeof req.body.name === 'string') {
      const name = req.body.name.trim();
      if (name.length > 0) addUpdate('name', name);
    }
    if (typeof req.body.logo === 'string') {
      addUpdate('logo', req.body.logo.trim().length > 0 ? req.body.logo.trim() : null);
    }
    if (typeof req.body.primaryColor === 'string') {
      addUpdate('primary_color', req.body.primaryColor.trim().length > 0 ? req.body.primaryColor.trim() : null);
    }
    if (typeof req.body.accentColor === 'string') {
      addUpdate('accent_color', req.body.accentColor.trim().length > 0 ? req.body.accentColor.trim() : null);
    }
    if (Array.isArray(req.body.gradeLevels)) {
      addUpdate('grade_levels', serializeGradeLevels(req.body.gradeLevels));
    }
    if (typeof req.body.curriculum === 'string') {
      addUpdate('curriculum', req.body.curriculum.trim().length > 0 ? req.body.curriculum.trim() : null);
    }
    if (typeof req.body.level === 'string') {
      addUpdate('level', req.body.level.trim().length > 0 ? req.body.level.trim() : null);
    }
    if (typeof req.body.principal === 'string') {
      addUpdate('principal', req.body.principal.trim().length > 0 ? req.body.principal.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided.' });
    }

    params.push(targetSchoolId); // Add the ID for the WHERE clause
    const whereClause = `WHERE id = $${params.length}`;

    await query(
      `UPDATE schools SET ${updates.join(', ')} ${whereClause}`,
      params
    );

    // UPDATED: dbGet -> query(...).rows[0]
    const updatedSchool = (await query(
      `SELECT
         id,
         name,
         logo,
         primary_color,
         accent_color,
         grade_levels,
         curriculum,
         level,
         principal
       FROM schools
       WHERE id = $1
       LIMIT 1`,
      [targetSchoolId]
    )).rows[0];

    res.json({
      schoolId: String(updatedSchool.id),
      name: updatedSchool.name,
      logo: updatedSchool.logo ?? null,
      primaryColor: updatedSchool.primary_color ?? null,
      accentColor: updatedSchool.accent_color ?? null,
      gradeLevels: parseGradeLevels(updatedSchool.grade_levels),
      curriculum: updatedSchool.curriculum ?? null,
      level: updatedSchool.level ?? null,
      principal: updatedSchool.principal ?? null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update school settings.' });
  }
});

// UPDATED: dbGet, dbRun -> query
router.post('/schools/:id/admin', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { id } = req.params;
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const school = (await query('SELECT id FROM schools WHERE id = $1', [id])).rows[0];
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const existingUser = (await query('SELECT id FROM users WHERE email = $1', [normalizedEmail])).rows[0];
    const targetSchoolId = role === 'super_admin' ? null : Number(id);

    if (existingUser) {
      await query(
        `UPDATE users
           SET "name" = $1,
               phone = $2,
               "role" = $3,
               school_id = $4,
               password_hash = $5,
               is_verified = 1,
               email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
         WHERE id = $6`,
        [name, phone ?? null, role, targetSchoolId, passwordHash, existingUser.id]
      );
      return res.json({ success: true, id: existingUser.id, updated: true });
    }

    const result = await query(
      `INSERT INTO users ("name", email, phone, password_hash, "role", school_id, is_verified, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, normalizedEmail, phone ?? null, passwordHash, role, targetSchoolId, 1, nowIso()]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/staff', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const staff = (await query(
      `SELECT id, name, email, phone, "role", department, class_assigned, subject, status, created_at as joinDate 
       FROM users 
       WHERE school_id = $1 AND "role" NOT IN ('student', 'parent', 'super_admin')`,
      [req.user.schoolId]
    )).rows;

    const formattedStaff = staff.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      department: s.department,
      status: s.status ?? 'Active',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      joinDate: s.joinDate ? s.joinDate.split('T')[0].split(' ')[0] : null,
      classAssigned: s.class_assigned,
      subject: s.subject
    }));

    res.json(formattedStaff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbRun -> query, .changes -> .rowCount
router.put('/staff/:id', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { id } = req.params;
    const { name, email, phone, role, department, classAssigned, subject, status } = req.body;

    const result = await query(
      `UPDATE users 
       SET "name" = $1, email = $2, phone = $3, "role" = $4, department = $5, class_assigned = $6, subject = $7, status = $8
       WHERE id = $9 AND school_id = $10`,
      [name, email, phone, role, department ?? null, classAssigned ?? null, subject ?? null, status ?? 'Active', id, req.user.schoolId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Staff member not found or user not authorized.' });
    }
    res.json({ success: true, changes: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/students', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const students = (await query(
      `SELECT 
         s.id, s.first_name, s.last_name, s.email, s.grade, s.class_section, s.status, s.phone,
         p.name as parentGuardian,
         COALESCE(SUM(sf.amount_due - sf.amount_paid), 0) as outstandingFees
       FROM students s
       LEFT JOIN users p ON s.parent_id = p.id AND p."role" = 'parent'
       LEFT JOIN student_fees sf ON s.id = sf.student_id
       WHERE s.school_id = $1
       GROUP BY s.id, s.first_name, s.last_name, s.email, s.grade, s.class_section, s.status, s.phone, p.name`,
      [req.user.schoolId]
    )).rows;

    const formattedStudents = students.map((s) => ({
      id: s.id.toString(),
      name: `${s.first_name} ${s.last_name}`,
      email: s.email,
      grade: s.grade,
      class: s.class_section || 'A',
      status: s.status,
      phone: s.phone,
      parentGuardian: s.parentGuardian || 'N/A',
      fees: `$${s.outstandingFees.toLocaleString()}`
    }));

    res.json(formattedStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbRun -> query, .lastID -> .rows[0].id
router.post('/students', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const subscription = await ensureSubscriptionLoaded(req);
    const usageCheck = await usageWithinLimit(subscription, { type: 'student' });
    if (!usageCheck.allowed) {
      return res.status(403).json({ error: usageCheck.reason });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      address,
      grade,
      enrollment_date,
      parent_id
    } = req.body;

    const result = await query(
      'INSERT INTO students (first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id',
      [
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        address,
        grade,
        enrollment_date,
        req.user.schoolId,
        parent_id || null,
        'Active'
      ]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbRun -> query, .changes -> .rowCount
router.put('/students/:id', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { id } = req.params;
    const { name, email, phone, grade, class: classSection, status } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (!normalizedName) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const [first_name, ...lastNameParts] = normalizedName.split(/\s+/);
    const last_name = lastNameParts.join(' ');

    const result = await query(
      `UPDATE students 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, grade = $5, class_section = $6, status = $7
       WHERE id = $8 AND school_id = $9`,
      [first_name, last_name || null, email, phone, grade, classSection ?? null, status ?? 'Active', id, req.user.schoolId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found or user not authorized.' });
    }
    res.json({ success: true, changes: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbRun -> query, dynamic params, .lastID -> .rows[0].id
router.post('/users', async (req, res) => {
  if (!req.user.schoolId && req.body.role !== 'super_admin') {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { name, email, password, role, phone, class_assigned, subject } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['student', 'parent', 'super_admin'].includes(role)) {
      const subscription = await ensureSubscriptionLoaded(req);
      const usageCheck = await usageWithinLimit(subscription, { type: 'staff' });
      if (!usageCheck.allowed) {
        return res.status(403).json({ error: usageCheck.reason });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const school_id = req.user.role === 'super_admin' && role === 'super_admin' ? null : req.user.schoolId;

    const columns = ['name', 'email', 'password_hash', 'role', 'phone', 'school_id', 'is_verified', 'email_verified_at'];
    const verifiedAt = nowIso();
    const bindings = [name, email, passwordHash, role, phone ?? null, school_id, 1, verifiedAt];

    if (class_assigned !== undefined) {
      columns.push('class_assigned');
      bindings.push(class_assigned);
    }
    if (subject !== undefined) {
      columns.push('subject');
      bindings.push(subject);
    }

    const placeholders = bindings.map((_, i) => `$${i + 1}`).join(', ');
    // Quote reserved column names
    const safeColumns = columns.map(c => ['role', 'name'].includes(c) ? `"${c}"` : c);
    
    const querySql = `INSERT INTO users (${safeColumns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await query(querySql, bindings);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// UPDATED: dbGet, dbAll -> query
router.post('/parent/access', async (req, res) => {
  if (!(await requireFeature(req, res, 'parentPortal'))) {
    return;
  }
  try {
    const { student_id, student_password } = req.body;

    const student = (await query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    )).rows[0];
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.school_id !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this student record.' });
    }

    const studentUser = (await query(
      'SELECT * FROM users WHERE email = $1 AND "role" = $2',
      [student.email, 'student']
    )).rows[0];
    if (!studentUser) {
      return res.status(401).json({ error: 'Student account not found or password not set.' });
    }

    const isMatch = await bcrypt.compare(student_password, studentUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    const discipline = (await query(
      'SELECT * FROM discipline WHERE student_id = $1 ORDER BY date DESC',
      [student_id]
    )).rows;

    const performance = (await query(
      'SELECT * FROM performance WHERE student_id = $1 ORDER BY date_recorded DESC',
      [student_id]
    )).rows;

    const attendance = (await query(
      'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC LIMIT 50',
      [student_id]
    )).rows;

    const financial = (await query(
      `SELECT 
        SUM(amount_due) as totalFees, 
        SUM(amount_paid) as feesPaid,
        SUM(amount_due - amount_paid) as feesDue
       FROM student_fees 
       WHERE student_id = $1`,
      [student_id]
    )).rows[0];

    res.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade,
        class: student.class_section || 'A'
      },
      discipline,
      performance,
      attendance,
      financial: {
        totalFees: financial?.totalFees || 0,
        feesPaid: financial?.feesPaid || 0,
        feesDue: financial?.feesDue || 0,
        status: (financial?.feesDue || 0) > 0 ? 'Partial' : 'Paid'
      }
    });
  } catch (error) {
    console.error('Parent access error:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbGet -> query(...).rows[0]
router.get('/academic-year', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const activeYear = (await query(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = $1 AND school_id = $2 ORDER BY start_date DESC LIMIT 1',
      ['active', req.user.schoolId]
    )).rows[0];
    const latestYear = (await query(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = $1 AND school_id = $2 ORDER BY end_date DESC LIMIT 1',
      ['completed', req.user.schoolId]
    )).rows[0];
    res.json({ activeYear, latestYear });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load academic year.' });
  }
});

// UPDATED: dbGet, dbRun -> query
router.post('/academic-year/start', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { start_date } = req.body;
    const school_id = req.user.schoolId;

    const existingActive = (await query(
      'SELECT id FROM academic_years WHERE school_id = $1 AND status = $2',
      [school_id, 'active']
    )).rows[0];
    if (existingActive) {
      return res.status(409).json({ error: 'An academic year is already active.' });
    }
    const result = await query(
      'INSERT INTO academic_years (school_id, start_date, status) VALUES ($1, $2, $3) RETURNING id',
      [school_id, start_date, 'active']
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start academic year.' });
  }
});

// UPDATED: dbGet, dbAll, dbRun -> query
const runStudentPromotion = async (schoolId, startDate, endDate) => {
  const summary = {
    promoted: 0,
    retained: 0,
    graduated: 0,
    updatedStudents: []
  };

  const schoolRow = (await query(
    'SELECT curriculum FROM schools WHERE id = $1',
    [schoolId]
  )).rows[0];
  const schoolCurriculum = schoolRow?.curriculum || DEFAULT_CURRICULUM;

  const students = (await query(
    'SELECT id, grade, status FROM students WHERE school_id = $1 AND status = $2',
    [schoolId, 'Active']
  )).rows;

  for (const student of students) {
    const studentId = Number(student.id);
    if (Number.isNaN(studentId)) {
      continue;
    }
    const currentGrade = typeof student.grade === 'string' ? student.grade : null;

    let averageGrade = null;
    try {
      const performanceRow = (await query(
        'SELECT AVG(CAST(grade AS REAL)) as average_grade FROM performance WHERE student_id = $1 AND date_recorded BETWEEN $2 AND $3',
        [studentId, startDate, endDate]
      )).rows[0];
      if (performanceRow && performanceRow.average_grade !== null) {
        averageGrade = Number(performanceRow.average_grade);
      }
    } catch (performanceError) {
      console.error('Failed to aggregate performance for student:', studentId, performanceError);
      averageGrade = 0;
    }

    const { nextGrade, status } = getNextGrade(schoolCurriculum, currentGrade);

    if (status === 'Graduated') {
      await query('UPDATE students SET status = $1 WHERE id = $2', ['Graduated', studentId]);
      summary.graduated += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Graduated' });
      continue;
    }

    if (nextGrade && (averageGrade === null || averageGrade >= PROMOTION_THRESHOLD)) {
      await query('UPDATE students SET grade = $1, status = $2 WHERE id = $3', [nextGrade, 'Active', studentId]);
      summary.promoted += 1;
      summary.updatedStudents.push({ id: studentId, grade: nextGrade, status: 'Active' });
    } else {
      await query('UPDATE students SET status = $1 WHERE id = $2', ['Retained', studentId]);
      summary.retained += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Retained' });
    }
  }
  return summary;
};

// UPDATED: dbGet, dbRun -> query
router.post('/academic-year/end', async (req, res) => {
  const school_id = req.user.schoolId;
  const { year_id } = req.body;

  if (!school_id) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }

  try {
    const activeYear = (await query(
      'SELECT id, start_date FROM academic_years WHERE id = $1 AND school_id = $2 AND status = $3',
      [year_id, school_id, 'active']
    )).rows[0];
    if (!activeYear) {
      return res.status(404).json({ error: 'Active academic year not found.' });
    }
    const startDate = activeYear.start_date;
    const endDate = new Date().toISOString();

    const promotionResult = await runStudentPromotion(school_id, startDate, endDate);

    await query(
      'UPDATE academic_years SET end_date = $1, status = $2 WHERE id = $3',
      [endDate, 'completed', year_id]
    );
    res.json({
      success: true,
      promotionSummary: promotionResult,
      updatedStudents: promotionResult.updatedStudents,
      endDate
    });
  } catch (error) {
    console.error('Error ending academic year:', error);
    res.status(500).json({ error: 'Failed to end academic year.' });
  }
});

// UPDATED: dbRun -> query
router.post('/discipline', async (req, res) => {
  try {
    const { student_id, type, severity, description, date } = req.body;
    const teacher_id = req.user.id;

    const result = await query(
      'INSERT INTO discipline (student_id, teacher_id, type, severity, description, date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [student_id, teacher_id, type, severity, description, date, 'Pending']
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/discipline/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = (await query(
      'SELECT * FROM discipline WHERE student_id = $1 ORDER BY date DESC',
      [studentId]
    )).rows;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbRun -> query
router.post('/performance', async (req, res) => {
  try {
    const { student_id, subject, grade, term, comments } = req.body;
    const teacher_id = req.user.id;

    const result = await query(
      'INSERT INTO performance (student_id, teacher_id, subject, grade, term, comments, date_recorded) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [student_id, teacher_id, subject, grade, term, comments, new Date().toISOString()]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/performance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = (await query(
      'SELECT * FROM performance WHERE student_id = $1 ORDER BY date_recorded DESC',
      [studentId]
    )).rows;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/courses/:courseId/resources', async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Invalid course identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId); // Already uses new query
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (req.user.role !== 'super_admin') {
      if (!req.user.schoolId || Number(req.user.schoolId) !== Number(course.school_id)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const rows = (await query(
      `SELECT
         cr.id,
         cr.course_id,
         cr.title,
         cr.description,
         cr.resource_type,
         cr.url,
         cr.created_by,
         cr.created_at,
         u.name AS created_by_name
       FROM course_resources cr
       LEFT JOIN users u ON u.id = cr.created_by
       WHERE cr.course_id = $1
       ORDER BY cr.created_at DESC`,
      [courseId]
    )).rows;

    res.json({
      courseId: String(courseId),
      resources: rows.map(formatCourseResourceRow)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load course resources.' });
  }
});

// UPDATED: dbRun, dbGet -> query
router.post('/courses/:courseId/resources', async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Invalid course identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId); // Already uses new query
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const matchesSchool = req.user.schoolId && Number(req.user.schoolId) === Number(course.school_id);
    const isSuperAdmin = req.user.role === 'super_admin';
    const userId = Number(req.user.id);
    const isAdmin = req.user.role === 'admin' && matchesSchool;
    const isCourseTeacher =
      req.user.role === 'teacher' && matchesSchool && Number.isInteger(userId) && Number(course.teacher_id) === userId;

    if (!isSuperAdmin && !isAdmin && !isCourseTeacher) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (title === '') {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const description = typeof req.body.description === 'string' && req.body.description.trim() !== ''
      ? req.body.description.trim()
      : null;
    const resourceType = typeof req.body.type === 'string' && req.body.type.trim() !== ''
      ? req.body.type.trim()
      : 'Document';
    const url = typeof req.body.url === 'string' && req.body.url.trim() !== '' ? req.body.url.trim() : null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user context.' });
    }

    const insertResult = await query(
      `INSERT INTO course_resources (course_id, title, description, resource_type, url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [courseId, title, description, resourceType, url, userId]
    );

    const inserted = (await query(
      `SELECT
         cr.id,
         cr.course_id,
         cr.title,
         cr.description,
         cr.resource_type,
         cr.url,
         cr.created_by,
         cr.created_at,
         u.name AS created_by_name
       FROM course_resources cr
       LEFT JOIN users u ON u.id = cr.created_by
       WHERE cr.id = $1
       LIMIT 1`,
      [insertResult.rows[0].id]
    )).rows[0];

    res.status(201).json({ resource: formatCourseResourceRow(inserted) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource.' });
  }
});

// UPDATED: dbRun -> query, .changes -> .rowCount
router.delete('/courses/:courseId/resources/:resourceId', async (req, res) => {
  const courseId = Number(req.params.courseId);
  const resourceId = Number(req.params.resourceId);
  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(resourceId) || resourceId <= 0) {
    return res.status(400).json({ error: 'Invalid identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId); // Already uses new query
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const matchesSchool = req.user.schoolId && Number(req.user.schoolId) === Number(course.school_id);
    const isSuperAdmin = req.user.role === 'super_admin';
    const userId = Number(req.user.id);
    const isAdmin = req.user.role === 'admin' && matchesSchool;
    const isCourseTeacher =
      req.user.role === 'teacher' && matchesSchool && Number.isInteger(userId) && Number(course.teacher_id) === userId;

    if (!isSuperAdmin && !isAdmin && !isCourseTeacher) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'DELETE FROM course_resources WHERE id = $1 AND course_id = $2',
      [resourceId, courseId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Resource not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource.' });
  }
});

// UPDATED: dbGet -> query(...).rows[0]
router.get('/teacher/attendance/roster', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const dateParam = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString();
    const normalizedDate = normalizeDateOnly(dateParam);
    if (!normalizedDate) {
      return res.status(400).json({ error: 'Invalid date provided.' });
    }

    const teacherRow = (await query(
      'SELECT class_assigned, school_id FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    )).rows[0];
    const schoolId = teacherRow?.school_id ?? req.user.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'School context not found.' });
    }

    let classSection = null;
    if (req.user.role === 'teacher') {
      classSection =
        typeof teacherRow?.class_assigned === 'string' && teacherRow.class_assigned.trim() !== ''
          ? teacherRow.class_assigned.trim()
          : null;
    } else if (typeof req.query.classSection === 'string' && req.query.classSection.trim() !== '') {
      classSection = req.query.classSection.trim();
    }

    const rosterRows = await getAttendanceRoster({ schoolId, classSection, date: normalizedDate }); // Already uses new query
    const students = formatAttendanceRows(rosterRows);

    res.json({
      date: normalizedDate,
      classSection,
      statuses: ATTENDANCE_STATUSES,
      students
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load attendance roster.' });
  }
});

// UPDATED: dbGet, dbAll, dbRun -> query
router.post('/teacher/attendance', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { date, records, classSection: overrideClassSection } = req.body;
    const normalizedDate = normalizeDateOnly(date);
    if (!normalizedDate) {
      return res.status(400).json({ error: 'Invalid date provided.' });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Attendance records are required.' });
    }

    const teacherRow = (await query(
      'SELECT class_assigned, school_id FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    )).rows[0];
    const schoolId = teacherRow?.school_id ?? req.user.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'School context not found.' });
    }

    let classSection = null;
    if (req.user.role === 'teacher') {
      classSection =
        typeof teacherRow?.class_assigned === 'string' && teacherRow.class_assigned.trim() !== ''
          ? teacherRow.class_assigned.trim()
          : null;
    } else if (typeof overrideClassSection === 'string' && overrideClassSection.trim() !== '') {
      classSection = overrideClassSection.trim();
    }

    let allowedQuerySql = 'SELECT id FROM students WHERE school_id = $1';
    const allowedParams = [schoolId];
    if (classSection) {
      allowedQuerySql += ' AND class_section = $2';
      allowedParams.push(classSection);
    }
    const allowedRows = (await query(allowedQuerySql, allowedParams)).rows;
    const allowedIds = new Set(allowedRows.map((row) => Number(row.id)));
    if (allowedIds.size === 0) {
      return res.status(409).json({ error: 'No students found for attendance.' });
    }

    let updated = 0;
    for (const record of records) {
      if (!record) {
        continue;
      }
      const studentId = Number(record.studentId ?? record.id);
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: 'Invalid student identifier provided.' });
      }
      if (!allowedIds.has(studentId)) {
        return res.status(403).json({ error: 'Student not assigned to this teacher.' });
      }
      const statusInput = typeof record.status === 'string' ? record.status.trim() : '';
      if (!VALID_ATTENDANCE_STATUSES.has(statusInput)) {
        return res.status(400).json({ error: `Invalid attendance status: ${statusInput}` });
      }
      if (statusInput === 'Not Marked') {
        await query('DELETE FROM attendance WHERE student_id = $1 AND date = $2', [studentId, normalizedDate]);
      } else {
        await query(
          'INSERT INTO attendance (student_id, date, status, teacher_id) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, date) DO UPDATE SET status = $3, teacher_id = $4',
          [studentId, normalizedDate, statusInput, req.user.id]
        );
      }
      updated += 1;
    }

    const refreshedRoster = await getAttendanceRoster({ schoolId, classSection, date: normalizedDate });
    const students = formatAttendanceRows(refreshedRoster);

    res.json({
      success: true,
      date: normalizedDate,
      classSection,
      updated,
      statuses: ATTENDANCE_STATUSES,
      students
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

// UPDATED: dbRun -> query, .changes -> .rowCount
router.post('/attendance', async (req, res) => {
  try {
    const { student_id, date, status } = req.body;
    const teacher_id = req.user.id;

    const result = await query(
      'INSERT INTO attendance (student_id, date, status, teacher_id) VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, date) DO UPDATE SET status = $3, teacher_id = $4',
      [student_id, date, status, teacher_id]
    );
    res.json({ success: true, changes: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/attendance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = (await query(
      'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
      [studentId]
    )).rows;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/reports/financial-summary', async (req, res) => {
  if (!req.user.schoolId || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!(await requireFeature(req, res, 'finance'))) {
    return;
  }
  try {
    const school_id = req.user.schoolId;
    // Note: STRFTIME is SQLite specific, for PostgreSQL this should be TO_CHAR
    const rows = (await query(
      `SELECT 
        TO_CHAR(T1.due_date, 'YYYY-MM') as month, 
        SUM(T1.amount_paid) as "Collected", 
        SUM(T1.amount_due - T1.amount_paid) as "Pending" 
      FROM student_fees T1
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = $1
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6`,
      [school_id]
    )).rows;

    const formattedData = rows.map((row) => ({
      name: getMonthName(row.month),
      Collected: parseFloat(row.Collected) || 0,
      Pending: parseFloat(row.Pending) > 0 ? parseFloat(row.Pending) : 0
    })).reverse();

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching financial-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/reports/performance-summary', async (req, res) => {
  if (!req.user.schoolId || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!(await requireFeature(req, res, 'advancedReports'))) {
    return;
  }
  try {
    const school_id = req.user.schoolId;
    const rows = (await query(
      `SELECT 
        T1.subject, 
        AVG(T1.grade) as average, 
        COUNT(DISTINCT T1.student_id) as students 
      FROM performance T1 
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = $1 
      GROUP BY T1.subject`,
      [school_id]
    )).rows;

    const formattedData = rows.map((row) => ({
      ...row,
      average: parseFloat(row.average.toFixed(2))
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching performance-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATED: dbAll -> query(...).rows
router.get('/reports/school-analytics', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Note: STRFTIME is SQLite specific, for PostgreSQL this should be TO_CHAR
    const newSchoolsByMonth = (await query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month, 
        COUNT(*) as newSchools 
      FROM schools 
      GROUP BY month 
      ORDER BY month ASC`
    )).rows;

    let totalSchools = 0;
    const formattedData = newSchoolsByMonth.map((row) => {
      totalSchools += parseInt(row.newschools, 10); // PostgreSQL returns lowercase
      return {
        month: getMonthName(row.month),
        newSchools: parseInt(row.newschools, 10),
        totalSchools,
        activeSchools: totalSchools // This logic might need refinement based on 'status'
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching school-analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/subscription-status', (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // This route is still using mock data as per the original file.
  // To make it live, you would need to write a query similar to the other reports.
  console.log('Serving mock data for /api/reports/subscription-status. A new query is required for live data.');
  res.json([
    { plan: 'Basic', subscribers: 85, revenue: 4250, status: 'Active' },
    { plan: 'Pro', subscribers: 45, revenue: 9000, status: 'Active' },
    { plan: 'Trial', subscribers: 28, revenue: 0, status: 'Trial' },
    { plan: 'Basic', subscribers: 5, revenue: 250, status: 'Expired' }
  ]);
});

module.exports = { secureRouter: router };