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
const { dbRun, dbGet, dbAll } = require('../database');

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

const getAttendanceRoster = async ({ schoolId, classSection, date }) => {
  let query = `
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.grade,
      s.class_section,
      a.status AS attendance_status,
      a.recorded_at
    FROM students s
    LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
    WHERE s.school_id = ?
  `;
  const params = [date, schoolId];
  if (classSection) {
    query += ' AND s.class_section = ?';
    params.push(classSection);
  }
  query += ' ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC';
  return dbAll(query, params);
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

const getCourseForAccess = async (courseId) =>
  dbGet(
    'SELECT id, school_id, teacher_id FROM courses WHERE id = ? LIMIT 1',
    [courseId]
  );

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

const fetchSubscriptionForSchool = async (schoolId) => {
  if (!schoolId) {
    return null;
  }
  const row = await dbGet(
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
     WHERE sub.school_id = ?
     LIMIT 1`,
    [schoolId]
  );

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

const usageWithinLimit = async (subscription, { type }) => {
  if (!subscription) {
    return { allowed: false, reason: 'Subscription not found for school.' };
  }

  if (type === 'student' && typeof subscription.studentLimit === 'number') {
    const row = await dbGet(
      'SELECT COUNT(*) AS count FROM students WHERE school_id = ? AND status != ?',
      [subscription.schoolId, 'Archived']
    );
    if (Number(row?.count || 0) >= subscription.studentLimit) {
      return {
        allowed: false,
        reason: 'Student limit reached for current subscription plan.'
      };
    }
  }

  if (type === 'staff' && typeof subscription.staffLimit === 'number') {
    const row = await dbGet(
      `SELECT COUNT(*) AS count
         FROM users
         WHERE school_id = ?
           AND role NOT IN ('student', 'parent', 'super_admin')
           AND status != ?`,
      [subscription.schoolId, 'Archived']
    );
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

const assignDefaultSubscription = async (schoolId) => {
  if (!schoolId) {
    return null;
  }
  const existing = await dbGet('SELECT id FROM subscriptions WHERE school_id = ? LIMIT 1', [schoolId]);
  if (existing) {
    return existing.id;
  }
  const plan = await dbGet(
    'SELECT id, trial_duration_days FROM subscription_plans WHERE slug = ? LIMIT 1',
    ['trial']
  );
  if (!plan) {
    return null;
  }
  const startDate = nowIso();
  const trialEnds =
    typeof plan.trial_duration_days === 'number'
      ? new Date(Date.now() + plan.trial_duration_days * 86400000).toISOString()
      : null;
  const result = await dbRun(
    `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
     VALUES (?, ?, ?, ?, ?)`,
    [schoolId, plan.id, 'active', startDate, trialEnds]
  );
  return result.lastID;
};

router.get('/subscription/plans', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    try {
      const plans = await dbAll(
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
      );
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
    const plans = await dbAll(
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
    );

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

    const plan = await dbGet(
      `SELECT
         id,
         slug,
         student_limit,
         staff_limit,
         trial_duration_days
       FROM subscription_plans
       WHERE ${planId ? 'id = ?' : 'slug = ?'}
       LIMIT 1`,
      [planId ?? planSlug]
    );

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }

    const usage = await dbGet(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE school_id = ?) AS student_count,
         (SELECT COUNT(*) FROM users WHERE school_id = ? AND role NOT IN ('student', 'parent', 'super_admin')) AS staff_count`,
      [id, id]
    );

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

    const subscription = await dbGet(
      'SELECT id FROM subscriptions WHERE school_id = ? LIMIT 1',
      [id]
    );

    const startDate = nowIso();
    const trialEnds =
      typeof plan.trial_duration_days === 'number'
        ? new Date(Date.now() + plan.trial_duration_days * 86400000).toISOString()
        : null;
    const normalizedStatus = typeof status === 'string' ? status : 'active';

    if (subscription) {
      await dbRun(
        `UPDATE subscriptions
           SET plan_id = ?,
               status = ?,
               start_date = ?,
               end_date = NULL,
               trial_ends_at = ?
         WHERE id = ?`,
        [plan.id, normalizedStatus, startDate, trialEnds, subscription.id]
      );
    } else {
      await dbRun(
        `INSERT INTO subscriptions (school_id, plan_id, status, start_date, trial_ends_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, plan.id, normalizedStatus, startDate, trialEnds]
      );
    }

    const updatedSubscription = await fetchSubscriptionForSchool(Number(id));
    res.json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
});

router.post('/schools', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { name, address, phone, email, principal, logo } = req.body;
    const result = await dbRun(
      'INSERT INTO schools (name, address, phone, email, principal, logo) VALUES (?, ?, ?, ?, ?, ?)',
      [name, address, phone, email, principal, logo]
    );
    await assignDefaultSubscription(result.lastID);
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/schools', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const schools = await dbAll(`
      SELECT
        s.id,
        s.name,
        s.address,
        s.phone,
        s.email,
        s.principal,
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role != 'student' AND role != 'parent') AS staff,
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
    `);

    const formattedSchools = schools.map((school) => ({
      ...school,
      id: school.id.toString(),
      revenue: `$${(school.revenue || 0).toLocaleString()}`,
      status: 'Active',
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

router.get('/schools/:id', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { id } = req.params;
    const school = await dbGet(
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
        (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role != 'student' AND role != 'parent') AS staff,
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
      WHERE s.id = ?`,
      [id]
    );

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

    const school = await dbGet(
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
       WHERE id = ?
       LIMIT 1`,
      [targetSchoolId]
    );

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

    if (typeof req.body.name === 'string') {
      const name = req.body.name.trim();
      if (name.length > 0) {
        updates.push('name = ?');
        params.push(name);
      }
    }

    if (typeof req.body.logo === 'string') {
      const logo = req.body.logo.trim();
      updates.push('logo = ?');
      params.push(logo.length > 0 ? logo : null);
    }

    if (typeof req.body.primaryColor === 'string') {
      const primaryColor = req.body.primaryColor.trim();
      updates.push('primary_color = ?');
      params.push(primaryColor.length > 0 ? primaryColor : null);
    }

    if (typeof req.body.accentColor === 'string') {
      const accentColor = req.body.accentColor.trim();
      updates.push('accent_color = ?');
      params.push(accentColor.length > 0 ? accentColor : null);
    }

    if (Array.isArray(req.body.gradeLevels)) {
      updates.push('grade_levels = ?');
      params.push(serializeGradeLevels(req.body.gradeLevels));
    }

    if (typeof req.body.curriculum === 'string') {
      const curriculum = req.body.curriculum.trim();
      updates.push('curriculum = ?');
      params.push(curriculum.length > 0 ? curriculum : null);
    }

    if (typeof req.body.level === 'string') {
      const level = req.body.level.trim();
      updates.push('level = ?');
      params.push(level.length > 0 ? level : null);
    }

    if (typeof req.body.principal === 'string') {
      const principal = req.body.principal.trim();
      updates.push('principal = ?');
      params.push(principal.length > 0 ? principal : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided.' });
    }

    params.push(targetSchoolId);

    await dbRun(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedSchool = await dbGet(
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
       WHERE id = ?
       LIMIT 1`,
      [targetSchoolId]
    );

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

    const school = await dbGet('SELECT id FROM schools WHERE id = ?', [id]);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    const targetSchoolId = role === 'super_admin' ? null : Number(id);

    if (existingUser) {
      await dbRun(
        `UPDATE users
           SET name = ?,
               phone = ?,
               role = ?,
               school_id = ?,
               password_hash = ?,
               is_verified = 1,
               email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
         WHERE id = ?`,
        [name, phone ?? null, role, targetSchoolId, passwordHash, existingUser.id]
      );
      return res.json({ success: true, id: existingUser.id, updated: true });
    }

    const result = await dbRun(
      `INSERT INTO users (name, email, phone, password_hash, role, school_id, is_verified, email_verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, normalizedEmail, phone ?? null, passwordHash, role, targetSchoolId, 1, nowIso()]
    );

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/staff', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const staff = await dbAll(
      `SELECT id, name, email, phone, role, department, class_assigned, subject, status, created_at as joinDate 
       FROM users 
       WHERE school_id = ? AND role NOT IN ('student', 'parent', 'super_admin')`,
      [req.user.schoolId]
    );

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

router.put('/staff/:id', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { id } = req.params;
    const { name, email, phone, role, department, classAssigned, subject, status } = req.body;

    const result = await dbRun(
      `UPDATE users 
       SET name = ?, email = ?, phone = ?, role = ?, department = ?, class_assigned = ?, subject = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [name, email, phone, role, department ?? null, classAssigned ?? null, subject ?? null, status ?? 'Active', id, req.user.schoolId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Staff member not found or user not authorized.' });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/students', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const students = await dbAll(
      `SELECT 
         s.id, s.first_name, s.last_name, s.email, s.grade, s.class_section, s.status, s.phone,
         p.name as parentGuardian,
         COALESCE(SUM(sf.amount_due - sf.amount_paid), 0) as outstandingFees
       FROM students s
       LEFT JOIN users p ON s.parent_id = p.id AND p.role = 'parent'
       LEFT JOIN student_fees sf ON s.id = sf.student_id
       WHERE s.school_id = ?
       GROUP BY s.id, s.first_name, s.last_name, s.email, s.grade, s.class_section, s.status, s.phone, p.name`,
      [req.user.schoolId]
    );

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

    const result = await dbRun(
      'INSERT INTO students (first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    const result = await dbRun(
      `UPDATE students 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, grade = ?, class_section = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [first_name, last_name || null, email, phone, grade, classSection ?? null, status ?? 'Active', id, req.user.schoolId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found or user not authorized.' });
    }
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    const placeholders = ['?', '?', '?', '?', '?', '?', '?', '?'];
    const verifiedAt = nowIso();
    const bindings = [name, email, passwordHash, role, phone ?? null, school_id, 1, verifiedAt];

    if (class_assigned !== undefined) {
      columns.push('class_assigned');
      placeholders.push('?');
      bindings.push(class_assigned);
    }
    if (subject !== undefined) {
      columns.push('subject');
      placeholders.push('?');
      bindings.push(subject);
    }

    const query = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await dbRun(query, bindings);
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.post('/parent/access', async (req, res) => {
  if (!(await requireFeature(req, res, 'parentPortal'))) {
    return;
  }
  try {
    const { student_id, student_password } = req.body;

    const student = await dbGet(
      'SELECT * FROM students WHERE id = ?',
      [student_id]
    );
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.school_id !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this student record.' });
    }

    const studentUser = await dbGet(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [student.email, 'student']
    );
    if (!studentUser) {
      return res.status(401).json({ error: 'Student account not found or password not set.' });
    }

    const isMatch = await bcrypt.compare(student_password, studentUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid student ID or password' });
    }

    const discipline = await dbAll(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC',
      [student_id]
    );

    const performance = await dbAll(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC',
      [student_id]
    );

    const attendance = await dbAll(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 50',
      [student_id]
    );

    const financial = await dbGet(
      `SELECT 
        SUM(amount_due) as totalFees, 
        SUM(amount_paid) as feesPaid,
        SUM(amount_due - amount_paid) as feesDue
       FROM student_fees 
       WHERE student_id = ?`,
      [student_id]
    );

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

router.get('/academic-year', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const activeYear = await dbGet(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? AND school_id = ? ORDER BY start_date DESC LIMIT 1',
      ['active', req.user.schoolId]
    );
    const latestYear = await dbGet(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? AND school_id = ? ORDER BY end_date DESC LIMIT 1',
      ['completed', req.user.schoolId]
    );
    res.json({ activeYear, latestYear });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load academic year.' });
  }
});

router.post('/academic-year/start', async (req, res) => {
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { start_date } = req.body;
    const school_id = req.user.schoolId;

    const existingActive = await dbGet(
      'SELECT id FROM academic_years WHERE school_id = ? AND status = ?',
      [school_id, 'active']
    );
    if (existingActive) {
      return res.status(409).json({ error: 'An academic year is already active.' });
    }
    const result = await dbRun(
      'INSERT INTO academic_years (school_id, start_date, status) VALUES (?, ?, ?)',
      [school_id, start_date, 'active']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start academic year.' });
  }
});

const runStudentPromotion = async (schoolId, startDate, endDate) => {
  const summary = {
    promoted: 0,
    retained: 0,
    graduated: 0,
    updatedStudents: []
  };

  const schoolRow = await dbGet(
    'SELECT curriculum FROM schools WHERE id = ?',
    [schoolId]
  );
  const schoolCurriculum = schoolRow?.curriculum || DEFAULT_CURRICULUM;

  const students = await dbAll(
    'SELECT id, grade, status FROM students WHERE school_id = ? AND status = ?',
    [schoolId, 'Active']
  );

  for (const student of students) {
    const studentId = Number(student.id);
    if (Number.isNaN(studentId)) {
      continue;
    }
    const currentGrade = typeof student.grade === 'string' ? student.grade : null;

    let averageGrade = null;
    try {
      const performanceRow = await dbGet(
        'SELECT AVG(CAST(grade AS REAL)) as average_grade FROM performance WHERE student_id = ? AND date_recorded BETWEEN ? AND ?',
        [studentId, startDate, endDate]
      );
      if (performanceRow && performanceRow.average_grade !== null) {
        averageGrade = Number(performanceRow.average_grade);
      }
    } catch (performanceError) {
      console.error('Failed to aggregate performance for student:', studentId, performanceError);
      averageGrade = 0;
    }

    const { nextGrade, status } = getNextGrade(schoolCurriculum, currentGrade);

    if (status === 'Graduated') {
      await dbRun('UPDATE students SET status = ? WHERE id = ?', ['Graduated', studentId]);
      summary.graduated += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Graduated' });
      continue;
    }

    if (nextGrade && (averageGrade === null || averageGrade >= PROMOTION_THRESHOLD)) {
      await dbRun('UPDATE students SET grade = ?, status = ? WHERE id = ?', [nextGrade, 'Active', studentId]);
      summary.promoted += 1;
      summary.updatedStudents.push({ id: studentId, grade: nextGrade, status: 'Active' });
    } else {
      await dbRun('UPDATE students SET status = ? WHERE id = ?', ['Retained', studentId]);
      summary.retained += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Retained' });
    }
  }
  return summary;
};

router.post('/academic-year/end', async (req, res) => {
  const school_id = req.user.schoolId;
  const { year_id } = req.body;

  if (!school_id) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }

  try {
    const activeYear = await dbGet(
      'SELECT id, start_date FROM academic_years WHERE id = ? AND school_id = ? AND status = ?',
      [year_id, school_id, 'active']
    );
    if (!activeYear) {
      return res.status(404).json({ error: 'Active academic year not found.' });
    }
    const startDate = activeYear.start_date;
    const endDate = new Date().toISOString();

    const promotionResult = await runStudentPromotion(school_id, startDate, endDate);

    await dbRun(
      'UPDATE academic_years SET end_date = ?, status = ? WHERE id = ?',
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

router.post('/discipline', async (req, res) => {
  try {
    const { student_id, type, severity, description, date } = req.body;
    const teacher_id = req.user.id;

    const result = await dbRun(
      'INSERT INTO discipline (student_id, teacher_id, type, severity, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, type, severity, description, date, 'Pending']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/discipline/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await dbAll(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/performance', async (req, res) => {
  try {
    const { student_id, subject, grade, term, comments } = req.body;
    const teacher_id = req.user.id;

    const result = await dbRun(
      'INSERT INTO performance (student_id, teacher_id, subject, grade, term, comments, date_recorded) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, subject, grade, term, comments, new Date().toISOString()]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/performance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await dbAll(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/courses/:courseId/resources', async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Invalid course identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    if (req.user.role !== 'super_admin') {
      if (!req.user.schoolId || Number(req.user.schoolId) !== Number(course.school_id)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const rows = await dbAll(
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
       WHERE cr.course_id = ?
       ORDER BY cr.created_at DESC`,
      [courseId]
    );

    res.json({
      courseId: String(courseId),
      resources: rows.map(formatCourseResourceRow)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load course resources.' });
  }
});

router.post('/courses/:courseId/resources', async (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return res.status(400).json({ error: 'Invalid course identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId);
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

    const insertResult = await dbRun(
      `INSERT INTO course_resources (course_id, title, description, resource_type, url, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [courseId, title, description, resourceType, url, userId]
    );

    const inserted = await dbGet(
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
       WHERE cr.id = ?
       LIMIT 1`,
      [insertResult.lastID]
    );

    res.status(201).json({ resource: formatCourseResourceRow(inserted) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create resource.' });
  }
});

router.delete('/courses/:courseId/resources/:resourceId', async (req, res) => {
  const courseId = Number(req.params.courseId);
  const resourceId = Number(req.params.resourceId);
  if (!Number.isInteger(courseId) || courseId <= 0 || !Number.isInteger(resourceId) || resourceId <= 0) {
    return res.status(400).json({ error: 'Invalid identifier.' });
  }
  try {
    const course = await getCourseForAccess(courseId);
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

    const result = await dbRun(
      'DELETE FROM course_resources WHERE id = ? AND course_id = ?',
      [resourceId, courseId]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Resource not found.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete resource.' });
  }
});

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

    const teacherRow = await dbGet(
      'SELECT class_assigned, school_id FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
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

    const rosterRows = await getAttendanceRoster({ schoolId, classSection, date: normalizedDate });
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

    const teacherRow = await dbGet(
      'SELECT class_assigned, school_id FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
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

    let allowedQuery = 'SELECT id FROM students WHERE school_id = ?';
    const allowedParams = [schoolId];
    if (classSection) {
      allowedQuery += ' AND class_section = ?';
      allowedParams.push(classSection);
    }
    const allowedRows = await dbAll(allowedQuery, allowedParams);
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
        await dbRun('DELETE FROM attendance WHERE student_id = ? AND date = ?', [studentId, normalizedDate]);
      } else {
        await dbRun(
          'INSERT OR REPLACE INTO attendance (student_id, date, status, teacher_id) VALUES (?, ?, ?, ?)',
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

router.post('/attendance', async (req, res) => {
  try {
    const { student_id, date, status } = req.body;
    const teacher_id = req.user.id;

    const result = await dbRun(
      'INSERT OR REPLACE INTO attendance (student_id, date, status, teacher_id) VALUES (?, ?, ?, ?)',
      [student_id, date, status, teacher_id]
    );
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/attendance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const result = await dbAll(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/financial-summary', async (req, res) => {
  if (!req.user.schoolId || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!(await requireFeature(req, res, 'finance'))) {
    return;
  }
  try {
    const school_id = req.user.schoolId;
    const rows = await dbAll(
      `SELECT 
        STRFTIME('%Y-%m', T1.due_date) as month, 
        SUM(T1.amount_paid) as Collected, 
        SUM(T1.amount_due - T1.amount_paid) as Pending 
      FROM student_fees T1
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = ?
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6`,
      [school_id]
    );

    const formattedData = rows.map((row) => ({
      name: getMonthName(row.month),
      Collected: row.Collected,
      Pending: row.Pending > 0 ? row.Pending : 0
    })).reverse();

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching financial-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/performance-summary', async (req, res) => {
  if (!req.user.schoolId || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!(await requireFeature(req, res, 'advancedReports'))) {
    return;
  }
  try {
    const school_id = req.user.schoolId;
    const rows = await dbAll(
      `SELECT 
        T1.subject, 
        AVG(T1.grade) as average, 
        COUNT(DISTINCT T1.student_id) as students 
      FROM performance T1 
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = ? 
      GROUP BY T1.subject`,
      [school_id]
    );

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

router.get('/reports/school-analytics', async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const newSchoolsByMonth = await dbAll(
      `SELECT 
        STRFTIME('%Y-%m', created_at) as month, 
        COUNT(*) as newSchools 
      FROM schools 
      GROUP BY month 
      ORDER BY month ASC`
    );

    let totalSchools = 0;
    const formattedData = newSchoolsByMonth.map((row) => {
      totalSchools += row.newSchools;
      return {
        month: getMonthName(row.month),
        newSchools: row.newSchools,
        totalSchools,
        activeSchools: totalSchools
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

  console.log('Serving mock data for /api/reports/subscription-status. Schema update required for live data.');
  res.json([
    { plan: 'Basic', subscribers: 85, revenue: 4250, status: 'Active' },
    { plan: 'Pro', subscribers: 45, revenue: 9000, status: 'Active' },
    { plan: 'Trial', subscribers: 28, revenue: 0, status: 'Trial' },
    { plan: 'Basic', subscribers: 5, revenue: 250, status: 'Expired' }
  ]);
});

module.exports = { secureRouter: router };
