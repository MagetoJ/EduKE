const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const SALT_ROUNDS = Number.isInteger(Number(process.env.BCRYPT_SALT_ROUNDS))
  ? Number(process.env.BCRYPT_SALT_ROUNDS)
  : 12;

const PROMOTION_THRESHOLD = 60;
const DEFAULT_CURRICULUM = 'cbc';
const CURRICULUM_LEVELS = {
  cbc: [
    'PP1',
    'PP2',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  '844': [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4'
  ],
  british: [
    'Year 1',
    'Year 2',
    'Year 3',
    'Year 4',
    'Year 5',
    'Year 6',
    'Year 7',
    'Year 8',
    'Year 9',
    'Year 10',
    'Year 11',
    'Year 12',
    'Year 13'
  ],
  american: [
    'Kindergarten',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  ib: [
    'PYP 1',
    'PYP 2',
    'PYP 3',
    'PYP 4',
    'PYP 5',
    'MYP 1',
    'MYP 2',
    'MYP 3',
    'MYP 4',
    'MYP 5',
    'DP 1',
    'DP 2'
  ]
};

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// --- Database Utility Functions ---

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

// --- Authentication ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    console.log('Auth middleware: No token provided');
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Auth middleware: Token verification failed', err.message);
      return res.sendStatus(403);
    }
    // Attach user payload (id, email, role, schoolId) to the request
    req.user = user;
    next();
  });
};

// --- PUBLIC ROUTES (No Auth Required) ---

