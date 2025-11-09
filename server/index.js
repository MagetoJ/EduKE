const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

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
const db = new sqlite3.Database(DB_PATH);

const schemaPath = path.join(__dirname, '..', 'schema.sql');
try {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
} catch (schemaError) {
  console.error('Failed to initialize database schema', schemaError);
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

const ensureAcademicYearTable = async () => {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );
};

const ensureStudentColumns = async () => {
  try {
    await dbRun('ALTER TABLE students ADD COLUMN parent_id INTEGER');
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  }

  try {
    await dbRun('ALTER TABLE students ADD COLUMN status TEXT');
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  }
};

app.post('/api/schools', async (req, res) => {
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

app.post('/api/students', async (req, res) => {
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
      school_id,
      parent_id
    } = req.body;

    await ensureStudentColumns();

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
        school_id,
        parent_id || null,
        'Active'
      ]
    );

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/academic-year', async (req, res) => {
  try {
    await ensureAcademicYearTable();
    const activeYear = await dbGet(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? ORDER BY start_date DESC LIMIT 1',
      ['active']
    );

    const latestYear = await dbGet(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? ORDER BY end_date DESC LIMIT 1',
      ['completed']
    );

    res.json({ activeYear, latestYear });
  } catch (error) {
    console.error('Failed to fetch academic year:', error);
    res.status(500).json({ error: 'Failed to load academic year.' });
  }
});

app.post('/api/academic-year/start', async (req, res) => {
  try {
    const { school_id, start_date } = req.body;
    const schoolId = Number(school_id);

    if (!schoolId || !start_date) {
      res.status(400).json({ error: 'School and start date are required.' });
      return;
    }

    await ensureAcademicYearTable();

    const existingActive = await dbGet(
      'SELECT id FROM academic_years WHERE school_id = ? AND status = ?',
      [schoolId, 'active']
    );

    if (existingActive) {
      res.status(409).json({ error: 'An academic year is already active.' });
      return;
    }

    const result = await dbRun(
      'INSERT INTO academic_years (school_id, start_date, status) VALUES (?, ?, ?)',
      [schoolId, start_date, 'active']
    );

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Failed to start academic year:', error);
    res.status(500).json({ error: 'Failed to start academic year.' });
  }
});

