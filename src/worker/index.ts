import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

const PROMOTION_THRESHOLD = 60;

const ensureAcademicYearTable = async (db: any) => {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS academic_years (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();
};

const ensureStudentColumns = async (db: any) => {
  try {
    await db.prepare('ALTER TABLE students ADD COLUMN parent_id INTEGER').run();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
      throw error;
    }
  }

  try {
    await db.prepare('ALTER TABLE students ADD COLUMN status TEXT').run();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('duplicate column name')) {
      throw error;
    }
  }
};

const parseGradeNumber = (grade?: string | null) => {
  if (!grade) {
    return null;
  }
  const match = grade.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? null : value;
};

// API Routes
app.post('/api/schools', async (c) => {
  try {
    const { name, address, phone, email, principal, logo } = await c.req.json();

    // Insert into database
    const result = await c.env.DB.prepare(
      'INSERT INTO schools (name, address, phone, email, principal, logo) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(name, address, phone, email, principal, logo).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/students', async (c) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id } = await c.req.json();

    await ensureStudentColumns(c.env.DB);

    const result = await c.env.DB.prepare(
      'INSERT INTO students (first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(first_name, last_name, email, phone, date_of_birth, address, grade, enrollment_date, school_id, parent_id || null, 'Active').run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/academic-year', async (c) => {
  try {
    await ensureAcademicYearTable(c.env.DB);
    const activeYear = await c.env.DB.prepare(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? ORDER BY start_date DESC LIMIT 1'
    ).bind('active').first();

    const latestYear = await c.env.DB.prepare(
      'SELECT id, school_id, start_date, end_date, status FROM academic_years WHERE status = ? ORDER BY end_date DESC LIMIT 1'
    ).bind('completed').first();

    return c.json({ activeYear, latestYear });
  } catch (error) {
    console.error('Failed to fetch academic year:', error);
    return c.json({ error: 'Failed to load academic year.' }, 500);
  }
});

app.post('/api/academic-year/start', async (c) => {
  try {
    const { school_id, start_date } = await c.req.json();

    const schoolId = Number(school_id);

    if (!schoolId || !start_date) {
      return c.json({ error: 'School and start date are required.' }, 400);
    }

    await ensureAcademicYearTable(c.env.DB);

    const existingActive = await c.env.DB.prepare(
      'SELECT id FROM academic_years WHERE school_id = ? AND status = ?'
    ).bind(schoolId, 'active').first();

    if (existingActive) {
      return c.json({ error: 'An academic year is already active.' }, 409);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO academic_years (school_id, start_date, status) VALUES (?, ?, ?)'
    ).bind(schoolId, start_date, 'active').run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('Failed to start academic year:', error);
    return c.json({ error: 'Failed to start academic year.' }, 500);
  }
});

app.post('/api/academic-year/end', async (c) => {
  try {
    const { year_id, school_id } = await c.req.json();

    const yearId = Number(year_id);
    const schoolId = Number(school_id);

    if (!yearId || !schoolId) {
      return c.json({ error: 'Year and school are required.' }, 400);
    }

    await ensureAcademicYearTable(c.env.DB);
    await ensureStudentColumns(c.env.DB);

    const activeYear = await c.env.DB.prepare(
      'SELECT id, start_date FROM academic_years WHERE id = ? AND school_id = ? AND status = ?'
    ).bind(yearId, schoolId, 'active').first();

    if (!activeYear) {
      return c.json({ error: 'Active academic year not found.' }, 404);
    }

    const startDate = typeof activeYear.start_date === 'string' ? activeYear.start_date : new Date().toISOString();
    const endDate = new Date().toISOString();

    const promotionResult = await runStudentPromotion(c.env.DB, schoolId, startDate, endDate);

    await c.env.DB.prepare(
      'UPDATE academic_years SET end_date = ?, status = ? WHERE id = ?'
    ).bind(endDate, 'completed', yearId).run();

    return c.json({
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
    return c.json({ error: 'Failed to end academic year.' }, 500);
  }
});

app.post('/api/users', async (c) => {
  try {
    const { name, email, password, role, phone, school_id, class_assigned, subject } = await c.req.json();

    if (!name || !email || !role) {
      return c.json({ error: 'Name, email, and role are required' }, 400);
    }

    if (role === 'teacher') {
      if (!password) {
        return c.json({ error: 'Password is required for teacher accounts' }, 400);
      }

      if (!class_assigned) {
        return c.json({ error: 'Assigned class is required for teacher accounts' }, 400);
      }
    }

    if (class_assigned !== undefined) {
      try {
        await c.env.DB.prepare('ALTER TABLE users ADD COLUMN class_assigned TEXT').run();
      } catch (alterError) {
        if (!(alterError instanceof Error) || !alterError.message.includes('duplicate column name')) {
          console.error('Failed to ensure class_assigned column:', alterError);
          return c.json({ error: 'Failed to create user.' }, 500);
        }
      }
    }

    if (subject !== undefined) {
      try {
        await c.env.DB.prepare('ALTER TABLE users ADD COLUMN subject TEXT').run();
      } catch (alterError) {
        if (!(alterError instanceof Error) || !alterError.message.includes('duplicate column name')) {
          console.error('Failed to ensure subject column:', alterError);
          return c.json({ error: 'Failed to create user.' }, 500);
        }
      }
    }

    const columns = ['name', 'email', 'password', 'role', 'phone', 'school_id'];
    const placeholders = ['?', '?', '?', '?', '?', '?'];
    const bindings: (string | number | null)[] = [
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

    const result = await c.env.DB.prepare(query).bind(...bindings).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error('User creation error:', error);
    return c.json({ error: 'Failed to create user.' }, 500);
  }
});

// School registration endpoint
app.post('/api/register-school', async (c) => {
  try {
    const { schoolName, curriculum, adminName, email, password } = await c.req.json();

    if (!schoolName || !curriculum || !adminName || !email || !password) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    const normalizedCurriculum = String(curriculum).toLowerCase();
    const validCurricula = ['cbc', '844', 'british', 'american', 'ib'];

    if (!validCurricula.includes(normalizedCurriculum)) {
      return c.json({ error: 'Invalid curriculum selection' }, 400);
    }

    // Check if email already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: 'Email already in use' }, 409);
    }

    // Check if school name already exists
    const existingSchool = await c.env.DB.prepare(
      'SELECT id FROM schools WHERE name = ?'
    ).bind(schoolName).first();

    if (existingSchool) {
      return c.json({ error: 'School name is already taken' }, 409);
    }

    try {
      await c.env.DB.prepare(
        'ALTER TABLE schools ADD COLUMN curriculum TEXT'
      ).run();
    } catch (alterError) {
      if (!(alterError instanceof Error) || !alterError.message.includes('duplicate column name')) {
        console.error('Failed to ensure curriculum column:', alterError);
        return c.json({ error: 'Registration failed. Please try again.' }, 500);
      }
    }

    // For now, we'll create them separately since we don't have transactions in D1
    // In a production system, you'd want proper transactions

    // Create the school
    const schoolResult = await c.env.DB.prepare(
      'INSERT INTO schools (name, level, curriculum) VALUES (?, ?, ?)'
    ).bind(schoolName, normalizedCurriculum, normalizedCurriculum).run();

    const schoolId = schoolResult.meta.last_row_id;

    // Create the admin user
    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (name, email, password, role, school_id) VALUES (?, ?, ?, ?, ?)'
    ).bind(adminName, email, password, 'admin', schoolId).run();

    const userId = userResult.meta.last_row_id;

    // Get the created school data
    const school = await c.env.DB.prepare(
      'SELECT * FROM schools WHERE id = ?'
    ).bind(schoolId).first();

    // Get the created user data
    const user = await c.env.DB.prepare(
      'SELECT id, name, email, role, school_id FROM users WHERE id = ?'
    ).bind(userId).first();

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.school_id,
      },
      school: {
        id: school.id,
        name: school.name,
        curriculum: school.curriculum ?? school.level,
      }
    });

  } catch (error) {
    console.error('School registration error:', error);
    return c.json({ error: 'Registration failed. Please try again.' }, 500);
  }
});

// Discipline endpoints
app.post('/api/discipline', async (c) => {
  try {
    const { student_id, teacher_id, type, severity, description, date } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT INTO discipline (student_id, teacher_id, type, severity, description, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(student_id, teacher_id, type, severity, description, date, 'Pending').run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/discipline/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Performance endpoints
app.post('/api/performance', async (c) => {
  try {
    const { student_id, teacher_id, subject, grade, term, comments } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT INTO performance (student_id, teacher_id, subject, grade, term, comments, date_recorded) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(student_id, teacher_id, subject, grade, term, comments, new Date().toISOString()).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/performance/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Attendance endpoints
app.post('/api/attendance', async (c) => {
  try {
    const { student_id, date, status, teacher_id } = await c.req.json();

    const result = await c.env.DB.prepare(
      'INSERT OR REPLACE INTO attendance (student_id, date, status, teacher_id) VALUES (?, ?, ?, ?)'
    ).bind(student_id, date, status, teacher_id).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/attendance/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await c.env.DB.prepare(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC'
    ).bind(studentId).all();

    return c.json(result.results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Parent access endpoint - verify student credentials and return data
app.post('/api/parent/access', async (c) => {
  try {
    const { student_id, student_password } = await c.req.json();

    // First get the student record
    const student = await c.env.DB.prepare(
      'SELECT * FROM students WHERE id = ?'
    ).bind(student_id).first();

    if (!student) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Find the student user account by email (since email should be unique)
    const studentUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND role = ?'
    ).bind(student.email, 'student').first();

    if (!studentUser || studentUser.password !== student_password) {
      return c.json({ error: 'Invalid student ID or password' }, 401);
    }

    // Get student data, discipline, performance, attendance, financial
    const discipline = await c.env.DB.prepare(
      'SELECT * FROM discipline WHERE student_id = ? ORDER BY date DESC'
    ).bind(student_id).all();

    const performance = await c.env.DB.prepare(
      'SELECT * FROM performance WHERE student_id = ? ORDER BY date_recorded DESC'
    ).bind(student_id).all();

    const attendance = await c.env.DB.prepare(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 50'
    ).bind(student_id).all();

    // Mock financial data for now
    const financial = {
      feesPaid: 1200,
      feesDue: 300,
      totalFees: 1500,
      status: 'Partial'
    };

    return c.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        grade: student.grade,
        class: 'A' // Would come from database
      },
      discipline: discipline.results,
      performance: performance.results,
      attendance: attendance.results,
      financial
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/financial-summary', async (c) => {
  try {
    // Mock data for now - in real app, calculate from fees table
    const data = [
      {
        name: "January",
        Collected: 45200,
        Pending: 5800,
      },
      {
        name: "February",
        Collected: 48750,
        Pending: 6250,
      },
      {
        name: "March",
        Collected: 52300,
        Pending: 4700,
      },
      {
        name: "April",
        Collected: 49800,
        Pending: 7200,
      },
      {
        name: "May",
        Collected: 54600,
        Pending: 5400,
      },
      {
        name: "June",
        Collected: 51200,
        Pending: 6800,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/performance-summary', async (c) => {
  try {
    // Mock data for now - in real app, calculate from performance table
    const data = [
      {
        subject: "Mathematics",
        average: 85,
        students: 45,
      },
      {
        subject: "English",
        average: 78,
        students: 42,
      },
      {
        subject: "Science",
        average: 82,
        students: 48,
      },
      {
        subject: "History",
        average: 75,
        students: 38,
      },
      {
        subject: "Geography",
        average: 80,
        students: 41,
      },
      {
        subject: "Art",
        average: 88,
        students: 35,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/school-analytics', async (c) => {
  try {
    // Mock data for super admin - analytics of schools using the system
    const data = [
      {
        month: "January",
        newSchools: 12,
        totalSchools: 145,
        activeSchools: 138,
      },
      {
        month: "February",
        newSchools: 8,
        totalSchools: 153,
        activeSchools: 148,
      },
      {
        month: "March",
        newSchools: 15,
        totalSchools: 168,
        activeSchools: 162,
      },
      {
        month: "April",
        newSchools: 10,
        totalSchools: 178,
        activeSchools: 172,
      },
      {
        month: "May",
        newSchools: 18,
        totalSchools: 196,
        activeSchools: 189,
      },
      {
        month: "June",
        newSchools: 22,
        totalSchools: 218,
        activeSchools: 210,
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/api/reports/subscription-status', async (c) => {
  try {
    // Mock data for super admin - subscription/payment status
    const data = [
      {
        plan: "Basic",
        subscribers: 85,
        revenue: 4250,
        status: "Active",
      },
      {
        plan: "Pro",
        subscribers: 45,
        revenue: 9000,
        status: "Active",
      },
      {
        plan: "Enterprise",
        subscribers: 12,
        revenue: 12000,
        status: "Active",
      },
      {
        plan: "Trial",
        subscribers: 28,
        revenue: 0,
        status: "Trial",
      },
      {
        plan: "Expired",
        subscribers: 15,
        revenue: 0,
        status: "Expired",
      },
    ];
    return c.json(data);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

const runStudentPromotion = async (db: any, schoolId: number, startDate: string, endDate: string) => {
  const summary = {
    promoted: 0,
    retained: 0,
    graduated: 0,
    updatedStudents: [] as Array<{ id: number; grade?: string; status?: string }>
  };

  const studentsQuery = await db
    .prepare('SELECT id, grade, status FROM students WHERE school_id = ?')
    .bind(schoolId)
    .all();

  const students = Array.isArray(studentsQuery.results) ? studentsQuery.results : [];

  for (const student of students) {
    const studentId = Number(student.id);
    if (Number.isNaN(studentId)) {
      continue;
    }

    const currentGrade = typeof student.grade === 'string' ? student.grade : null;
    const gradeNumber = parseGradeNumber(currentGrade);

    let averageGrade: number | null = null;
    try {
      const performanceRow = await db
        .prepare('SELECT AVG(CAST(grade AS REAL)) as average_grade FROM performance WHERE student_id = ? AND date_recorded BETWEEN ? AND ?')
        .bind(studentId, startDate, endDate)
        .first();

      if (performanceRow && performanceRow.average_grade !== null) {
        averageGrade = Number(performanceRow.average_grade);
      }
    } catch (performanceError) {
      console.error('Failed to aggregate performance for student:', studentId, performanceError);
    }

    if (gradeNumber !== null && gradeNumber >= 12) {
      await db.prepare('UPDATE students SET status = ? WHERE id = ?').bind('Graduated', studentId).run();
      summary.graduated += 1;
      summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Graduated' });
      continue;
    }

    if (averageGrade !== null && gradeNumber !== null && averageGrade >= PROMOTION_THRESHOLD) {
      const nextGradeLabel = `Grade ${gradeNumber + 1}`;
      await db.prepare('UPDATE students SET grade = ?, status = ? WHERE id = ?').bind(nextGradeLabel, 'Promoted', studentId).run();
      summary.promoted += 1;
      summary.updatedStudents.push({ id: studentId, grade: nextGradeLabel, status: 'Promoted' });
      continue;
    }

    await db.prepare('UPDATE students SET status = ? WHERE id = ?').bind('Retained', studentId).run();
    summary.retained += 1;
    summary.updatedStudents.push({ id: studentId, grade: currentGrade ?? undefined, status: 'Retained' });
  }

  return summary;
};

export default app;