app.post('/api/register-school', async (req, res) => {
  try {
    const { schoolName, curriculum, adminName, email, password } = req.body;

    if (!schoolName || !curriculum || !adminName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const schoolResult = await dbRun(
      'INSERT INTO schools (name, curriculum, level) VALUES (?, ?, ?)',
      [schoolName, curriculum, curriculum]
    );
    const schoolId = schoolResult.lastID;

    const userResult = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, school_id) VALUES (?, ?, ?, ?, ?)',
      [adminName, email, passwordHash, 'admin', schoolId]
    );
    const userId = userResult.lastID;

    const user = await dbGet(
      'SELECT id, name, email, role, school_id FROM users WHERE id = ?',
      [userId]
    );
    const school = await dbGet('SELECT * FROM schools WHERE id = ?', [schoolId]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.school_id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: school.name,
        schoolCurriculum: school.curriculum,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    });
  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let school = null;
    if (user.role !== 'super_admin' && user.school_id) {
      school = await dbGet('SELECT name, curriculum FROM schools WHERE id = ?', [user.school_id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, schoolId: user.school_id },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id,
        schoolName: school?.name,
        schoolCurriculum: school?.curriculum,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// --- SECURE ROUTES (Auth Required) ---
// All routes from this point on will use the authenticateToken middleware

app.use(authenticateToken);

// --- School Routes ---

app.post('/api/schools', async (req, res) => {
  // This route is used by super_admin
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

app.get('/api/schools', async (req, res) => {
  // This route is for super_admin to list all schools
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // This query is a bit complex. It joins schools, students, users, and student_fees
    // to get the total students, staff, and revenue for each school.
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
    
    // Map data to match the frontend's mock data structure
    const formattedSchools = schools.map(school => ({
      ...school,
      id: school.id.toString(),
      revenue: `$${(school.revenue || 0).toLocaleString()}`,
      status: 'Active' // Schema doesn't have school status, so defaulting
    }));
    
    res.json(formattedSchools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Staff Routes ---

app.get('/api/staff', async (req, res) => {
  // For admins to list staff at their school
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
    
    // Format to match frontend mock data
    const formattedStaff = staff.map(s => ({
      ...s,
      id: s.id.toString(),
      status: 'Active', // Defaulting status
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      joinDate: s.joinDate.split('T')[0],
      classAssigned: s.class_assigned, // Map from snake_case
      subject: s.subject
    }));
    
    res.json(formattedStaff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  // For admins to update staff
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

// --- Student Routes ---

app.get('/api/students', async (req, res) => {
  // For admins/teachers to list students at their school
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
    
    // Format to match frontend mock data
    const formattedStudents = students.map(s => ({
      id: s.id.toString(),
      name: `${s.first_name} ${s.last_name}`,
      email: s.email,
      grade: s.grade,
      class: s.class_section || 'A', // Default class if not set
      status: s.status,
      phone: s.phone,
      parentGuardian: s.parentGuardian || 'N/A',
      fees: `$${s.outstandingFees.toLocaleString()}` // Showing outstanding fees
    }));
    
    res.json(formattedStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', async (req, res) => {
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
        req.user.schoolId, // Use authed user's school ID
        parent_id || null,
        'Active'
      ]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  // For admins to update student
  if (!req.user.schoolId) {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { id } = req.params;
    // Frontend sends 'name', DB has 'first_name', 'last_name'. We'll split it.
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

app.post('/api/users', async (req, res) => {
  // This endpoint is used to create staff, parents, AND student accounts
  if (!req.user.schoolId && req.body.role !== 'super_admin') {
    return res.status(400).json({ error: 'User is not associated with a school.' });
  }
  try {
    const { name, email, password, role, phone, class_assigned, subject } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Use authed user's school ID, unless a super_admin is creating another super_admin
    const school_id = req.user.role === 'super_admin' && role === 'super_admin' ? null : req.user.schoolId;

    const columns = ['name', 'email', 'password_hash', 'role', 'phone', 'school_id'];
    const placeholders = ['?', '?', '?', '?', '?', '?'];
    const bindings = [name, email, passwordHash, role, phone ?? null, school_id];

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


// --- Parent Access Route ---

app.post('/api/parent/access', async (req, res) => {
  // This is a special route that uses student credentials for parent access
  // In a real app, the parent would log in with their *own* credentials
  try {
    const { student_id, student_password } = req.body;

    const student = await dbGet(
      'SELECT * FROM students WHERE id = ?',
      [student_id]
    );
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if student's school matches parent's school
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

    // --- Fetch Live Data ---
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

// --- Academic Year Routes ---

app.get('/api/academic-year', async (req, res) => {
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

app.post('/api/academic-year/start', async (req, res) => {
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

const getCurriculumLevels = (curriculum) => {
  if (typeof curriculum !== 'string' || !CURRICULUM_LEVELS[curriculum]) {
    return CURRICULUM_LEVELS[DEFAULT_CURRICULUM];
  }
  return CURRICULUM_LEVELS[curriculum];
};

const getNextGrade = (curriculum, currentGrade) => {
  const levels = getCurriculumLevels(curriculum);
  if (!currentGrade) {
    return { nextGrade: null, status: 'Promoted' };
  }
  const index = levels.indexOf(currentGrade);
  if (index === -1) {
    return { nextGrade: null, status: 'Promoted' };
  }
  if (index === levels.length - 1) {
    return { nextGrade: null, status: 'Graduated' };
  }
  return { nextGrade: levels[index + 1], status: 'Promoted' };
};

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
      await dbRun('UPDATE students SET grade = ?, status = ? WHERE id = ?', [nextGrade, 'Active', studentId]); // Keep status Active
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

app.post('/api/academic-year/end', async (req, res) => {
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
      promotionSummary: promotionResult, // This matches frontend
      updatedStudents: promotionResult.updatedStudents, // This matches frontend
      endDate
    });
  } catch (error) {
    console.error('Error ending academic year:', error);
    res.status(500).json({ error: 'Failed to end academic year.' });
  }
});


// --- Student Tracking Routes (Discipline, Performance, Attendance) ---

app.post('/api/discipline', async (req, res) => {
  try {
    const { student_id, type, severity, description, date } = req.body;
    const teacher_id = req.user.id; // Get teacher ID from authenticated user
    
    const result = await dbRun(
      'INSERT INTO discipline (student_id, teacher_id, type, severity, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, type, severity, description, date, 'Pending']
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/discipline/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    // TODO: Add check to ensure user (teacher/admin/parent) has access to this student
    const result = await dbAll(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/performance', async (req, res) => {
  try {
    const { student_id, subject, grade, term, comments } = req.body;
    const teacher_id = req.user.id; // Get teacher ID from authenticated user
    
    const result = await dbRun(
      'INSERT INTO performance (student_id, teacher_id, subject, grade, term, comments, date_recorded) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, subject, grade, term, comments, new Date().toISOString()]
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/performance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    // TODO: Add check to ensure user (teacher/admin/parent) has access to this student
    const result = await dbAll(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
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

app.get('/api/attendance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    // TODO: Add check to ensure user (teacher/admin/parent) has access to this student
    const result = await dbAll(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Reporting Routes (Live Data) ---

// Helper to convert 'YYYY-MM' to 'MonthName'
const getMonthName = (monthStr) => {
  const [_, month] = monthStr.split('-');
  const date = new Date();
  date.setMonth(parseInt(month, 10) - 1);
  return date.toLocaleString('default', { month: 'long' });
};

app.get('/api/reports/financial-summary', async (req, res) => {
  // Admin-only route
  if (!req.user.schoolId || req.user.role !== 'admin') {
     return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const school_id = req.user.schoolId;
    const rows = await dbAll(`
      SELECT 
        STRFTIME('%Y-%m', T1.due_date) as month, 
        SUM(T1.amount_paid) as Collected, 
        SUM(T1.amount_due - T1.amount_paid) as Pending 
      FROM student_fees T1
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = ?
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `, [school_id]);
    
    const formattedData = rows.map(row => ({
      name: getMonthName(row.month), // Format 'YYYY-MM' to 'Month'
      Collected: row.Collected,
      Pending: row.Pending > 0 ? row.Pending : 0
    })).reverse(); // Reverse to show chronologically
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching financial-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/performance-summary', async (req, res) => {
  // Admin-only route
  if (!req.user.schoolId || req.user.role !== 'admin') {
     return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const school_id = req.user.schoolId;
    const rows = await dbAll(`
      SELECT 
        T1.subject, 
        AVG(T1.grade) as average, 
        COUNT(DISTINCT T1.student_id) as students 
      FROM performance T1 
      JOIN students T2 ON T1.student_id = T2.id 
      WHERE T2.school_id = ? 
      GROUP BY T1.subject
    `, [school_id]);

    const formattedData = rows.map(row => ({
      ...row,
      average: parseFloat(row.average.toFixed(2)) // Clean up average
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching performance-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/school-analytics', async (req, res) => {
  // Super-admin only route
  if (req.user.role !== 'super_admin') {
     return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    // Get new schools per month
    const newSchoolsByMonth = await dbAll(`
      SELECT 
        STRFTIME('%Y-%m', created_at) as month, 
        COUNT(*) as newSchools 
      FROM schools 
      GROUP BY month 
      ORDER BY month ASC
    `);
    
    let totalSchools = 0;
    const formattedData = newSchoolsByMonth.map(row => {
      totalSchools += row.newSchools;
      return {
        month: getMonthName(row.month), // Format 'YYYY-MM' to 'Month'
        newSchools: row.newSchools,
        totalSchools: totalSchools,
        activeSchools: totalSchools // Schema doesn't have 'active' status, so mirroring total
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching school-analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/subscription-status', (req, res) => {
  // Super-admin only route
  if (req.user.role !== 'super_admin') {
     return res.status(403).json({ error: 'Forbidden' });
  }
  
  // *** NOTE: This endpoint remains as mock data. ***
  // Your 'schema.sql' does not include tables for SaaS subscriptions
  // (e.g., 'plans', 'school_subscriptions', 'payments').
  // The existing fee tables are for students paying schools, not schools paying you.
  // To implement this, you would need to add those tables to your schema.
  
  console.log('Serving mock data for /api/reports/subscription-status. Schema update required for live data.');
  res.json([
    { plan: 'Basic', subscribers: 85, revenue: 4250, status: 'Active' },
    { plan: 'Pro', subscribers: 45, revenue: 9000, status: 'Active' },
    { plan: 'Trial', subscribers: 28, revenue: 0, status: 'Trial' },
    { plan: 'Basic', subscribers: 5, revenue: 250, status: 'Expired' }
  ]);
});


// --- Server Start ---

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend running on http://localhost:${PORT}`);
});

module.exports = { app, db };