app.post('/api/academic-year/end', async (req, res) => {
  try {
    const { year_id, school_id } = req.body;
    const yearId = Number(year_id);
    const schoolId = Number(school_id);

    if (!yearId || !schoolId) {
      res.status(400).json({ error: 'Year and school are required.' });
      return;
    }

    await ensureAcademicYearTable();
    await ensureStudentColumns();

    const activeYear = await dbGet(
      'SELECT id, start_date FROM academic_years WHERE id = ? AND school_id = ? AND status = ?',
      [yearId, schoolId, 'active']
    );

    if (!activeYear) {
      res.status(404).json({ error: 'Active academic year not found.' });
      return;
    }

    const startDate = typeof activeYear.start_date === 'string' ? activeYear.start_date : new Date().toISOString();
    const endDate = new Date().toISOString();

    const promotionResult = await runStudentPromotion(schoolId, startDate, endDate);

    await dbRun(
      'UPDATE academic_years SET end_date = ?, status = ? WHERE id = ?',
      [endDate, 'completed', yearId]
    );

    res.json({
      success: true,
      promotionSummary: {
        promoted: promotionResult.promoted,
        retained: promotionResult.retained,
        graduated: promotionResult.graduated
      },
      updatedStudents: promotionResult.updatedStudents,
      endDate
    });
  } catch (error) {
    console.error('Failed to end academic year:', error);
    res.status(500).json({ error: 'Failed to end academic year.' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role, phone, school_id, class_assigned, subject } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required' });
      return;
    }

    if (role === 'teacher') {
      if (!password) {
        res.status(400).json({ error: 'Password is required for teacher accounts' });
        return;
      }
      if (!class_assigned) {
        res.status(400).json({ error: 'Assigned class is required for teacher accounts' });
        return;
      }
    }

    if (class_assigned !== undefined) {
      try {
        await dbRun('ALTER TABLE users ADD COLUMN class_assigned TEXT');
      } catch (alterError) {
        if (!String(alterError.message).includes('duplicate column name')) {
          console.error('Failed to ensure class_assigned column:', alterError);
          res.status(500).json({ error: 'Failed to create user.' });
          return;
        }
      }
    }

    if (subject !== undefined) {
      try {
        await dbRun('ALTER TABLE users ADD COLUMN subject TEXT');
      } catch (alterError) {
        if (!String(alterError.message).includes('duplicate column name')) {
          console.error('Failed to ensure subject column:', alterError);
          res.status(500).json({ error: 'Failed to create user.' });
          return;
        }
      }
    }

    const columns = ['name', 'email', 'password', 'role', 'phone', 'school_id'];
    const placeholders = ['?', '?', '?', '?', '?', '?'];
    const bindings = [
      name,
      email,
      password ?? null,
      role,
      phone ?? null,
      school_id ?? null
    ];

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

app.post('/api/register-school', async (req, res) => {
  try {
    const { schoolName, curriculum, adminName, email, password } = req.body;

    if (!schoolName || !curriculum || !adminName || !email || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const normalizedCurriculum = String(curriculum).toLowerCase();
    const validCurricula = ['cbc', '844', 'british', 'american', 'ib'];

    if (!validCurricula.includes(normalizedCurriculum)) {
      res.status(400).json({ error: 'Invalid curriculum selection' });
      return;
    }

    const existingUser = await dbGet(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const existingSchool = await dbGet(
      'SELECT id FROM schools WHERE name = ?',
      [schoolName]
    );

    if (existingSchool) {
      res.status(409).json({ error: 'School name is already taken' });
      return;
    }

    try {
      await dbRun('ALTER TABLE schools ADD COLUMN curriculum TEXT');
    } catch (alterError) {
      if (!String(alterError.message).includes('duplicate column name')) {
        console.error('Failed to ensure curriculum column:', alterError);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
        return;
      }
    }

    const schoolResult = await dbRun(
      'INSERT INTO schools (name, level, curriculum) VALUES (?, ?, ?)',
      [schoolName, normalizedCurriculum, normalizedCurriculum]
    );

    const schoolId = schoolResult.lastID;

    const userResult = await dbRun(
      'INSERT INTO users (name, email, password, role, school_id) VALUES (?, ?, ?, ?, ?)',
      [adminName, email, password, 'admin', schoolId]
    );

    const school = await dbGet('SELECT * FROM schools WHERE id = ?', [schoolId]);
    const user = await dbGet('SELECT id, name, email, role, school_id FROM users WHERE id = ?', [userResult.lastID]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id
      },
      school: {
        id: school.id,
        name: school.name,
        curriculum: school.curriculum ?? school.level
      }
    });
  } catch (error) {
    console.error('School registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/discipline', async (req, res) => {
  try {
    const { student_id, teacher_id, type, severity, description, date } = req.body;
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
    const studentId = req.params.studentId;
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
    const { student_id, teacher_id, subject, grade, term, comments } = req.body;
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
    const studentId = req.params.studentId;
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
    const { student_id, date, status, teacher_id } = req.body;
    const result = await dbRun(
      'INSERT OR REPLACE INTO attendance (student_id, date, status, teacher_id) VALUES (?, ?, ?, ?)',
      [student_id, date, status, teacher_id]
    );
    res.json({ success: true, id: result.lastID ?? null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const result = await dbAll(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC',
      [studentId]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/parent/access', async (req, res) => {
  try {
    const { student_id, student_password } = req.body;

    const student = await dbGet(
      'SELECT * FROM students WHERE id = ?',
      [student_id]
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const studentUser = await dbGet(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      [student.email, 'student']
    );

    if (!studentUser || studentUser.password !== student_password) {
      res.status(401).json({ error: 'Invalid student ID or password' });
      return;
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

    const financial = {
      feesPaid: 1200,
      feesDue: 300,
      totalFees: 1500,
      status: 'Partial'
    };

    res.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade,
        class: 'A'
      },
      discipline,
      performance,
      attendance,
      financial
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/financial-summary', async (req, res) => {
  try {
    const data = [
      { name: 'January', Collected: 45200, Pending: 5800 },
      { name: 'February', Collected: 48750, Pending: 6250 },
      { name: 'March', Collected: 52300, Pending: 4700 },
      { name: 'April', Collected: 49800, Pending: 7200 },
      { name: 'May', Collected: 54600, Pending: 5400 },
      { name: 'June', Collected: 51200, Pending: 6800 }
    ];
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/performance-summary', async (req, res) => {
  try {
    const data = [
      { subject: 'Mathematics', average: 85, students: 45 },
      { subject: 'English', average: 78, students: 42 },
      { subject: 'Science', average: 82, students: 48 },
      { subject: 'History', average: 75, students: 38 },
      { subject: 'Geography', average: 80, students: 41 },
      { subject: 'Art', average: 88, students: 35 }
    ];
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/school-analytics', async (req, res) => {
  try {
    const data = [
      { month: 'January', newSchools: 12, totalSchools: 145, activeSchools: 138 },
      { month: 'February', newSchools: 8, totalSchools: 153, activeSchools: 148 },
      { month: 'March', newSchools: 15, totalSchools: 168, activeSchools: 162 },
      { month: 'April', newSchools: 10, totalSchools: 178, activeSchools: 172 },
      { month: 'May', newSchools: 18, totalSchools: 196, activeSchools: 189 },
      { month: 'June', newSchools: 22, totalSchools: 218, activeSchools: 210 }
    ];
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/subscription-status', async (req, res) => {
  try {
    const data = [
      { plan: 'Basic', subscribers: 85, revenue: 4250, status: 'Active' },
      { plan: 'Pro', subscribers: 45, revenue: 9000, status: 'Active' },
      { plan: 'Enterprise', subscribers: 12, revenue: 12000, status: 'Active' },
      { plan: 'Trial', subscribers: 28, revenue: 0, status: 'Trial' },
      { plan: 'Expired', subscribers: 15, revenue: 0, status: 'Expired' }
    ];
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

  const schoolCurriculum =
    typeof schoolRow?.curriculum === 'string' ? schoolRow.curriculum : DEFAULT_CURRICULUM;

  const students = await dbAll(
    'SELECT id, grade, status FROM students WHERE school_id = ?',
    [schoolId]
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
      if (performanceRow && performanceRow.average_grade !== null && performanceRow.average_grade !== undefined) {
        averageGrade = Number(performanceRow.average_grade);
      }
    } catch (performanceError) {
      console.error('Failed to aggregate performance for student:', studentId, performanceError);
    }

    const { nextGrade, status } = getNextGrade(schoolCurriculum, currentGrade);

    if (status === 'Graduated') {
      await dbRun('UPDATE students SET status = ? WHERE id = ?', ['Graduated', studentId]);
      summary.graduated += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Graduated' });
      continue;
    }

    if (averageGrade !== null && nextGrade && averageGrade >= PROMOTION_THRESHOLD) {
      await dbRun('UPDATE students SET grade = ?, status = ? WHERE id = ?', [nextGrade, 'Promoted', studentId]);
      summary.promoted += 1;
      summary.updatedStudents.push({ id: studentId, grade: nextGrade, status: 'Promoted' });
      continue;
    }

    await dbRun('UPDATE students SET status = ? WHERE id = ?', ['Retained', studentId]);
    summary.retained += 1;
    summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Retained' });
  }

  return summary;
};

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Node.js backend running on http://localhost:${PORT}`);
});

module.exports = { app, db };
