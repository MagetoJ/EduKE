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
        (SELECT COUNT(*) FROM students WHERE school_id = s.id) as students,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role != 'student' AND role != 'parent') as staff,
        (SELECT SUM(sf.amount_paid) FROM student_fees sf JOIN students st ON sf.student_id = st.id WHERE st.school_id = s.id) as revenue
      FROM schools s
    `);

    const formattedSchools = schools.map((school) => ({
      ...school,
      id: school.id.toString(),
      revenue: `$${(school.revenue || 0).toLocaleString()}`,
      status: 'Active'
    }));

    res.json(formattedSchools);
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
      `SELECT id, name, email, phone, role, department, class_assigned, subject, created_at as joinDate 
       FROM users 
       WHERE school_id = ? AND role NOT IN ('student', 'parent', 'super_admin')`,
      [req.user.schoolId]
    );

    const formattedStaff = staff.map((s) => ({
      ...s,
      id: s.id.toString(),
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      joinDate: s.joinDate.split('T')[0],
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
      [name, email, phone, role, department, classAssigned, subject, status, id, req.user.schoolId]
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
    const [first_name, ...lastNameParts] = name.split(' ');
    const last_name = lastNameParts.join(' ');

    const result = await dbRun(
      `UPDATE students 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, grade = ?, class_section = ?, status = ?
       WHERE id = ? AND school_id = ?`,
      [first_name, last_name, email, phone, grade, classSection, status, id, req.user.schoolId]
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
